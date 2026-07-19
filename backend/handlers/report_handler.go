package handlers

import (
	"time"

	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ReportHandler struct {
	svc service.ReportService
}

func NewReportHandler(svc service.ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

func (h *ReportHandler) GetSalesReport(c *fiber.Ctx) error {
	fromStr := c.Query("from")
	toStr := c.Query("to")
	outletParam := c.Query("outlet_id")

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parameter 'from' wajib diisi dengan format YYYY-MM-DD",
		})
	}

	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parameter 'to' wajib diisi dengan format YYYY-MM-DD",
		})
	}

	if from.After(to) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Tanggal awal tidak boleh lebih besar dari tanggal akhir",
		})
	}

	// to should be end-of-day
	to = to.Add(24*time.Hour - time.Second)

	role := c.Locals("role").(string)
	var outletID *uuid.UUID

	if outletParam != "" {
		parsed, err := uuid.Parse(outletParam)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Parameter 'outlet_id' tidak valid",
			})
		}

		// Manager/Kasir can only request their own outlet
		if role != "owner" {
			userOutletStr, ok := c.Locals("outlet_id").(string)
			if !ok || userOutletStr == "" || userOutletStr != outletParam {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "Anda tidak memiliki akses ke outlet ini",
				})
			}
		}
		outletID = &parsed
	} else {
		// Manager/Kasir without outlet_id param — force to their own outlet
		if role != "owner" {
			userOutletStr, ok := c.Locals("outlet_id").(string)
			if ok && userOutletStr != "" {
				parsed, _ := uuid.Parse(userOutletStr)
				outletID = &parsed
			}
		}
	}

	report, err := h.svc.GetSalesReport(from, to, outletID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal memuat laporan penjualan",
		})
	}

	return c.JSON(report)
}
