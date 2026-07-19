package handlers

import (
	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
)

type OutletHandler struct {
	svc service.OutletService
}

func NewOutletHandler(svc service.OutletService) *OutletHandler {
	return &OutletHandler{svc: svc}
}

func (h *OutletHandler) List(c *fiber.Ctx) error {
	var outlets interface{}
	var err error

	if c.Query("include_inactive") == "true" {
		outlets, err = h.svc.ListAll()
	} else {
		outlets, err = h.svc.List()
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch outlets"})
	}
	return c.JSON(outlets)
}

func (h *OutletHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	o, err := h.svc.GetByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Outlet not found"})
	}
	return c.JSON(o)
}

func (h *OutletHandler) Create(c *fiber.Ctx) error {
	var req service.OutletRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	o, err := h.svc.Create(&req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(o)
}

func (h *OutletHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req service.OutletRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	o, err := h.svc.Update(id, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(o)
}

func (h *OutletHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.Delete(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *OutletHandler) Restore(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.Restore(id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Outlet berhasil diaktifkan kembali"})
}
