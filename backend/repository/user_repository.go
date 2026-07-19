package repository

import (
	"selaras/backend/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepository interface {
	GetByUsername(username string) (*database.User, error)
	GetByID(id uuid.UUID) (*database.User, error)
	Create(user *database.User) error
	List(outletID *uuid.UUID) ([]database.User, error)
	Update(user *database.User) error
	Deactivate(id uuid.UUID) error
	Restore(id uuid.UUID) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByUsername(username string) (*database.User, error) {
	var user database.User
	err := r.db.Preload("Outlet").Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByID(id uuid.UUID) (*database.User, error) {
	var user database.User
	err := r.db.Preload("Outlet").Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Create(user *database.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) List(outletID *uuid.UUID) ([]database.User, error) {
	var users []database.User
	tx := r.db.Preload("Outlet").Order("username ASC")
	if outletID != nil {
		tx = tx.Where("outlet_id = ?", *outletID)
	}
	err := tx.Find(&users).Error
	return users, err
}

func (r *userRepository) Update(user *database.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) Deactivate(id uuid.UUID) error {
	return r.db.Model(&database.User{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *userRepository) Restore(id uuid.UUID) error {
	return r.db.Model(&database.User{}).Where("id = ?", id).Update("is_active", true).Error
}
