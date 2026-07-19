package handlers

import (
	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
	svc service.ProductService
}

func NewProductHandler(svc service.ProductService) *ProductHandler {
	return &ProductHandler{svc: svc}
}

func (h *ProductHandler) List(c *fiber.Ctx) error {
	var products interface{}
	var err error

	if c.Query("include_inactive") == "true" {
		products, err = h.svc.ListAll()
	} else {
		products, err = h.svc.List()
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch products"})
	}
	return c.JSON(products)
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	p, err := h.svc.GetByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
	}
	return c.JSON(p)
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
	var req service.ProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	p, err := h.svc.Create(&req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req service.ProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	p, err := h.svc.Update(id, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(p)
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.Delete(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *ProductHandler) Restore(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.Restore(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Produk berhasil diaktifkan kembali"})
}
