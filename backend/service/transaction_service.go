package service

import (
	"errors"
	"fmt"
	"time"

	"selaras/backend/config"
	"selaras/backend/database"
	"selaras/backend/repository"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrDuplicateIdempotencyKey = errors.New("duplicate idempotency_key")

type PaymentRequest struct {
	Method      string  `json:"method" validate:"required,oneof=cash qris card"`
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	ReferenceNo string  `json:"reference_no,omitempty"`
}

type ItemRequest struct {
	ProductID string `json:"product_id" validate:"required,uuid"`
	Quantity  int    `json:"quantity" validate:"required,gt=0"`
}

type TransactionRequest struct {
	OutletID        string          `json:"outlet_id" validate:"required,uuid"`
	Items           []ItemRequest   `json:"items" validate:"required,min=1,dive"`
	Payments        []PaymentRequest `json:"payments" validate:"required,min=1,dive"`
	IdempotencyKey  string          `json:"idempotency_key" validate:"required"`
	ClientCreatedAt string          `json:"client_created_at"`
}

type ItemResponse struct {
	ProductID string  `json:"product_id"`
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
	Subtotal  float64 `json:"subtotal"`
}

type TransactionResponse struct {
	ID             string         `json:"id"`
	OutletID       string         `json:"outlet_id"`
	Status         string         `json:"status"`
	TotalAmount    float64        `json:"total_amount"`
	IdempotencyKey string         `json:"idempotency_key"`
	Items          []ItemResponse `json:"items"`
}

type TransactionListItem struct {
	ID          string  `json:"id"`
	TotalAmount float64 `json:"total_amount"`
	Status      string  `json:"status"`
	CashierName string  `json:"cashier_name"`
	OutletName  string  `json:"outlet_name"`
	CreatedAt   string  `json:"created_at"`
}

type TransactionService interface {
	Create(req *TransactionRequest, cashierID string) (*TransactionResponse, error)
	ListRecent(limit int, role string, userOutletID string) ([]TransactionListItem, error)
}

type transactionService struct {
	db         *gorm.DB
	txRepo     repository.TransactionRepository
	prodRepo   repository.ProductRepository
	ledgerRepo repository.StockLedgerRepository
	stockRepo  repository.StockRepository
	cfg        *config.Config
	validate   *validator.Validate
}

func NewTransactionService(
	db *gorm.DB,
	txRepo repository.TransactionRepository,
	prodRepo repository.ProductRepository,
	ledgerRepo repository.StockLedgerRepository,
	stockRepo repository.StockRepository,
	cfg *config.Config,
) TransactionService {
	return &transactionService{
		db:         db,
		txRepo:     txRepo,
		prodRepo:   prodRepo,
		ledgerRepo: ledgerRepo,
		stockRepo:  stockRepo,
		cfg:        cfg,
		validate:   validator.New(),
	}
}

type itemWithProduct struct {
	Item  ItemRequest
	Prod  *database.Product
}

func (s *transactionService) ListRecent(limit int, role string, userOutletID string) ([]TransactionListItem, error) {
	var outletUUID *uuid.UUID
	if role != "owner" && userOutletID != "" {
		parsed, err := uuid.Parse(userOutletID)
		if err == nil {
			outletUUID = &parsed
		}
	}
	transactions, err := s.txRepo.ListRecent(limit, outletUUID)
	if err != nil {
		return nil, err
	}
	items := make([]TransactionListItem, len(transactions))
	for i, t := range transactions {
		cashierName := ""
		if t.Cashier != nil {
			cashierName = t.Cashier.Username
		}
		outletName := ""
		if t.Outlet != nil {
			outletName = t.Outlet.Name
		}
		items[i] = TransactionListItem{
			ID:          t.ID.String(),
			TotalAmount: t.TotalAmount,
			Status:      t.Status,
			CashierName: cashierName,
			OutletName:  outletName,
			CreatedAt:   t.ClientCreatedAt.Format(time.RFC3339),
		}
	}
	return items, nil
}

func (s *transactionService) Create(req *TransactionRequest, cashierID string) (*TransactionResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	outletID, _ := uuid.Parse(req.OutletID)
	cashierUUID, _ := uuid.Parse(cashierID)

	clientTime := time.Now()
	if req.ClientCreatedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, req.ClientCreatedAt); err == nil {
			clientTime = parsed
		}
	}

	var preparedItems []itemWithProduct
	var totalAmount float64

	for _, it := range req.Items {
		prodID, _ := uuid.Parse(it.ProductID)
		product, err := s.prodRepo.GetByID(prodID)
		if err != nil {
			return nil, errors.New("product not found: " + it.ProductID)
		}
		preparedItems = append(preparedItems, itemWithProduct{Item: it, Prod: product})
		totalAmount += float64(it.Quantity) * product.Price
	}

	var transactionID uuid.UUID

	txErr := s.db.Transaction(func(dbTx *gorm.DB) error {
		transactionID = uuid.New()
		transaction := database.Transaction{
			ID:              transactionID,
			OutletID:        outletID,
			CashierID:       cashierUUID,
			Status:          "synced",
			TotalAmount:     totalAmount,
			IdempotencyKey:  req.IdempotencyKey,
			ClientCreatedAt: clientTime,
		}

		// 1. Create transaction with idempotency check via UNIQUE constraint (race-condition-free)
		isDuplicate, err := s.txRepo.Create(dbTx, &transaction)
		if err != nil {
			return err
		}
		if isDuplicate {
			return ErrDuplicateIdempotencyKey
		}

		// 2. FIRST: Check & deduct ALL stock BEFORE any item/ledger inserts
		// This ensures fail-fast: if stock is insufficient, no writes are wasted
		for _, ip := range preparedItems {
			res := dbTx.Model(&database.Stock{}).
				Where("product_id = ? AND outlet_id = ? AND quantity >= ?", ip.Prod.ID, outletID, ip.Item.Quantity).
				UpdateColumn("quantity", gorm.Expr("quantity - ?", ip.Item.Quantity))
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				var currentQty int
				err := dbTx.Model(&database.Stock{}).
					Select("quantity").
					Where("product_id = ? AND outlet_id = ?", ip.Prod.ID, outletID).
					Scan(&currentQty).Error
				available := 0
				if err == nil {
					available = currentQty
				}
				return fmt.Errorf("insufficient stock for %s (requested: %d, available: %d)",
					ip.Prod.Name, ip.Item.Quantity, available)
			}
		}

		// 3. SECOND: Insert transaction_items + stock_ledger (safe — stock is already verified)
		for _, ip := range preparedItems {
			item := database.TransactionItem{
				ID:            uuid.New(),
				TransactionID: transactionID,
				ProductID:     ip.Prod.ID,
				Quantity:      ip.Item.Quantity,
				UnitPrice:     ip.Prod.Price,
				Subtotal:      float64(ip.Item.Quantity) * ip.Prod.Price,
			}
			if err := dbTx.Create(&item).Error; err != nil {
				return err
			}

			ledgerEntry := database.StockLedger{
				ID:              uuid.New(),
				ProductID:       ip.Prod.ID,
				OutletID:        outletID,
				Delta:           -ip.Item.Quantity,
				Reason:          "sale",
				ReferenceID:     transactionID,
				IdempotencyKey:  "txn-" + req.IdempotencyKey + "-" + ip.Prod.ID.String(),
				ClientCreatedAt: clientTime,
				CreatedBy:       cashierUUID,
			}
			if err := dbTx.Create(&ledgerEntry).Error; err != nil {
				return err
			}
		}

		// 4. Insert payments
		for _, p := range req.Payments {
			payment := database.Payment{
				ID:            uuid.New(),
				TransactionID: transactionID,
				Method:        p.Method,
				Amount:        p.Amount,
				ReferenceNo:   p.ReferenceNo,
			}
			if err := dbTx.Create(&payment).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if txErr != nil {
		return nil, txErr
	}

	itemResponses := make([]ItemResponse, len(preparedItems))
	for i, ip := range preparedItems {
		itemResponses[i] = ItemResponse{
			ProductID: ip.Prod.ID.String(),
			Name:      ip.Prod.Name,
			Quantity:  ip.Item.Quantity,
			UnitPrice: ip.Prod.Price,
			Subtotal:  float64(ip.Item.Quantity) * ip.Prod.Price,
		}
	}

	return &TransactionResponse{
		ID:             transactionID.String(),
		OutletID:       outletID.String(),
		Status:         "synced",
		TotalAmount:    totalAmount,
		IdempotencyKey: req.IdempotencyKey,
		Items:          itemResponses,
	}, nil
}
