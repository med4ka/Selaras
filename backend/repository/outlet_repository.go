package repository

import (
	"selaras/backend/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OutletRepository interface {
	List() ([]database.Outlet, error)
	ListAll() ([]database.Outlet, error)
	GetByID(id uuid.UUID) (*database.Outlet, error)
	Create(outlet *database.Outlet) error
	Update(outlet *database.Outlet) error
	Delete(id uuid.UUID) error
	Restore(id uuid.UUID) error
}

type outletRepository struct {
	db *gorm.DB
}

func NewOutletRepository(db *gorm.DB) OutletRepository {
	return &outletRepository{db: db}
}

func (r *outletRepository) List() ([]database.Outlet, error) {
	var outlets []database.Outlet
	err := r.db.Where("is_active = ?", true).Order("name ASC").Find(&outlets).Error
	return outlets, err
}

func (r *outletRepository) ListAll() ([]database.Outlet, error) {
	var outlets []database.Outlet
	err := r.db.Order("name ASC").Find(&outlets).Error
	return outlets, err
}

func (r *outletRepository) GetByID(id uuid.UUID) (*database.Outlet, error) {
	var outlet database.Outlet
	err := r.db.First(&outlet, id).Error
	return &outlet, err
}

func (r *outletRepository) Create(outlet *database.Outlet) error {
	return r.db.Create(outlet).Error
}

func (r *outletRepository) Update(outlet *database.Outlet) error {
	return r.db.Save(outlet).Error
}

func (r *outletRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&database.Outlet{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *outletRepository) Restore(id uuid.UUID) error {
	return r.db.Model(&database.Outlet{}).Where("id = ?", id).Update("is_active", true).Error
}
