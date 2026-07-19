package service

import (
	"errors"
	"selaras/backend/database"
	"selaras/backend/repository"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type CreateUserRequest struct {
	Username string `json:"username" validate:"required,min=3,max=100"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required,oneof=owner manager kasir"`
	OutletID string `json:"outlet_id,omitempty"`
}

type UpdateUserRequest struct {
	Username string `json:"username,omitempty" validate:"omitempty,min=3,max=100"`
	Password string `json:"password,omitempty" validate:"omitempty,min=6"`
	Role     string `json:"role" validate:"required,oneof=owner manager kasir"`
	OutletID string `json:"outlet_id,omitempty"`
}

type UserItem struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	OutletID  string `json:"outlet_id,omitempty"`
	Outlet    string `json:"outlet,omitempty"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

type UserService interface {
	List(actorRole string, actorOutletID string, filterOutletID string) ([]UserItem, error)
	Create(req *CreateUserRequest, actorRole string, actorOutletID string) (*UserItem, error)
	Update(id string, req *UpdateUserRequest, actorRole string, actorOutletID string) (*UserItem, error)
	Deactivate(id string, actorRole string, actorOutletID string) error
	Restore(id string, actorRole string, actorOutletID string) error
}

type userService struct {
	userRepo repository.UserRepository
	validate *validator.Validate
}

func NewUserService(userRepo repository.UserRepository) UserService {
	return &userService{
		userRepo: userRepo,
		validate: validator.New(),
	}
}

func toUserItem(u *database.User) *UserItem {
	var outletID, outletName string
	if u.OutletID != nil {
		outletID = u.OutletID.String()
	}
	if u.Outlet != nil {
		outletName = u.Outlet.Name
	}
	return &UserItem{
		ID:        u.ID.String(),
		Username:  u.Username,
		Role:      string(u.Role),
		OutletID:  outletID,
		Outlet:    outletName,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (s *userService) List(actorRole string, actorOutletID string, filterOutletID string) ([]UserItem, error) {
	var repoFilter *uuid.UUID

	if actorRole == "manager" {
		// Manager: forced to their own outlet
		if actorOutletID != "" {
			parsed, _ := uuid.Parse(actorOutletID)
			repoFilter = &parsed
		}
	} else if actorRole == "owner" && filterOutletID != "" {
		// Owner: optional outlet filter from query param
		parsed, err := uuid.Parse(filterOutletID)
		if err == nil {
			repoFilter = &parsed
		}
	}

	users, err := s.userRepo.List(repoFilter)
	if err != nil {
		return nil, err
	}
	res := make([]UserItem, 0, len(users))
	for _, u := range users {
		if actorRole == "manager" && u.Role != database.RoleKasir {
			continue
		}
		res = append(res, *toUserItem(&u))
	}
	return res, nil
}

func (s *userService) Create(req *CreateUserRequest, actorRole string, actorOutletID string) (*UserItem, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	if actorRole == "manager" && req.Role != "kasir" {
		return nil, errors.New("manager hanya dapat membuat akun kasir")
	}
	if actorRole == "manager" && actorOutletID != "" && req.OutletID != actorOutletID {
		req.OutletID = actorOutletID
	}

	if _, err := s.userRepo.GetByUsername(req.Username); err == nil {
		return nil, errors.New("username sudah digunakan")
	}

	role := database.UserRole(req.Role)

	var outletID *uuid.UUID
	if req.OutletID != "" {
		parsed, err := uuid.Parse(req.OutletID)
		if err != nil {
			return nil, errors.New("outlet_id tidak valid")
		}
		outletID = &parsed
	}

	if (role == database.RoleKasir || role == database.RoleManager) && outletID == nil {
		return nil, errors.New("kasir dan manager harus memiliki outlet")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("gagal mengenkripsi password")
	}

	user := database.User{
		ID:       uuid.New(),
		Username: req.Username,
		Password: string(hashedPassword),
		Role:     role,
		OutletID: outletID,
		IsActive: true,
	}
	if err := s.userRepo.Create(&user); err != nil {
		return nil, err
	}

	created, _ := s.userRepo.GetByID(user.ID)
	return toUserItem(created), nil
}

func (s *userService) Update(id string, req *UpdateUserRequest, actorRole string, actorOutletID string) (*UserItem, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(uid)
	if err != nil {
		return nil, errors.New("user tidak ditemukan")
	}

	if actorRole == "manager" {
		if user.Role != database.RoleKasir {
			return nil, errors.New("manager hanya dapat mengedit akun kasir")
		}
		if user.OutletID == nil || actorOutletID == "" || user.OutletID.String() != actorOutletID {
			return nil, errors.New("manager hanya dapat mengedit kasir di outletnya sendiri")
		}
		if req.Role != "kasir" {
			return nil, errors.New("manager tidak dapat mengubah role kasir menjadi manager atau owner")
		}
	}

	if req.Username != "" && req.Username != user.Username {
		if _, err := s.userRepo.GetByUsername(req.Username); err == nil {
			return nil, errors.New("username sudah digunakan")
		}
		user.Username = req.Username
	}

	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, errors.New("gagal mengenkripsi password")
		}
		user.Password = string(hashedPassword)
	}

	var outletID *uuid.UUID
	if req.OutletID != "" {
		parsed, err := uuid.Parse(req.OutletID)
		if err != nil {
			return nil, errors.New("outlet_id tidak valid")
		}
		outletID = &parsed
	}

	role := database.UserRole(req.Role)
	if (role == database.RoleKasir || role == database.RoleManager) && outletID == nil {
		return nil, errors.New("kasir dan manager harus memiliki outlet")
	}

	user.Role = role
	user.OutletID = outletID

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	updated, _ := s.userRepo.GetByID(uid)
	return toUserItem(updated), nil
}

func (s *userService) Deactivate(id string, actorRole string, actorOutletID string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	user, err := s.userRepo.GetByID(uid)
	if err != nil {
		return errors.New("user tidak ditemukan")
	}

	if user.Role == database.RoleOwner {
		return errors.New("tidak dapat menonaktifkan owner")
	}

	if actorRole == "manager" {
		if user.Role != database.RoleKasir {
			return errors.New("manager hanya dapat menonaktifkan akun kasir")
		}
		if user.OutletID == nil || actorOutletID == "" || user.OutletID.String() != actorOutletID {
			return errors.New("manager hanya dapat menonaktifkan kasir di outletnya sendiri")
		}
	}

	return s.userRepo.Deactivate(uid)
}

func (s *userService) Restore(id string, actorRole string, actorOutletID string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	user, err := s.userRepo.GetByID(uid)
	if err != nil {
		return errors.New("user tidak ditemukan")
	}
	if user.IsActive {
		return errors.New("user sudah aktif")
	}
	if actorRole == "manager" {
		if user.Role != database.RoleKasir {
			return errors.New("manager hanya dapat mengaktifkan akun kasir")
		}
		if user.OutletID == nil || actorOutletID == "" || user.OutletID.String() != actorOutletID {
			return errors.New("manager hanya dapat mengaktifkan kasir di outletnya sendiri")
		}
	}
	return s.userRepo.Restore(uid)
}
