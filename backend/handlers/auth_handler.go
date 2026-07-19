package handlers

import (
	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req service.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse request body",
		})
	}

	res, err := h.authService.Login(&req)
	if err != nil {
		if err.Error() == "invalid username or password" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	secure := false
	if c.Protocol() == "https" {
		secure = true
	}

	c.Cookie(&fiber.Cookie{
		Name:     "selaras_token",
		Value:    res.Token,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Strict",
		Path:     "/",
		MaxAge:   7 * 24 * 3600,
	})

	return c.JSON(fiber.Map{"user": res.User})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "selaras_token",
		Value:    "",
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Strict",
		Path:     "/",
		MaxAge:   -1,
	})
	return c.JSON(fiber.Map{"message": "Logged out"})
}
