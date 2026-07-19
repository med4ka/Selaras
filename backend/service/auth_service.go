package service

import (
	"errors"
	"time"

	"selaras/backend/config"
	"selaras/backend/repository"

	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" validate:"required,min=3"`
	Password string `json:"password" validate:"required,min=6"`
}

type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	OutletID string `json:"outlet_id,omitempty"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type AuthService interface {
	Login(req *LoginRequest) (*LoginResponse, error)
	GetProfile(userID string) (*UserResponse, error)
}

type authService struct {
	userRepo  repository.UserRepository
	cfg       *config.Config
	validate  *validator.Validate
}

func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{
		userRepo: userRepo,
		cfg:      cfg,
		validate: validator.New(),
	}
}

func (s *authService) Login(req *LoginRequest) (*LoginResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if !user.IsActive {
		return nil, errors.New("akun ini telah dinonaktifkan")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	var outletIDStr string
	if user.OutletID != nil {
		outletIDStr = user.OutletID.String()
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   user.ID.String(),
		"role":      string(user.Role),
		"outlet_id": outletIDStr,
		"exp":       time.Now().Add(s.cfg.JWTExpiry).Unix(),
		"iat":       time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token: tokenString,
		User: UserResponse{
			ID:       user.ID.String(),
			Username: user.Username,
			Role:     string(user.Role),
			OutletID: outletIDStr,
		},
	}, nil
}

func (s *authService) GetProfile(userID string) (*UserResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(uid)
	if err != nil {
		return nil, errors.New("user not found")
	}

	var outletIDStr string
	if user.OutletID != nil {
		outletIDStr = user.OutletID.String()
	}

	return &UserResponse{
		ID:       user.ID.String(),
		Username: user.Username,
		Role:     string(user.Role),
		OutletID: outletIDStr,
	}, nil
}
