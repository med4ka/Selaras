package service

import (
	"selaras/backend/repository"
	"time"

	"github.com/google/uuid"
)

type ReportService interface {
	GetSalesReport(from, to time.Time, outletID *uuid.UUID) (*repository.SalesReport, error)
}

type reportService struct {
	repo repository.ReportRepository
}

func NewReportService(repo repository.ReportRepository) ReportService {
	return &reportService{repo: repo}
}

func (s *reportService) GetSalesReport(from, to time.Time, outletID *uuid.UUID) (*repository.SalesReport, error) {
	return s.repo.GetSalesReport(from, to, outletID)
}
