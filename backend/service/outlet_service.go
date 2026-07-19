package service

import (
	"selaras/backend/database"
	"selaras/backend/repository"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type OutletRequest struct {
	Name    string `json:"name" validate:"required,min=1,max=200"`
	Address string `json:"address"`
}

type OutletResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Address   string `json:"address"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type OutletService interface {
	List() ([]OutletResponse, error)
	ListAll() ([]OutletResponse, error)
	GetByID(id string) (*OutletResponse, error)
	Create(req *OutletRequest) (*OutletResponse, error)
	Update(id string, req *OutletRequest) (*OutletResponse, error)
	Delete(id string) error
	Restore(id string) error
}

type outletService struct {
	repo     repository.OutletRepository
	validate *validator.Validate
}

func NewOutletService(repo repository.OutletRepository) OutletService {
	return &outletService{
		repo:     repo,
		validate: validator.New(),
	}
}

func toOutletResponse(o *database.Outlet) *OutletResponse {
	return &OutletResponse{
		ID:        o.ID.String(),
		Name:      o.Name,
		Address:   o.Address,
		IsActive:  o.IsActive,
		CreatedAt: o.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: o.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (s *outletService) List() ([]OutletResponse, error) {
	outlets, err := s.repo.List()
	if err != nil {
		return nil, err
	}
	res := make([]OutletResponse, len(outlets))
	for i, o := range outlets {
		res[i] = *toOutletResponse(&o)
	}
	return res, nil
}

func (s *outletService) ListAll() ([]OutletResponse, error) {
	outlets, err := s.repo.ListAll()
	if err != nil {
		return nil, err
	}
	res := make([]OutletResponse, len(outlets))
	for i, o := range outlets {
		res[i] = *toOutletResponse(&o)
	}
	return res, nil
}

func (s *outletService) GetByID(id string) (*OutletResponse, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	o, err := s.repo.GetByID(uid)
	if err != nil {
		return nil, err
	}
	return toOutletResponse(o), nil
}

func (s *outletService) Create(req *OutletRequest) (*OutletResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	outlet := database.Outlet{
		ID:      uuid.New(),
		Name:    req.Name,
		Address: req.Address,
	}
	if err := s.repo.Create(&outlet); err != nil {
		return nil, err
	}

	created, _ := s.repo.GetByID(outlet.ID)
	return toOutletResponse(created), nil
}

func (s *outletService) Update(id string, req *OutletRequest) (*OutletResponse, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}

	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	outlet, err := s.repo.GetByID(uid)
	if err != nil {
		return nil, err
	}

	outlet.Name = req.Name
	outlet.Address = req.Address

	if err := s.repo.Update(outlet); err != nil {
		return nil, err
	}

	updated, _ := s.repo.GetByID(uid)
	return toOutletResponse(updated), nil
}

func (s *outletService) Delete(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(uid)
}

func (s *outletService) Restore(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.Restore(uid)
}
