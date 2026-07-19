package database

import (
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) error {
	var count int64
	db.Model(&User{}).Count(&count)
	if count > 0 {
		return nil // Already seeded
	}

	log.Println("Seeding initial data...")

	// 1. Create Outlet
	outletID := uuid.New()
	outlet := Outlet{
		ID:       outletID,
		Name:     "Selaras Outlet Pusat",
		Address:  "Jl. Sudirman No. 123, Jakarta",
		IsActive: true,
	}
	if err := db.Create(&outlet).Error; err != nil {
		return err
	}

	// 2. Create Owner User (username: owner, password: password123)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	owner := User{
		ID:       uuid.New(),
		Username: "owner",
		Password: string(hashedPassword),
		Role:     RoleOwner,
		OutletID: nil, // Owner has access to all
	}
	if err := db.Create(&owner).Error; err != nil {
		return err
	}

	// 3. Create Cashier User (username: kasir1, password: kasir123)
	hashedPasswordKasir, err := bcrypt.GenerateFromPassword([]byte("kasir123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	kasir := User{
		ID:       uuid.New(),
		Username: "kasir1",
		Password: string(hashedPasswordKasir),
		Role:     RoleKasir,
		OutletID: &outletID,
	}
	if err := db.Create(&kasir).Error; err != nil {
		return err
	}

	// 4. Create Category
	catFoodID := uuid.New()
	catFood := Category{
		ID:   catFoodID,
		Name: "Makanan",
	}
	if err := db.Create(&catFood).Error; err != nil {
		return err
	}

	catDrinkID := uuid.New()
	catDrink := Category{
		ID:   catDrinkID,
		Name: "Minuman",
	}
	if err := db.Create(&catDrink).Error; err != nil {
		return err
	}

	// 5. Create Products
	prod1ID := uuid.New()
	prod1 := Product{
		ID:         prod1ID,
		SKU:        "SEL-001",
		CategoryID: catFoodID,
		Name:       "Nasi Goreng Spesial Selaras",
		Price:      25000,
	}
	if err := db.Create(&prod1).Error; err != nil {
		return err
	}

	prod2ID := uuid.New()
	prod2 := Product{
		ID:         prod2ID,
		SKU:        "SEL-002",
		CategoryID: catDrinkID,
		Name:       "Es Teh Manis Selaras",
		Price:      5000,
	}
	if err := db.Create(&prod2).Error; err != nil {
		return err
	}

	// 6. Create Initial Stock & Stock Ledger (Append-Only source of truth)
	// Stock for Product 1
	stock1ID := uuid.New()
	stock1 := Stock{
		ID:        stock1ID,
		ProductID: prod1ID,
		OutletID:  outletID,
		Quantity:  50,
	}
	if err := db.Create(&stock1).Error; err != nil {
		return err
	}

	ledger1 := StockLedger{
		ID:             uuid.New(),
		ProductID:      prod1ID,
		OutletID:       outletID,
		Delta:          50,
		Reason:         "restock",
		ReferenceID:    stock1ID,
		IdempotencyKey: "init-prod1-stock",
		ClientCreatedAt: time.Now(),
		CreatedBy:      owner.ID,
	}
	if err := db.Create(&ledger1).Error; err != nil {
		return err
	}

	// Stock for Product 2
	stock2ID := uuid.New()
	stock2 := Stock{
		ID:        stock2ID,
		ProductID: prod2ID,
		OutletID:  outletID,
		Quantity:  100,
	}
	if err := db.Create(&stock2).Error; err != nil {
		return err
	}

	ledger2 := StockLedger{
		ID:             uuid.New(),
		ProductID:      prod2ID,
		OutletID:       outletID,
		Delta:          100,
		Reason:         "restock",
		ReferenceID:    stock2ID,
		IdempotencyKey: "init-prod2-stock",
		ClientCreatedAt: time.Now(),
		CreatedBy:      owner.ID,
	}
	if err := db.Create(&ledger2).Error; err != nil {
		return err
	}

	log.Println("Seeding complete!")
	return nil
}
