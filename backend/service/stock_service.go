package service

import (
	"errors"
	"fmt"
	"time"

	"selaras/backend/database"
	"selaras/backend/repository"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AdjustItemRequest struct {
	ProductID string `json:"product_id" validate:"required,uuid"`
	Delta     int    `json:"delta" validate:"required"`
}

type StockAdjustRequest struct {
	OutletID       string              `json:"outlet_id" validate:"required,uuid"`
	Items          []AdjustItemRequest `json:"items" validate:"required,min=1,dive"`
	IdempotencyKey string              `json:"idempotency_key" validate:"required"`
}

type StockAdjustResponse struct {
	Processed int `json:"processed"`
}

type StockTransferItemRequest struct {
	ProductID string `json:"product_id" validate:"required,uuid"`
	Quantity  int    `json:"quantity" validate:"required,gt=0"`
}

type StockTransferRequest struct {
	FromOutletID   string                     `json:"from_outlet_id" validate:"required,uuid"`
	ToOutletID     string                     `json:"to_outlet_id" validate:"required,uuid"`
	IdempotencyKey string                     `json:"idempotency_key" validate:"required"`
	Items          []StockTransferItemRequest `json:"items" validate:"required,min=1,dive"`
}

type StockTransferResponse struct {
	Processed int `json:"processed"`
}

type StockService interface {
	Adjust(req *StockAdjustRequest, userID string) (*StockAdjustResponse, error)
	Transfer(req *StockTransferRequest, userID string) (*StockTransferResponse, error)
}

type stockService struct {
	db         *gorm.DB
	prodRepo   repository.ProductRepository
	ledgerRepo repository.StockLedgerRepository
	validate   *validator.Validate
}

func NewStockService(
	db *gorm.DB,
	prodRepo repository.ProductRepository,
	ledgerRepo repository.StockLedgerRepository,
) StockService {
	return &stockService{
		db:         db,
		prodRepo:   prodRepo,
		ledgerRepo: ledgerRepo,
		validate:   validator.New(),
	}
}

func (s *stockService) Adjust(req *StockAdjustRequest, userID string) (*StockAdjustResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	outletID, _ := uuid.Parse(req.OutletID)
	userUUID, _ := uuid.Parse(userID)

	type itemWithProduct struct {
		Item  AdjustItemRequest
		Prod  *database.Product
	}

	var prepared []itemWithProduct

	for _, it := range req.Items {
		prodID, _ := uuid.Parse(it.ProductID)
		product, err := s.prodRepo.GetByID(prodID)
		if err != nil {
			return nil, errors.New("product not found: " + it.ProductID)
		}
		prepared = append(prepared, itemWithProduct{Item: it, Prod: product})
	}

	processed := 0

	txErr := s.db.Transaction(func(dbTx *gorm.DB) error {
		referenceID := uuid.New()

		for i, ip := range prepared {
			ledgerKey := "adj-" + req.IdempotencyKey + "-" + ip.Prod.ID.String()

			var reason string
			if ip.Item.Delta > 0 {
				reason = "restock"
			} else {
				reason = "adjustment"
			}

			// First item: idempotency check via ON CONFLICT DO NOTHING
			if i == 0 {
				ledger := database.StockLedger{
					ID:              uuid.New(),
					ProductID:       ip.Prod.ID,
					OutletID:        outletID,
					Delta:           ip.Item.Delta,
					Reason:          reason,
					ReferenceID:     referenceID,
					IdempotencyKey:  req.IdempotencyKey,
					ClientCreatedAt: time.Now(),
					CreatedBy:       userUUID,
				}
				// Use the first stock_ledger entry as the idempotency marker
				// Race-condition-free: UNIQUE constraint on idempotency_key
				duplicate, err := s.ledgerRepo.CreateWithConflictCheck(dbTx, &ledger)
				if err != nil {
					return err
				}
				if duplicate {
					return errors.New("idempotency key sudah ada")
				}
			} else {
				ledger := database.StockLedger{
					ID:              uuid.New(),
					ProductID:       ip.Prod.ID,
					OutletID:        outletID,
					Delta:           ip.Item.Delta,
					Reason:          reason,
					ReferenceID:     referenceID,
					IdempotencyKey:  ledgerKey,
					ClientCreatedAt: time.Now(),
					CreatedBy:       userUUID,
				}
				if err := dbTx.Create(&ledger).Error; err != nil {
					return err
				}
			}

			// Update stock cache — atomic
			if ip.Item.Delta > 0 {
				// Restock: increment (or create row)
				var existing int64
				dbTx.Model(&database.Stock{}).
					Where("product_id = ? AND outlet_id = ?", ip.Prod.ID, outletID).
					Count(&existing)

				if existing == 0 {
					if err := dbTx.Create(&database.Stock{
						ProductID: ip.Prod.ID,
						OutletID:  outletID,
						Quantity:  ip.Item.Delta,
					}).Error; err != nil {
						return err
					}
				} else {
					res := dbTx.Model(&database.Stock{}).
						Where("product_id = ? AND outlet_id = ?", ip.Prod.ID, outletID).
						UpdateColumn("quantity", gorm.Expr("quantity + ?", ip.Item.Delta))
					if res.Error != nil {
						return res.Error
					}
				}
			} else {
				// Adjustment: deduct with atomic stock check
				absDelta := -ip.Item.Delta
				res := dbTx.Model(&database.Stock{}).
					Where("product_id = ? AND outlet_id = ? AND quantity >= ?", ip.Prod.ID, outletID, absDelta).
					UpdateColumn("quantity", gorm.Expr("quantity - ?", absDelta))
				if res.Error != nil {
					return res.Error
				}
				if res.RowsAffected == 0 {
					var currentQty int
					dbTx.Model(&database.Stock{}).
						Select("quantity").
						Where("product_id = ? AND outlet_id = ?", ip.Prod.ID, outletID).
						Scan(&currentQty)
					return fmt.Errorf("insufficient stock for %s (requested: %d, available: %d)",
						ip.Prod.Name, absDelta, currentQty)
				}
			}
		}

		processed = len(prepared)
		return nil
	})

	if txErr != nil {
		return nil, txErr
	}

	return &StockAdjustResponse{Processed: processed}, nil
}

func (s *stockService) Transfer(req *StockTransferRequest, userID string) (*StockTransferResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	if req.FromOutletID == req.ToOutletID {
		return nil, errors.New("outlet asal dan tujuan tidak boleh sama")
	}

	fromOutletID, _ := uuid.Parse(req.FromOutletID)
	toOutletID, _ := uuid.Parse(req.ToOutletID)
	userUUID, _ := uuid.Parse(userID)

	type itemWithProduct struct {
		Item StockTransferItemRequest
		Prod *database.Product
	}

	var prepared []itemWithProduct

	for _, it := range req.Items {
		prodID, _ := uuid.Parse(it.ProductID)
		product, err := s.prodRepo.GetByID(prodID)
		if err != nil {
			return nil, errors.New("product not found: " + it.ProductID)
		}
		prepared = append(prepared, itemWithProduct{Item: it, Prod: product})
	}

	var processed int

	txErr := s.db.Transaction(func(dbTx *gorm.DB) error {
		referenceID := uuid.New()

		for i, ip := range prepared {
			outKey := req.IdempotencyKey + "-" + ip.Prod.ID.String() + "-out"
			inKey := req.IdempotencyKey + "-" + ip.Prod.ID.String() + "-in"

			// 1. Deduct from source — atomic check
			res := dbTx.Model(&database.Stock{}).
				Where("product_id = ? AND outlet_id = ? AND quantity >= ?", ip.Prod.ID, fromOutletID, ip.Item.Quantity).
				UpdateColumn("quantity", gorm.Expr("quantity - ?", ip.Item.Quantity))
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				var currentQty int
				dbTx.Model(&database.Stock{}).
					Select("quantity").
					Where("product_id = ? AND outlet_id = ?", ip.Prod.ID, fromOutletID).
					Scan(&currentQty)
				return fmt.Errorf("stok tidak cukup untuk %s (diminta: %d, tersedia: %d)",
					ip.Prod.Name, ip.Item.Quantity, currentQty)
			}

			// 2. Ledger OUT
			outLedger := database.StockLedger{
				ID:              uuid.New(),
				ProductID:       ip.Prod.ID,
				OutletID:        fromOutletID,
				Delta:           -ip.Item.Quantity,
				Reason:          "transfer_out",
				ReferenceID:     referenceID,
				IdempotencyKey:  outKey,
				ClientCreatedAt: time.Now(),
				CreatedBy:       userUUID,
			}

			if i == 0 {
				duplicate, err := s.ledgerRepo.CreateWithConflictCheck(dbTx, &outLedger)
				if err != nil {
					return err
				}
				if duplicate {
					return errors.New("idempotency key sudah ada")
				}
			} else {
				if err := dbTx.Create(&outLedger).Error; err != nil {
					return err
				}
			}

			// 3. Add to destination — upsert
			var destStock database.Stock
			result := dbTx.Where("product_id = ? AND outlet_id = ?", ip.Prod.ID, toOutletID).First(&destStock)
			if result.Error != nil {
				if err := dbTx.Create(&database.Stock{
					ProductID: ip.Prod.ID,
					OutletID:  toOutletID,
					Quantity:  ip.Item.Quantity,
				}).Error; err != nil {
					return err
				}
			} else {
				if err := dbTx.Model(&database.Stock{}).
					Where("product_id = ? AND outlet_id = ?", ip.Prod.ID, toOutletID).
					UpdateColumn("quantity", gorm.Expr("quantity + ?", ip.Item.Quantity)).Error; err != nil {
					return err
				}
			}

			// 4. Ledger IN
			inLedger := database.StockLedger{
				ID:              uuid.New(),
				ProductID:       ip.Prod.ID,
				OutletID:        toOutletID,
				Delta:           ip.Item.Quantity,
				Reason:          "transfer_in",
				ReferenceID:     referenceID,
				IdempotencyKey:  inKey,
				ClientCreatedAt: time.Now(),
				CreatedBy:       userUUID,
			}
			if err := dbTx.Create(&inLedger).Error; err != nil {
				return err
			}
		}

		processed = len(prepared)
		return nil
	})

	if txErr != nil {
		return nil, txErr
	}

	return &StockTransferResponse{Processed: processed}, nil
}
