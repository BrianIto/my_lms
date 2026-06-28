// Package repository contains database query types and repository wrappers.
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrUniqueViolation is returned when an insert violates a unique constraint.
var ErrUniqueViolation = errors.New("unique constraint violation")

// ErrNotFound is returned when a queried row does not exist.
var ErrNotFound = errors.New("row not found")

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

	CreateCourse(context.Context, CreateCourseParams) (CourseRow, error)
	UpdateCourse(context.Context, string, UpdateCourseParams) (CourseRow, error)
	DeleteCourse(context.Context, string) error
	DeleteModule(context.Context, string) error
	DeleteLesson(context.Context, string) error
	DeleteSequencePoint(context.Context, string) error
	ListCourseCards(ctx context.Context, includeDrafts bool) ([]CourseCardRow, error)
	GetCourseBySlug(context.Context, string) (CourseRow, error)
	GetCourseByID(context.Context, string) (CourseRow, error)
	ListModulesByCourse(context.Context, string) ([]ModuleRow, error)
	ListLessonsByCourse(context.Context, string) ([]LessonRow, error)
	ListSequenceByCourse(context.Context, string) ([]LessonSequencePointRow, error)
	CreateModule(context.Context, CreateModuleParams) (ModuleRow, error)
	CreateLesson(context.Context, CreateLessonParams, []SequencePointParams) (LessonRow, []LessonSequencePointRow, error)
	ReplaceLessonSequence(context.Context, string, []SequencePointParams) ([]LessonSequencePointRow, error)
	GetLessonByID(context.Context, string) (LessonRow, error)
	ListLessonProgressByCourse(context.Context, string, string) ([]LessonProgressRow, error)
	UpsertLessonProgress(context.Context, UpsertLessonProgressParams) (LessonProgressRow, error)
	CourseSlugByModuleID(context.Context, string) (string, error)
	CourseSlugByLessonID(context.Context, string) (string, error)
	CourseSlugBySequencePointID(context.Context, string) (string, error)
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
