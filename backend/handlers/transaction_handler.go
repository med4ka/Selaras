package handlers

import (
	"errors"
	"strconv"

	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
)

type TransactionHandler struct {
	svc service.TransactionService
}

func NewTransactionHandler(svc service.TransactionService) *TransactionHandler {
	return &TransactionHandler{svc: svc}
}

func (h *TransactionHandler) Create(c *fiber.Ctx) error {
	var req service.TransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	cashierID, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	res, err := h.svc.Create(&req, cashierID)
	if err != nil {
		if errors.Is(err, service.ErrDuplicateIdempotencyKey) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(res)
}

func (h *TransactionHandler) ListRecent(c *fiber.Ctx) error {
	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 50 {
		limit = 10
	}

	role, _ := c.Locals("role").(string)
	userOutletID, _ := c.Locals("outlet_id").(string)
	filterOutletID := c.Query("outlet_id")

	effectiveOutletID := userOutletID
	if role == "owner" && filterOutletID != "" {
		effectiveOutletID = filterOutletID
	}

	items, err := h.svc.ListRecent(limit, role, effectiveOutletID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memuat transaksi"})
	}
	return c.JSON(items)
}
