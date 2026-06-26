// Package service contains business logic.
package service

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"backend-go/internal/repository"
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
