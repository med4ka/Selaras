package database

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleOwner   UserRole = "owner"
	RoleManager UserRole = "manager"
	RoleKasir   UserRole = "kasir"
)

type Outlet struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string     `gorm:"type:varchar(200);not null" json:"name"`
	Address   string     `gorm:"type:text" json:"address"`
	IsActive  bool       `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type User struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Username  string     `gorm:"type:varchar(100);unique;not null" json:"username"`
	Password  string     `gorm:"type:varchar(255);not null" json:"-"`
	Role      UserRole   `gorm:"type:varchar(20);not null" json:"role"`
	OutletID  *uuid.UUID `gorm:"type:uuid" json:"outlet_id"`
	IsActive  bool       `gorm:"default:true;not null" json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	Outlet *Outlet `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
}

type Category struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"type:varchar(200);not null" json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Product struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SKU               string    `gorm:"type:varchar(50);unique;not null;index" json:"sku"`
	CategoryID        uuid.UUID `gorm:"type:uuid;not null" json:"category_id"`
	Name              string    `gorm:"type:varchar(300);not null" json:"name"`
	Price             float64   `gorm:"type:decimal(15,2);not null" json:"price"`
	LowStockThreshold int       `gorm:"default:10;not null" json:"low_stock_threshold"`
	IsActive          bool      `gorm:"default:true;not null" json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type Stock struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_stock_product_outlet" json:"product_id"`
	OutletID     uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_stock_product_outlet" json:"outlet_id"`
	Quantity     int       `gorm:"not null;default:0" json:"quantity"`
	LastSyncedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"last_synced_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Outlet  *Outlet  `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
}

type StockLedger struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID       uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	OutletID        uuid.UUID `gorm:"type:uuid;not null;index" json:"outlet_id"`
	Delta           int       `gorm:"not null" json:"delta"`
	Reason          string    `gorm:"type:varchar(50);not null" json:"reason"`
	ReferenceID     uuid.UUID `gorm:"type:uuid;not null" json:"reference_id"`
	IdempotencyKey  string    `gorm:"type:varchar(255);unique;not null;index" json:"idempotency_key"`
	ClientCreatedAt time.Time `gorm:"not null" json:"client_created_at"`
	SyncedAt        time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"synced_at"`
	CreatedBy       uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`
}

type Transaction struct {
	ID              uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OutletID        uuid.UUID         `gorm:"type:uuid;not null;index" json:"outlet_id"`
	CashierID       uuid.UUID         `gorm:"type:uuid;not null" json:"cashier_id"`
	Status          string            `gorm:"type:varchar(20);not null;default:'pending_sync'" json:"status"`
	TotalAmount     float64           `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	IdempotencyKey  string            `gorm:"type:varchar(255);unique;not null;index" json:"idempotency_key"`
	ClientCreatedAt time.Time         `gorm:"not null" json:"client_created_at"`
	SyncedAt        time.Time         `gorm:"default:CURRENT_TIMESTAMP" json:"synced_at"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`

	Outlet  *Outlet           `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	Cashier *User             `gorm:"foreignKey:CashierID" json:"cashier,omitempty"`
	Items   []TransactionItem `gorm:"foreignKey:TransactionID" json:"items,omitempty"`
	Payments []Payment        `gorm:"foreignKey:TransactionID" json:"payments,omitempty"`
}

type TransactionItem struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TransactionID uuid.UUID `gorm:"type:uuid;not null;index" json:"transaction_id"`
	ProductID     uuid.UUID `gorm:"type:uuid;not null" json:"product_id"`
	Quantity      int       `gorm:"not null" json:"quantity"`
	UnitPrice     float64   `gorm:"type:decimal(15,2);not null" json:"unit_price"`
	Subtotal      float64   `gorm:"type:decimal(15,2);not null" json:"subtotal"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type Payment struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TransactionID uuid.UUID `gorm:"type:uuid;not null;index" json:"transaction_id"`
	Method        string    `gorm:"type:varchar(20);not null" json:"method"`
	Amount        float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	ReferenceNo   string    `gorm:"type:varchar(100)" json:"reference_no"`
}

type SyncAuditLog struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	EntityType      string    `gorm:"type:varchar(50);not null" json:"entity_type"`
	EntityID        uuid.UUID `gorm:"type:uuid;not null" json:"entity_id"`
	Action          string    `gorm:"type:varchar(50);not null" json:"action"`
	OutletID        uuid.UUID `gorm:"type:uuid" json:"outlet_id"`
	UserID          uuid.UUID `gorm:"type:uuid" json:"user_id"`
	ClientTimestamp  time.Time `json:"client_timestamp"`
	ServerTimestamp time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"server_timestamp"`
	Notes           string    `gorm:"type:text" json:"notes"`
}
