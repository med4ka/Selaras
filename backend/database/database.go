package database

import (
	"fmt"

	"selaras/backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DBPoolMax)
	sqlDB.SetMaxIdleConns(cfg.DBPoolMin)
	sqlDB.SetConnMaxLifetime(cfg.DBPoolMaxLifetime)
	sqlDB.SetConnMaxIdleTime(cfg.DBPoolMaxIdleTime)

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&Outlet{},
		&User{},
		&Category{},
		&Product{},
		&Stock{},
		&StockLedger{},
		&Transaction{},
		&TransactionItem{},
		&Payment{},
		&SyncAuditLog{},
	)
}
