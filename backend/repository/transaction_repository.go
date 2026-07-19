package repository

import (
	"selaras/backend/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TransactionRepository interface {
	Create(tx *gorm.DB, transaction *database.Transaction) (bool, error)
	ListRecent(limit int, outletID *uuid.UUID) ([]database.Transaction, error)
}

type transactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) TransactionRepository {
	return &transactionRepository{db: db}
}

func (r *transactionRepository) Create(tx *gorm.DB, transaction *database.Transaction) (bool, error) {
	result := tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "idempotency_key"}},
		DoNothing: true,
	}).Create(transaction)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected == 0, nil
}

func (r *transactionRepository) ListRecent(limit int, outletID *uuid.UUID) ([]database.Transaction, error) {
	var transactions []database.Transaction
	tx := r.db.
		Preload("Outlet").
		Preload("Cashier").
		Order("client_created_at DESC").
		Limit(limit)
	if outletID != nil {
		tx = tx.Where("outlet_id = ?", *outletID)
	}
	if err := tx.Find(&transactions).Error; err != nil {
		return nil, err
	}
	return transactions, nil
}
