package handlers

import (
	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
)

type StockHandler struct {
	svc service.StockService
}

func NewStockHandler(svc service.StockService) *StockHandler {
	return &StockHandler{svc: svc}
}

func (h *StockHandler) Transfer(c *fiber.Ctx) error {
	var req service.StockTransferRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID, _ := c.Locals("user_id").(string)

	result, err := h.svc.Transfer(&req, userID)
	if err != nil {
		if err.Error() == "idempotency key sudah ada" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

func (h *StockHandler) Adjust(c *fiber.Ctx) error {
	var req service.StockAdjustRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID, _ := c.Locals("user_id").(string)

	result, err := h.svc.Adjust(&req, userID)
	if err != nil {
		if err.Error() == "idempotency key sudah ada" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}
