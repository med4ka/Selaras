package repository

import (
	"selaras/backend/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	List() ([]database.Category, error)
	GetByID(id uuid.UUID) (*database.Category, error)
	Create(cat *database.Category) error
	Update(cat *database.Category) error
	Delete(id uuid.UUID) error
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) List() ([]database.Category, error) {
	var categories []database.Category
	err := r.db.Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) GetByID(id uuid.UUID) (*database.Category, error) {
	var cat database.Category
	err := r.db.First(&cat, id).Error
	return &cat, err
}

func (r *categoryRepository) Create(cat *database.Category) error {
	return r.db.Create(cat).Error
}

func (r *categoryRepository) Update(cat *database.Category) error {
	return r.db.Save(cat).Error
}

func (r *categoryRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&database.Category{}, id).Error
}
