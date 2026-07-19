package repository

import (
	"selaras/backend/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductRepository interface {
	List() ([]database.Product, error)
	ListAll() ([]database.Product, error)
	GetByID(id uuid.UUID) (*database.Product, error)
	GetBySKU(sku string) (*database.Product, error)
	Create(product *database.Product) error
	Update(product *database.Product) error
	Delete(id uuid.UUID) error
	Restore(id uuid.UUID) error
}

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) List() ([]database.Product, error) {
	var products []database.Product
	err := r.db.Where("is_active = ?", true).Preload("Category").Order("name ASC").Find(&products).Error
	return products, err
}

func (r *productRepository) ListAll() ([]database.Product, error) {
	var products []database.Product
	err := r.db.Preload("Category").Order("name ASC").Find(&products).Error
	return products, err
}

func (r *productRepository) GetByID(id uuid.UUID) (*database.Product, error) {
	var product database.Product
	err := r.db.Preload("Category").First(&product, id).Error
	return &product, err
}

func (r *productRepository) GetBySKU(sku string) (*database.Product, error) {
	var product database.Product
	err := r.db.Where("sku = ?", sku).First(&product).Error
	return &product, err
}

func (r *productRepository) Create(product *database.Product) error {
	return r.db.Create(product).Error
}

func (r *productRepository) Update(product *database.Product) error {
	return r.db.Save(product).Error
}

func (r *productRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&database.Product{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *productRepository) Restore(id uuid.UUID) error {
	return r.db.Model(&database.Product{}).Where("id = ?", id).Update("is_active", true).Error
}
