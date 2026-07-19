package repository

import (
	"selaras/backend/database"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SalesReport struct {
	TotalPenjualan  int64        `json:"total_penjualan"`
	JumlahTransaksi int64        `json:"jumlah_transaksi"`
	ProdukTerlaris  []TopProduct `json:"produk_terlaris"`
}

type TopProduct struct {
	ProductID     string `json:"product_id"`
	Name          string `json:"name"`
	SKU           string `json:"sku"`
	TotalQuantity int    `json:"total_quantity"`
	TotalRevenue  int64  `json:"total_revenue"`
}

type ReportRepository interface {
	GetSalesReport(from, to time.Time, outletID *uuid.UUID) (*SalesReport, error)
}

type reportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) ReportRepository {
	return &reportRepository{db: db}
}

func (r *reportRepository) GetSalesReport(from, to time.Time, outletID *uuid.UUID) (*SalesReport, error) {
	var report SalesReport

	tx := r.db.Model(&database.Transaction{}).
		Where("client_created_at BETWEEN ? AND ?", from, to).
		Where("status != ?", "voided")

	if outletID != nil {
		tx = tx.Where("outlet_id = ?", *outletID)
	}

	if err := tx.Count(&report.JumlahTransaksi).Error; err != nil {
		return nil, err
	}

	if err := tx.Select("COALESCE(CAST(SUM(total_amount) AS BIGINT), 0)").Scan(&report.TotalPenjualan).Error; err != nil {
		return nil, err
	}

	topQuery := r.db.Table("transaction_items").
		Select(`transaction_items.product_id,
				products.name,
				products.sku,
				SUM(transaction_items.quantity) as total_quantity,
				CAST(SUM(transaction_items.subtotal) AS BIGINT) as total_revenue`).
		Joins("JOIN transactions ON transactions.id = transaction_items.transaction_id").
		Joins("JOIN products ON products.id = transaction_items.product_id").
		Where("transactions.client_created_at BETWEEN ? AND ?", from, to).
		Where("transactions.status != ?", "voided").
		Group("transaction_items.product_id, products.name, products.sku").
		Order("total_quantity DESC").
		Limit(5)

	if outletID != nil {
		topQuery = topQuery.Where("transactions.outlet_id = ?", *outletID)
	}

	if err := topQuery.Scan(&report.ProdukTerlaris).Error; err != nil {
		return nil, err
	}

	if report.ProdukTerlaris == nil {
		report.ProdukTerlaris = []TopProduct{}
	}

	return &report, nil
}
