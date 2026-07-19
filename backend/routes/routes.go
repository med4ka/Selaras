package routes

import (
	"selaras/backend/database"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListOutlets(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var outlets []database.Outlet
		if err := db.Find(&outlets).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch outlets",
			})
		}
		return c.JSON(outlets)
	}
}

func ListStocks(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("role").(string)
		userOutletID, _ := c.Locals("outlet_id").(string)

		var outletUUID *uuid.UUID

		// Manager/Kasir: forced to their own outlet (defense in depth)
		if role != "owner" {
			if userOutletID != "" {
				parsed, err := uuid.Parse(userOutletID)
				if err == nil {
					outletUUID = &parsed
				}
			}
		} else {
			// Owner: optional filter via query param
			outletParam := c.Query("outlet_id")
			if outletParam != "" {
				parsed, err := uuid.Parse(outletParam)
				if err == nil {
					outletUUID = &parsed
				}
			}
		}

		var stocks []database.Stock
		tx := db.Preload("Product").Preload("Product.Category").Preload("Outlet")
		if outletUUID != nil {
			tx = tx.Where("outlet_id = ?", *outletUUID)
		}
		if err := tx.Find(&stocks).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch stocks",
			})
		}
		return c.JSON(stocks)
	}
}
