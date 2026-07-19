package handlers

import (
	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	authService service.AuthService
	userService service.UserService
}

func NewUserHandler(authService service.AuthService, userService service.UserService) *UserHandler {
	return &UserHandler{authService: authService, userService: userService}
}

func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	res, err := h.authService.GetProfile(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	return c.JSON(res)
}

func actorInfo(c *fiber.Ctx) (string, string) {
	role, _ := c.Locals("role").(string)
	outletID, _ := c.Locals("outlet_id").(string)
	return role, outletID
}

func (h *UserHandler) List(c *fiber.Ctx) error {
	role, outletID := actorInfo(c)
	filterOutletID := c.Query("outlet_id")
	users, err := h.userService.List(role, outletID, filterOutletID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal memuat data user"})
	}
	return c.JSON(users)
}

func (h *UserHandler) Create(c *fiber.Ctx) error {
	role, outletID := actorInfo(c)
	var req service.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	user, err := h.userService.Create(&req, role, outletID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(user)
}

func (h *UserHandler) Update(c *fiber.Ctx) error {
	role, outletID := actorInfo(c)
	id := c.Params("id")
	var req service.UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	user, err := h.userService.Update(id, &req, role, outletID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(user)
}

func (h *UserHandler) Deactivate(c *fiber.Ctx) error {
	role, outletID := actorInfo(c)
	id := c.Params("id")
	if err := h.userService.Deactivate(id, role, outletID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *UserHandler) Restore(c *fiber.Ctx) error {
	role, outletID := actorInfo(c)
	id := c.Params("id")
	if err := h.userService.Restore(id, role, outletID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Staff berhasil diaktifkan kembali"})
}
