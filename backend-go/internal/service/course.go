package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"backend-go/internal/repository"
)

type CourseStatus string
type LessonStatus string

const (
	CourseStatusDraft     CourseStatus = "draft"
	CourseStatusBeta      CourseStatus = "beta"
	CourseStatusPublished CourseStatus = "published"

	LessonStatusNotStarted LessonStatus = "not_started"
	LessonStatusInProgress LessonStatus = "in_progress"
	LessonStatusCompleted  LessonStatus = "completed"

	courseListKey   = "courses:list:v1"
	courseDetailTTL = 24 * time.Hour
	courseListTTL   = 24 * time.Hour
)

// LessonSequencePoint is a timestamped in-video bookmark.
type LessonSequencePoint struct {
	ID               string `json:"id"`
	LessonID         string `json:"lesson_id"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	TimestampSeconds int    `json:"timestamp_seconds"`
	SortOrder        int    `json:"sort_order"`
}

// Lesson is a single video lesson in a module.
type Lesson struct {
	ID              string                `json:"id"`
	Title           string                `json:"title"`
	YouTubeEmbedURL string                `json:"youtube_embed_url"`
	DurationSeconds int                   `json:"duration_seconds"`
	SortOrder       int                   `json:"sort_order"`
	LessonSequence  []LessonSequencePoint `json:"lesson_sequence"`
	Status          LessonStatus          `json:"status,omitempty"`
}

// Module groups lessons within a course.
type Module struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	SortOrder int      `json:"sort_order"`
	Lessons   []Lesson `json:"lessons"`
}

// Course is the full static course outline.
type Course struct {
	ID          string       `json:"id"`
	Slug        string       `json:"slug"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Status      CourseStatus `json:"status"`
	SortOrder   int          `json:"sort_order"`
	Progress    int          `json:"progress,omitempty"`
	Modules     []Module     `json:"modules"`
}

// CourseCard is compact catalog list data with aggregate counts.
type CourseCard struct {
	ID              string       `json:"id"`
	Slug            string       `json:"slug"`
	Title           string       `json:"title"`
	Description     string       `json:"description"`
	Status          CourseStatus `json:"status"`
	SortOrder       int          `json:"sort_order"`
	ModuleCount     int          `json:"module_count"`
	LessonCount     int          `json:"lesson_count"`
	DurationSeconds int          `json:"duration_seconds"`
}

// CourseProgress is per-user course completion. Progress is tracked separately from static data.
type CourseProgress struct {
	CourseSlug       string           `json:"course_slug"`
	CompletedLessons int              `json:"completed_lessons"`
	TotalLessons     int              `json:"total_lessons"`
	Percent          int              `json:"percent"`
	Lessons          []LessonProgress `json:"lessons"`
}

// LessonProgress is one user's state for a lesson.
type LessonProgress struct {
	LessonID            string       `json:"lesson_id"`
	Status              LessonStatus `json:"status"`
	LastPositionSeconds *int         `json:"last_position_seconds,omitempty"`
	CompletedAt         *time.Time   `json:"completed_at,omitempty"`
}

// LessonProgressUpdate is the idempotent per-lesson progress payload.
type LessonProgressUpdate struct {
	Status              LessonStatus `json:"status"`
	LastPositionSeconds *int         `json:"last_position_seconds,omitempty"`
}

// CreateCourseInput is the create-course request body.
type CreateCourseInput struct {
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	SortOrder   *int   `json:"sort_order"`
}

// UpdateCourseInput is the partial-update request body. Omitted fields are unchanged.
type UpdateCourseInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	SortOrder   *int    `json:"sort_order"`
}

// CreateModuleInput is the create-module request body.
type CreateModuleInput struct {
	Title     string `json:"title"`
	SortOrder *int   `json:"sort_order"`
}

// SequencePointInput is a single bookmark in create/replace sequence requests.
type SequencePointInput struct {
	Title            string `json:"title"`
	Description      string `json:"description"`
	TimestampSeconds int    `json:"timestamp_seconds"`
	SortOrder        *int   `json:"sort_order"`
}

// CreateLessonInput is the create-lesson request body.
type CreateLessonInput struct {
	Title           string               `json:"title"`
	YouTubeEmbedURL string               `json:"youtube_embed_url"`
	DurationSeconds int                  `json:"duration_seconds"`
	SortOrder       *int                 `json:"sort_order"`
	LessonSequence  []SequencePointInput `json:"lesson_sequence"`
}

// ReplaceSequenceInput is the replace-sequence request body.
type ReplaceSequenceInput struct {
	Points []SequencePointInput `json:"points"`
}

func deref(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

// ListCourses returns the public, draft-excluded catalog cards (cached).
func (s *Service) ListCourses(ctx context.Context) ([]CourseCard, error) {
	if cached, err := s.cache.Get(ctx, courseListKey); err == nil && cached != "" {
		var cards []CourseCard
		if err := json.Unmarshal([]byte(cached), &cards); err == nil {
			return cards, nil
		}
	}
	cards, err := s.loadCourseCards(ctx, false)
	if err != nil {
		return nil, err
	}
	if payload, err := json.Marshal(cards); err == nil {
		_ = s.cache.Set(ctx, courseListKey, string(payload), courseListTTL)
	}
	return cards, nil
}

// ListCoursesAdmin returns all catalog cards including drafts, bypassing the public cache.
func (s *Service) ListCoursesAdmin(ctx context.Context) ([]CourseCard, error) {
	return s.loadCourseCards(ctx, true)
}

func (s *Service) loadCourseCards(ctx context.Context, includeDrafts bool) ([]CourseCard, error) {
	rows, err := s.repo.ListCourseCards(ctx, includeDrafts)
	if err != nil {
		return nil, fmt.Errorf("list course cards: %w", err)
	}
	cards := make([]CourseCard, 0, len(rows))
	for _, row := range rows {
		cards = append(cards, CourseCard{
			ID:              row.ID,
			Slug:            row.Slug,
			Title:           row.Title,
			Description:     row.Description,
			Status:          CourseStatus(row.Status),
			SortOrder:       row.SortOrder,
			ModuleCount:     row.ModuleCount,
			LessonCount:     row.LessonCount,
			DurationSeconds: row.DurationSeconds,
		})
	}
	return cards, nil
}

// GetCourse returns the full static course outline by slug (cached).
func (s *Service) GetCourse(ctx context.Context, slug string) (Course, error) {
	key := courseDetailKey(slug)
	if cached, err := s.cache.Get(ctx, key); err == nil && cached != "" {
		var course Course
		if err := json.Unmarshal([]byte(cached), &course); err == nil {
			return course, nil
		}
	}

	course, err := s.loadCourseDetail(ctx, slug)
	if err != nil {
		return Course{}, err
	}
	if payload, err := json.Marshal(course); err == nil {
		_ = s.cache.Set(ctx, key, string(payload), courseDetailTTL)
	}
	return course, nil
}

func (s *Service) loadCourseDetail(ctx context.Context, slug string) (Course, error) {
	row, err := s.repo.GetCourseBySlug(ctx, slug)
	if errors.Is(err, repository.ErrNotFound) {
		return Course{}, ErrNotFound
	}
	if err != nil {
		return Course{}, fmt.Errorf("get course: %w", err)
	}

	modules, err := s.repo.ListModulesByCourse(ctx, row.ID)
	if err != nil {
		return Course{}, fmt.Errorf("list modules: %w", err)
	}
	lessons, err := s.repo.ListLessonsByCourse(ctx, row.ID)
	if err != nil {
		return Course{}, fmt.Errorf("list lessons: %w", err)
	}
	points, err := s.repo.ListSequenceByCourse(ctx, row.ID)
	if err != nil {
		return Course{}, fmt.Errorf("list sequence: %w", err)
	}

	pointsByLesson := make(map[string][]LessonSequencePoint, len(points))
	for _, p := range points {
		pointsByLesson[p.LessonID] = append(pointsByLesson[p.LessonID], LessonSequencePoint{
			ID:               p.ID,
			LessonID:         p.LessonID,
			Title:            p.Title,
			Description:      p.Description,
			TimestampSeconds: p.TimestampSeconds,
			SortOrder:        p.SortOrder,
		})
	}

	lessonsByModule := make(map[string][]Lesson, len(lessons))
	for _, l := range lessons {
		lessonsByModule[l.ModuleID] = append(lessonsByModule[l.ModuleID], Lesson{
			ID:              l.ID,
			Title:           l.Title,
			YouTubeEmbedURL: l.YouTubeEmbedURL,
			DurationSeconds: l.DurationSeconds,
			SortOrder:       l.SortOrder,
			LessonSequence:  emptyIfNil(pointsByLesson[l.ID]),
		})
	}

	assembled := make([]Module, 0, len(modules))
	for _, m := range modules {
		assembled = append(assembled, Module{
			ID:        m.ID,
			Title:     m.Title,
			SortOrder: m.SortOrder,
			Lessons:   emptyLessonsIfNil(lessonsByModule[m.ID]),
		})
	}

	return Course{
		ID:          row.ID,
		Slug:        row.Slug,
		Title:       row.Title,
		Description: row.Description,
		Status:      CourseStatus(row.Status),
		SortOrder:   row.SortOrder,
		Modules:     assembled,
	}, nil
}

// GetCourseProgress returns per-user progress without using the global static course cache.
func (s *Service) GetCourseProgress(ctx context.Context, userID, slug string) (CourseProgress, error) {
	if strings.TrimSpace(userID) == "" {
		return CourseProgress{}, invalid("user id is required")
	}
	row, err := s.repo.GetCourseBySlug(ctx, slug)
	if errors.Is(err, repository.ErrNotFound) {
		return CourseProgress{}, ErrNotFound
	}
	if err != nil {
		return CourseProgress{}, fmt.Errorf("get course: %w", err)
	}

	rows, err := s.repo.ListLessonProgressByCourse(ctx, row.ID, userID)
	if err != nil {
		return CourseProgress{}, fmt.Errorf("list progress: %w", err)
	}
	lessons := make([]LessonProgress, 0, len(rows))
	completed := 0
	for _, row := range rows {
		status := LessonStatus(row.Status)
		if status == LessonStatusCompleted {
			completed++
		}
		lessons = append(lessons, LessonProgress{
			LessonID:            row.LessonID,
			Status:              status,
			LastPositionSeconds: row.LastPositionSeconds,
			CompletedAt:         row.CompletedAt,
		})
	}
	total := len(rows)
	percent := 0
	if total > 0 {
		percent = (completed * 100) / total
	}
	return CourseProgress{CourseSlug: slug, CompletedLessons: completed, TotalLessons: total, Percent: percent, Lessons: lessons}, nil
}

// UpdateLessonProgress idempotently persists one user's progress for a lesson.
func (s *Service) UpdateLessonProgress(ctx context.Context, userID, lessonID string, update LessonProgressUpdate) (LessonProgress, error) {
	if strings.TrimSpace(userID) == "" {
		return LessonProgress{}, invalid("user id is required")
	}
	if lessonID == "" {
		return LessonProgress{}, invalid("lesson id is required")
	}
	if update.Status == "" {
		update.Status = LessonStatusCompleted
	}
	if !isValidLessonStatus(update.Status) {
		return LessonProgress{}, invalid("invalid lesson status")
	}
	if update.LastPositionSeconds != nil && *update.LastPositionSeconds < 0 {
		return LessonProgress{}, invalid("last_position_seconds must be non-negative")
	}
	if _, err := s.repo.GetLessonByID(ctx, lessonID); errors.Is(err, repository.ErrNotFound) {
		return LessonProgress{}, ErrNotFound
	} else if err != nil {
		return LessonProgress{}, fmt.Errorf("get lesson: %w", err)
	}
	row, err := s.repo.UpsertLessonProgress(ctx, repository.UpsertLessonProgressParams{
		UserID: userID, LessonID: lessonID, Status: string(update.Status), LastPositionSeconds: update.LastPositionSeconds,
	})
	if err != nil {
		return LessonProgress{}, fmt.Errorf("upsert lesson progress: %w", err)
	}
	return LessonProgress{LessonID: row.LessonID, Status: LessonStatus(row.Status), LastPositionSeconds: row.LastPositionSeconds, CompletedAt: row.CompletedAt}, nil
}

// CreateCourse validates and persists a new course, then invalidates the public list cache.
func (s *Service) CreateCourse(ctx context.Context, in CreateCourseInput) (CourseCard, error) {
	if err := validateSlug(in.Slug); err != nil {
		return CourseCard{}, err
	}
	if err := validateTitle(in.Title); err != nil {
		return CourseCard{}, err
	}
	if in.Description == "" {
		return CourseCard{}, invalid("description is required")
	}
	if err := validateStatus(in.Status); err != nil {
		return CourseCard{}, err
	}

	row, err := s.repo.CreateCourse(ctx, repository.CreateCourseParams{
		Slug:        in.Slug,
		Title:       in.Title,
		Description: in.Description,
		Status:      in.Status,
		SortOrder:   deref(in.SortOrder),
	})
	if errors.Is(err, repository.ErrUniqueViolation) {
		return CourseCard{}, ErrConflict
	}
	if err != nil {
		return CourseCard{}, fmt.Errorf("create course: %w", err)
	}

	s.invalidateList(ctx)
	return CourseCard{
		ID: row.ID, Slug: row.Slug, Title: row.Title, Description: row.Description,
		Status: CourseStatus(row.Status), SortOrder: row.SortOrder,
	}, nil
}

// UpdateCourse applies a partial update and invalidates the list and detail caches.
func (s *Service) UpdateCourse(ctx context.Context, id string, in UpdateCourseInput) (CourseCard, error) {
	if in.Title != nil {
		if err := validateTitle(*in.Title); err != nil {
			return CourseCard{}, err
		}
	}
	if in.Description != nil && *in.Description == "" {
		return CourseCard{}, invalid("description cannot be empty")
	}
	if in.Status != nil {
		if err := validateStatus(*in.Status); err != nil {
			return CourseCard{}, err
		}
	}

	row, err := s.repo.UpdateCourse(ctx, id, repository.UpdateCourseParams{
		Title: in.Title, Description: in.Description, Status: in.Status, SortOrder: in.SortOrder,
	})
	if errors.Is(err, repository.ErrNotFound) {
		return CourseCard{}, ErrNotFound
	}
	if err != nil {
		return CourseCard{}, fmt.Errorf("update course: %w", err)
	}

	s.invalidateList(ctx)
	s.invalidateDetail(ctx, row.Slug)
	return CourseCard{
		ID: row.ID, Slug: row.Slug, Title: row.Title, Description: row.Description,
		Status: CourseStatus(row.Status), SortOrder: row.SortOrder,
	}, nil
}

// DeleteCourse deletes a course and invalidates list/detail caches. Child catalog records cascade in the database.
func (s *Service) DeleteCourse(ctx context.Context, id string) error {
	course, err := s.repo.GetCourseByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("get course: %w", err)
	}
	if err := s.repo.DeleteCourse(ctx, id); errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("delete course: %w", err)
	}
	s.invalidateList(ctx)
	s.invalidateDetail(ctx, course.Slug)
	return nil
}

// DeleteModule deletes a module and invalidates parent course caches. Lessons/bookmarks cascade in the database.
func (s *Service) DeleteModule(ctx context.Context, id string) error {
	slug, err := s.repo.CourseSlugByModuleID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("resolve module: %w", err)
	}
	if err := s.repo.DeleteModule(ctx, id); errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("delete module: %w", err)
	}
	s.invalidateList(ctx)
	s.invalidateDetail(ctx, slug)
	return nil
}

// DeleteLesson deletes a lesson and invalidates parent course caches. Bookmarks cascade in the database.
func (s *Service) DeleteLesson(ctx context.Context, id string) error {
	slug, err := s.repo.CourseSlugByLessonID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("resolve lesson: %w", err)
	}
	if err := s.repo.DeleteLesson(ctx, id); errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("delete lesson: %w", err)
	}
	s.invalidateList(ctx)
	s.invalidateDetail(ctx, slug)
	return nil
}

// DeleteSequencePoint deletes one bookmark and invalidates the parent course detail cache.
func (s *Service) DeleteSequencePoint(ctx context.Context, id string) error {
	slug, err := s.repo.CourseSlugBySequencePointID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("resolve sequence point: %w", err)
	}
	if err := s.repo.DeleteSequencePoint(ctx, id); errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("delete sequence point: %w", err)
	}
	s.invalidateDetail(ctx, slug)
	return nil
}

// CreateModule validates the parent course, persists a module, and invalidates caches.
func (s *Service) CreateModule(ctx context.Context, courseID string, in CreateModuleInput) (Module, error) {
	if err := validateTitle(in.Title); err != nil {
		return Module{}, err
	}
	course, err := s.repo.GetCourseByID(ctx, courseID)
	if errors.Is(err, repository.ErrNotFound) {
		return Module{}, ErrNotFound
	}
	if err != nil {
		return Module{}, fmt.Errorf("get course: %w", err)
	}

	row, err := s.repo.CreateModule(ctx, repository.CreateModuleParams{
		CourseID: courseID, Title: in.Title, SortOrder: deref(in.SortOrder),
	})
	if err != nil {
		return Module{}, fmt.Errorf("create module: %w", err)
	}

	s.invalidateList(ctx)
	s.invalidateDetail(ctx, course.Slug)
	return Module{ID: row.ID, Title: row.Title, SortOrder: row.SortOrder, Lessons: []Lesson{}}, nil
}

// CreateLesson validates the YouTube URL and sequence, persists the lesson, and invalidates caches.
func (s *Service) CreateLesson(ctx context.Context, moduleID string, in CreateLessonInput) (Lesson, error) {
	if err := validateTitle(in.Title); err != nil {
		return Lesson{}, err
	}
	if in.DurationSeconds <= 0 {
		return Lesson{}, invalid("duration_seconds must be positive")
	}
	embedURL, err := normalizeYouTubeEmbedURL(in.YouTubeEmbedURL)
	if err != nil {
		return Lesson{}, err
	}
	points, err := toSequenceParams(in.LessonSequence, in.DurationSeconds)
	if err != nil {
		return Lesson{}, err
	}

	slug, err := s.repo.CourseSlugByModuleID(ctx, moduleID)
	if errors.Is(err, repository.ErrNotFound) {
		return Lesson{}, ErrNotFound
	}
	if err != nil {
		return Lesson{}, fmt.Errorf("resolve module: %w", err)
	}

	lessonRow, savedPoints, err := s.repo.CreateLesson(ctx, repository.CreateLessonParams{
		ModuleID:        moduleID,
		Title:           in.Title,
		YouTubeEmbedURL: embedURL,
		DurationSeconds: in.DurationSeconds,
		SortOrder:       deref(in.SortOrder),
	}, points)
	if err != nil {
		return Lesson{}, fmt.Errorf("create lesson: %w", err)
	}

	s.invalidateList(ctx)
	s.invalidateDetail(ctx, slug)
	return Lesson{
		ID:              lessonRow.ID,
		Title:           lessonRow.Title,
		YouTubeEmbedURL: lessonRow.YouTubeEmbedURL,
		DurationSeconds: lessonRow.DurationSeconds,
		SortOrder:       lessonRow.SortOrder,
		LessonSequence:  toSequencePoints(savedPoints),
	}, nil
}

// ReplaceLessonSequence replaces all bookmarks for a lesson and invalidates the detail cache.
func (s *Service) ReplaceLessonSequence(ctx context.Context, lessonID string, in ReplaceSequenceInput) ([]LessonSequencePoint, error) {
	lesson, err := s.repo.GetLessonByID(ctx, lessonID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get lesson: %w", err)
	}
	points, err := toSequenceParams(in.Points, lesson.DurationSeconds)
	if err != nil {
		return nil, err
	}

	slug, err := s.repo.CourseSlugByLessonID(ctx, lessonID)
	if err != nil {
		return nil, fmt.Errorf("resolve lesson: %w", err)
	}

	saved, err := s.repo.ReplaceLessonSequence(ctx, lessonID, points)
	if err != nil {
		return nil, fmt.Errorf("replace sequence: %w", err)
	}

	s.invalidateDetail(ctx, slug)
	return toSequencePoints(saved), nil
}

func toSequenceParams(in []SequencePointInput, durationSeconds int) ([]repository.SequencePointParams, error) {
	params := make([]repository.SequencePointParams, 0, len(in))
	for i, p := range in {
		if err := validateSequencePoint(p.Title, p.TimestampSeconds, durationSeconds); err != nil {
			return nil, err
		}
		sortOrder := i + 1
		if p.SortOrder != nil {
			sortOrder = *p.SortOrder
		}
		params = append(params, repository.SequencePointParams{
			Title:            p.Title,
			Description:      p.Description,
			TimestampSeconds: p.TimestampSeconds,
			SortOrder:        sortOrder,
		})
	}
	return params, nil
}

func toSequencePoints(rows []repository.LessonSequencePointRow) []LessonSequencePoint {
	points := make([]LessonSequencePoint, 0, len(rows))
	for _, r := range rows {
		points = append(points, LessonSequencePoint{
			ID:               r.ID,
			LessonID:         r.LessonID,
			Title:            r.Title,
			Description:      r.Description,
			TimestampSeconds: r.TimestampSeconds,
			SortOrder:        r.SortOrder,
		})
	}
	return points
}

func emptyIfNil(points []LessonSequencePoint) []LessonSequencePoint {
	if points == nil {
		return []LessonSequencePoint{}
	}
	return points
}

func emptyLessonsIfNil(lessons []Lesson) []Lesson {
	if lessons == nil {
		return []Lesson{}
	}
	return lessons
}

func courseDetailKey(slug string) string { return fmt.Sprintf("courses:detail:%s:v1", slug) }

func (s *Service) invalidateList(ctx context.Context) { _ = s.cache.Delete(ctx, courseListKey) }

func (s *Service) invalidateDetail(ctx context.Context, slug string) {
	_ = s.cache.Delete(ctx, courseDetailKey(slug))
}
