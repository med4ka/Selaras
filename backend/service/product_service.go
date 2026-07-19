package service

import (
	"errors"
	"log"
	"selaras/backend/database"
	"selaras/backend/repository"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductRequest struct {
	SKU               string  `json:"sku" validate:"required,min=1,max=50"`
	CategoryID        string  `json:"category_id" validate:"required,uuid"`
	Name              string  `json:"name" validate:"required,min=1,max=300"`
	Price             float64 `json:"price" validate:"required,gt=0"`
	LowStockThreshold int     `json:"low_stock_threshold"`
}

type ProductResponse struct {
	ID                string             `json:"id"`
	SKU               string             `json:"sku"`
	CategoryID        string             `json:"category_id"`
	Name              string             `json:"name"`
	Price             float64            `json:"price"`
	LowStockThreshold int                `json:"low_stock_threshold"`
	IsActive          bool               `json:"is_active"`
	Category          *CategoryResponse  `json:"category,omitempty"`
}

type ProductService interface {
	List() ([]ProductResponse, error)
	ListAll() ([]ProductResponse, error)
	GetByID(id string) (*ProductResponse, error)
	Create(req *ProductRequest) (*ProductResponse, error)
	Update(id string, req *ProductRequest) (*ProductResponse, error)
	Delete(id string) error
	Restore(id string) error
}

type productService struct {
	repo         repository.ProductRepository
	catRepo      repository.CategoryRepository
	validate     *validator.Validate
}

func NewProductService(repo repository.ProductRepository, catRepo repository.CategoryRepository) ProductService {
	return &productService{
		repo:     repo,
		catRepo:  catRepo,
		validate: validator.New(),
	}
}

func toProductResponse(p *database.Product) *ProductResponse {
	res := &ProductResponse{
		ID:                p.ID.String(),
		SKU:               p.SKU,
		CategoryID:        p.CategoryID.String(),
		Name:              p.Name,
		Price:             p.Price,
		LowStockThreshold: p.LowStockThreshold,
		IsActive:          p.IsActive,
	}
	if p.Category != nil {
		res.Category = &CategoryResponse{
			ID:   p.Category.ID.String(),
			Name: p.Category.Name,
		}
	}
	return res
}

func (s *productService) List() ([]ProductResponse, error) {
	products, err := s.repo.List()
	if err != nil {
		return nil, err
	}
	res := make([]ProductResponse, len(products))
	for i, p := range products {
		res[i] = *toProductResponse(&p)
	}
	return res, nil
}

func (s *productService) ListAll() ([]ProductResponse, error) {
	products, err := s.repo.ListAll()
	if err != nil {
		return nil, err
	}
	res := make([]ProductResponse, len(products))
	for i, p := range products {
		res[i] = *toProductResponse(&p)
	}
	return res, nil
}

func (s *productService) GetByID(id string) (*ProductResponse, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	p, err := s.repo.GetByID(uid)
	if err != nil {
		return nil, err
	}
	return toProductResponse(p), nil
}

func (s *productService) Create(req *ProductRequest) (*ProductResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	catID, _ := uuid.Parse(req.CategoryID)
	if _, err := s.catRepo.GetByID(catID); err != nil {
		return nil, errors.New("category not found")
	}

	existing, err := s.repo.GetBySKU(req.SKU)
	log.Printf("SKU CHECK: sku=%q existing=%+v err=%v", req.SKU, existing, err)
	if err == nil {
		if existing.IsActive {
			return nil, errors.New("SKU sudah digunakan oleh produk lain")
		}
		return nil, errors.New("SKU ini pernah dipakai produk yang sudah dinonaktifkan — gunakan SKU lain, atau aktifkan kembali produk lama")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("gagal memeriksa SKU")
	}

	threshold := req.LowStockThreshold
	if threshold <= 0 {
		threshold = 10
	}

	product := database.Product{
		ID:                uuid.New(),
		SKU:               req.SKU,
		CategoryID:        catID,
		Name:              req.Name,
		Price:             req.Price,
		LowStockThreshold: threshold,
	}
	if err := s.repo.Create(&product); err != nil {
		return nil, err
	}

	// Reload with category relation
	created, _ := s.repo.GetByID(product.ID)
	return toProductResponse(created), nil
}

func (s *productService) Update(id string, req *ProductRequest) (*ProductResponse, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	product, err := s.repo.GetByID(uid)
	if err != nil {
		return nil, err
	}

	catID, _ := uuid.Parse(req.CategoryID)
	if _, err := s.catRepo.GetByID(catID); err != nil {
		return nil, errors.New("category not found")
	}

	if req.SKU != product.SKU {
		if existing, _ := s.repo.GetBySKU(req.SKU); existing != nil {
			if existing.IsActive {
				return nil, errors.New("SKU sudah digunakan oleh produk lain")
			}
			return nil, errors.New("SKU ini pernah dipakai produk yang sudah dinonaktifkan — gunakan SKU lain, atau aktifkan kembali produk lama")
		}
	}

	threshold := req.LowStockThreshold
	if threshold <= 0 {
		threshold = 10
	}

	product.SKU = req.SKU
	product.CategoryID = catID
	product.Name = req.Name
	product.Price = req.Price
	product.LowStockThreshold = threshold

	if err := s.repo.Update(product); err != nil {
		return nil, err
	}

	updated, _ := s.repo.GetByID(uid)
	return toProductResponse(updated), nil
}

func (s *productService) Delete(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(uid)
}

func (s *productService) Restore(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.Restore(uid)
}
