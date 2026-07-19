package repository

import (
	"selaras/backend/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type StockLedgerRepository interface {
	Create(entry *database.StockLedger) error
	CreateWithConflictCheck(dbTx *gorm.DB, entry *database.StockLedger) (bool, error)
	ExistsByIdempotencyKey(key string) (bool, error)
}

type StockRepository interface {
	GetByProductAndOutlet(productID, outletID uuid.UUID) (*database.Stock, error)
	UpsertQuantity(stock *database.Stock) error
}

type stockLedgerRepository struct {
	db *gorm.DB
}

type stockRepository struct {
	db *gorm.DB
}

func NewStockLedgerRepository(db *gorm.DB) StockLedgerRepository {
	return &stockLedgerRepository{db: db}
}

func NewStockRepository(db *gorm.DB) StockRepository {
	return &stockRepository{db: db}
}

func (r *stockLedgerRepository) CreateWithConflictCheck(dbTx *gorm.DB, entry *database.StockLedger) (bool, error) {
	result := dbTx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "idempotency_key"}},
		DoNothing: true,
	}).Create(entry)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected == 0, nil
}

func (r *stockLedgerRepository) Create(entry *database.StockLedger) error {
	return r.db.Create(entry).Error
}

func (r *stockLedgerRepository) ExistsByIdempotencyKey(key string) (bool, error) {
	var count int64
	err := r.db.Model(&database.StockLedger{}).Where("idempotency_key = ?", key).Count(&count).Error
	return count > 0, err
}

func (r *stockRepository) GetByProductAndOutlet(productID, outletID uuid.UUID) (*database.Stock, error) {
	var stock database.Stock
	err := r.db.Where("product_id = ? AND outlet_id = ?", productID, outletID).First(&stock).Error
	return &stock, err
}

func (r *stockRepository) UpsertQuantity(stock *database.Stock) error {
	return r.db.Model(&database.Stock{}).
		Where("product_id = ? AND outlet_id = ?", stock.ProductID, stock.OutletID).
		Update("quantity", stock.Quantity).Error
}
