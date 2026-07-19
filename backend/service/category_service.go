package service

import (
	"selaras/backend/database"
	"selaras/backend/repository"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type CategoryRequest struct {
	Name string `json:"name" validate:"required,min=1,max=200"`
}

type CategoryResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type CategoryService interface {
	List() ([]CategoryResponse, error)
	GetByID(id string) (*CategoryResponse, error)
	Create(req *CategoryRequest) (*CategoryResponse, error)
	Update(id string, req *CategoryRequest) (*CategoryResponse, error)
	Delete(id string) error
}

type categoryService struct {
	repo     repository.CategoryRepository
	validate *validator.Validate
}

func NewCategoryService(repo repository.CategoryRepository) CategoryService {
	return &categoryService{
		repo:     repo,
		validate: validator.New(),
	}
}

func toCategoryResponse(cat *database.Category) *CategoryResponse {
	return &CategoryResponse{
		ID:   cat.ID.String(),
		Name: cat.Name,
	}
}

func (s *categoryService) List() ([]CategoryResponse, error) {
	categories, err := s.repo.List()
	if err != nil {
		return nil, err
	}
	res := make([]CategoryResponse, len(categories))
	for i, c := range categories {
		res[i] = CategoryResponse{ID: c.ID.String(), Name: c.Name}
	}
	return res, nil
}

func (s *categoryService) GetByID(id string) (*CategoryResponse, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	cat, err := s.repo.GetByID(uid)
	if err != nil {
		return nil, err
	}
	return toCategoryResponse(cat), nil
}

func (s *categoryService) Create(req *CategoryRequest) (*CategoryResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}
	cat := database.Category{
		ID:   uuid.New(),
		Name: req.Name,
	}
	if err := s.repo.Create(&cat); err != nil {
		return nil, err
	}
	return toCategoryResponse(&cat), nil
}

func (s *categoryService) Update(id string, req *CategoryRequest) (*CategoryResponse, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}
	cat, err := s.repo.GetByID(uid)
	if err != nil {
		return nil, err
	}
	cat.Name = req.Name
	if err := s.repo.Update(cat); err != nil {
		return nil, err
	}
	return toCategoryResponse(cat), nil
}

func (s *categoryService) Delete(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(uid)
}
