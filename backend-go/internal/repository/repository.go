// Package repository contains database query types and repository wrappers.
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User is a persisted user row.
type User struct {
	ID        pgtype.UUID `json:"id"`
	Email     string      `json:"email"`
	CreatedAt time.Time   `json:"created_at"`
}

// BetaAccessRequest is a public beta request row.
type BetaAccessRequest struct {
	ID        pgtype.UUID `json:"id"`
	Email     string      `json:"email"`
	Status    string      `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// CreateUserParams contains user creation fields.
type CreateUserParams struct {
	Email string `json:"email"`
}

// ListUsersParams contains list pagination.
type ListUsersParams struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

// Querier defines sqlc-like database operations.
type Querier interface {
	GetUserByID(context.Context, pgtype.UUID) (User, error)
	GetUserByEmail(context.Context, string) (User, error)
	CreateUser(context.Context, string) (User, error)
	ListUsers(context.Context, ListUsersParams) ([]User, error)
	CreateBetaAccessRequest(context.Context, string) (BetaAccessRequest, error)
}

// Queries implements Querier.
type Queries struct{ db *pgxpool.Pool }

// New creates Queries.
func New(db *pgxpool.Pool) *Queries { return &Queries{db: db} }

// GetUserByID fetches a user by id.
func (q *Queries) GetUserByID(ctx context.Context, id pgtype.UUID) (User, error) {
	var u User
	err := q.db.QueryRow(ctx, `SELECT id, email, created_at FROM users WHERE id=$1`, id).Scan(&u.ID, &u.Email, &u.CreatedAt)
	if err != nil {
		return User{}, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

// GetUserByEmail fetches a user by email.
func (q *Queries) GetUserByEmail(ctx context.Context, email string) (User, error) {
	var u User
	err := q.db.QueryRow(ctx, `SELECT id, email, created_at FROM users WHERE email=$1`, email).Scan(&u.ID, &u.Email, &u.CreatedAt)
	if err != nil {
		return User{}, fmt.Errorf("get user by email: %w", err)
	}
	return u, nil
}

// CreateUser inserts a user.
func (q *Queries) CreateUser(ctx context.Context, email string) (User, error) {
	var u User
	err := q.db.QueryRow(ctx, `INSERT INTO users (email) VALUES ($1) RETURNING id,email,created_at`, email).Scan(&u.ID, &u.Email, &u.CreatedAt)
	if err != nil {
		return User{}, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

// ListUsers lists users.
func (q *Queries) ListUsers(ctx context.Context, p ListUsersParams) ([]User, error) {
	rows, err := q.db.Query(ctx, `SELECT id,email,created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`, p.Limit, p.Offset)
	if err != nil {
		return nil, fmt.Errorf("list users query: %w", err)
	}
	defer rows.Close()
	users := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return users, nil
}

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
