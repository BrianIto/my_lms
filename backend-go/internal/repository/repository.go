// Package repository contains database query types and repository wrappers.
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BetaAccessRequest is a public beta request row.
type BetaAccessRequest struct {
	ID        pgtype.UUID `json:"id"`
	Email     string      `json:"email"`
	Status    string      `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// Querier defines sqlc-like database operations.
type Querier interface {
	CreateBetaAccessRequest(context.Context, string) (BetaAccessRequest, error)
}

// Queries implements Querier.
type Queries struct{ db *pgxpool.Pool }

// New creates Queries.
func New(db *pgxpool.Pool) *Queries { return &Queries{db: db} }

// CreateBetaAccessRequest inserts or refreshes a public beta access request.
func (q *Queries) CreateBetaAccessRequest(ctx context.Context, email string) (BetaAccessRequest, error) {
	var request BetaAccessRequest
	err := q.db.QueryRow(ctx, `
		INSERT INTO beta_access_requests (email)
		VALUES ($1)
		ON CONFLICT (email) DO UPDATE SET updated_at = now()
		RETURNING id,email,status,created_at,updated_at
	`, email).Scan(&request.ID, &request.Email, &request.Status, &request.CreatedAt, &request.UpdatedAt)
	if err != nil {
		return BetaAccessRequest{}, fmt.Errorf("create beta access request: %w", err)
	}
	return request, nil
}
