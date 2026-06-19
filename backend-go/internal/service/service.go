// Package service contains business logic.
package service

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"backend-go/internal/repository"
	"github.com/jackc/pgx/v5/pgtype"
)

// Cache defines cache operations used by Service.
type Cache interface {
	Get(context.Context, string) (string, error)
	Set(context.Context, string, string, time.Duration) error
	Delete(context.Context, string) error
	Publish(context.Context, string, string) error
}

// Service contains application use cases.
type Service struct {
	repo  repository.Querier
	cache Cache
}

// New creates a Service.
func New(repo repository.Querier, cache Cache) *Service { return &Service{repo: repo, cache: cache} }

// RequestBetaAccess validates and records a public beta access request.
func (s *Service) RequestBetaAccess(ctx context.Context, email string) (repository.BetaAccessRequest, error) {
	normalizedEmail, err := NormalizeEmail(email)
	if err != nil {
		return repository.BetaAccessRequest{}, err
	}

	request, err := s.repo.CreateBetaAccessRequest(ctx, normalizedEmail)
	if err != nil {
		return repository.BetaAccessRequest{}, fmt.Errorf("service request beta access: %w", err)
	}
	return request, nil
}

// NormalizeEmail trims, parses, and lowercases an email address.
func NormalizeEmail(email string) (string, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	address, err := mail.ParseAddress(normalizedEmail)
	if err != nil || address.Address != normalizedEmail {
		return "", fmt.Errorf("invalid email")
	}
	return normalizedEmail, nil
}

// CreateUser creates a user.
func (s *Service) CreateUser(ctx context.Context, email string) (repository.User, error) {
	u, err := s.repo.CreateUser(ctx, email)
	if err != nil {
		return repository.User{}, fmt.Errorf("service create user: %w", err)
	}
	return u, nil
}

// ListUsers lists users.
func (s *Service) ListUsers(ctx context.Context, limit, offset int32) ([]repository.User, error) {
	users, err := s.repo.ListUsers(ctx, repository.ListUsersParams{Limit: limit, Offset: offset})
	if err != nil {
		return nil, fmt.Errorf("service list users: %w", err)
	}
	return users, nil
}

// GetUserByID returns a user by UUID.
func (s *Service) GetUserByID(ctx context.Context, id pgtype.UUID) (repository.User, error) {
	u, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return repository.User{}, fmt.Errorf("service get user by id: %w", err)
	}
	return u, nil
}
