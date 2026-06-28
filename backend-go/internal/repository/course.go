package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// CourseRow is a course record.
type CourseRow struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	SortOrder   int    `json:"sort_order"`
}

// CourseCardRow is a course record with aggregate counts for catalog cards.
type CourseCardRow struct {
	CourseRow
	ModuleCount     int `json:"module_count"`
	LessonCount     int `json:"lesson_count"`
	DurationSeconds int `json:"duration_seconds"`
}

// ModuleRow is a module record.
type ModuleRow struct {
	ID        string `json:"id"`
	CourseID  string `json:"course_id"`
	Title     string `json:"title"`
	SortOrder int    `json:"sort_order"`
}

// LessonRow is a lesson record.
type LessonRow struct {
	ID              string `json:"id"`
	ModuleID        string `json:"module_id"`
	Title           string `json:"title"`
	YouTubeEmbedURL string `json:"youtube_embed_url"`
	DurationSeconds int    `json:"duration_seconds"`
	SortOrder       int    `json:"sort_order"`
}

// LessonSequencePointRow is a timestamped lesson bookmark.
type LessonSequencePointRow struct {
	ID               string `json:"id"`
	LessonID         string `json:"lesson_id"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	TimestampSeconds int    `json:"timestamp_seconds"`
	SortOrder        int    `json:"sort_order"`
}

// LessonProgressRow is a persisted per-user lesson progress record, joined against course lessons when reading progress.
type LessonProgressRow struct {
	LessonID            string     `json:"lesson_id"`
	Status              string     `json:"status"`
	LastPositionSeconds *int       `json:"last_position_seconds,omitempty"`
	CompletedAt         *time.Time `json:"completed_at,omitempty"`
}

// CreateCourseParams holds inputs for creating a course.
type CreateCourseParams struct {
	Slug        string
	Title       string
	Description string
	Status      string
	SortOrder   int
}

// UpdateCourseParams holds optional partial updates for a course. Nil fields are left unchanged.
type UpdateCourseParams struct {
	Title       *string
	Description *string
	Status      *string
	SortOrder   *int
}

// CreateModuleParams holds inputs for creating a module.
type CreateModuleParams struct {
	CourseID  string
	Title     string
	SortOrder int
}

// CreateLessonParams holds inputs for creating a lesson.
type CreateLessonParams struct {
	ModuleID        string
	Title           string
	YouTubeEmbedURL string
	DurationSeconds int
	SortOrder       int
}

// SequencePointParams holds inputs for a single lesson sequence point.
type SequencePointParams struct {
	Title            string
	Description      string
	TimestampSeconds int
	SortOrder        int
}

// UpsertLessonProgressParams holds inputs for an idempotent progress write.
type UpsertLessonProgressParams struct {
	UserID              string
	LessonID            string
	Status              string
	LastPositionSeconds *int
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// CreateCourse inserts a course and returns the created row.
func (q *Queries) CreateCourse(ctx context.Context, params CreateCourseParams) (CourseRow, error) {
	var course CourseRow
	err := q.db.QueryRow(ctx, `
		INSERT INTO courses (slug, title, description, status, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, slug, title, description, status, sort_order
	`, params.Slug, params.Title, params.Description, params.Status, params.SortOrder).
		Scan(&course.ID, &course.Slug, &course.Title, &course.Description, &course.Status, &course.SortOrder)
	if err != nil {
		if isUniqueViolation(err) {
			return CourseRow{}, ErrUniqueViolation
		}
		return CourseRow{}, fmt.Errorf("create course: %w", err)
	}
	return course, nil
}

// UpdateCourse applies a partial update to a course and returns the updated row.
func (q *Queries) UpdateCourse(ctx context.Context, id string, params UpdateCourseParams) (CourseRow, error) {
	var course CourseRow
	err := q.db.QueryRow(ctx, `
		UPDATE courses SET
			title = COALESCE($2, title),
			description = COALESCE($3, description),
			status = COALESCE($4, status),
			sort_order = COALESCE($5, sort_order)
		WHERE id = $1::uuid
		RETURNING id::text, slug, title, description, status, sort_order
	`, id, params.Title, params.Description, params.Status, params.SortOrder).
		Scan(&course.ID, &course.Slug, &course.Title, &course.Description, &course.Status, &course.SortOrder)
	if errors.Is(err, pgx.ErrNoRows) {
		return CourseRow{}, ErrNotFound
	}
	if err != nil {
		return CourseRow{}, fmt.Errorf("update course: %w", err)
	}
	return course, nil
}

// DeleteCourse deletes a course. Modules, lessons, and sequence points cascade in the database.
func (q *Queries) DeleteCourse(ctx context.Context, id string) error {
	return q.deleteByID(ctx, `DELETE FROM courses WHERE id = $1::uuid`, id, "delete course")
}

// DeleteModule deletes a module. Lessons and sequence points cascade in the database.
func (q *Queries) DeleteModule(ctx context.Context, id string) error {
	return q.deleteByID(ctx, `DELETE FROM modules WHERE id = $1::uuid`, id, "delete module")
}

// DeleteLesson deletes a lesson. Sequence points cascade in the database.
func (q *Queries) DeleteLesson(ctx context.Context, id string) error {
	return q.deleteByID(ctx, `DELETE FROM lessons WHERE id = $1::uuid`, id, "delete lesson")
}

// DeleteSequencePoint deletes one timestamped lesson bookmark.
func (q *Queries) DeleteSequencePoint(ctx context.Context, id string) error {
	return q.deleteByID(ctx, `DELETE FROM lesson_sequence_points WHERE id = $1::uuid`, id, "delete sequence point")
}

func (q *Queries) deleteByID(ctx context.Context, query, id, op string) error {
	tag, err := q.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListCourseCards returns catalog cards ordered by sort_order. Drafts are excluded unless includeDrafts is true.
func (q *Queries) ListCourseCards(ctx context.Context, includeDrafts bool) ([]CourseCardRow, error) {
	rows, err := q.db.Query(ctx, `
		SELECT c.id::text, c.slug, c.title, c.description, c.status, c.sort_order,
			COUNT(DISTINCT m.id) AS module_count,
			COUNT(l.id) AS lesson_count,
			COALESCE(SUM(l.duration_seconds), 0) AS duration_seconds
		FROM courses c
		LEFT JOIN modules m ON m.course_id = c.id
		LEFT JOIN lessons l ON l.module_id = m.id
		WHERE ($1::bool OR c.status <> 'draft')
		GROUP BY c.id
		ORDER BY c.sort_order, c.created_at
	`, includeDrafts)
	if err != nil {
		return nil, fmt.Errorf("list course cards: %w", err)
	}
	defer rows.Close()

	var cards []CourseCardRow
	for rows.Next() {
		var card CourseCardRow
		if err := rows.Scan(&card.ID, &card.Slug, &card.Title, &card.Description, &card.Status, &card.SortOrder,
			&card.ModuleCount, &card.LessonCount, &card.DurationSeconds); err != nil {
			return nil, fmt.Errorf("scan course card: %w", err)
		}
		cards = append(cards, card)
	}
	return cards, rows.Err()
}

// GetCourseBySlug returns a course by slug.
func (q *Queries) GetCourseBySlug(ctx context.Context, slug string) (CourseRow, error) {
	return q.getCourse(ctx, `WHERE slug = $1`, slug)
}

// GetCourseByID returns a course by id.
func (q *Queries) GetCourseByID(ctx context.Context, id string) (CourseRow, error) {
	return q.getCourse(ctx, `WHERE id = $1::uuid`, id)
}

func (q *Queries) getCourse(ctx context.Context, where, arg string) (CourseRow, error) {
	var course CourseRow
	err := q.db.QueryRow(ctx, `
		SELECT id::text, slug, title, description, status, sort_order FROM courses `+where,
		arg).Scan(&course.ID, &course.Slug, &course.Title, &course.Description, &course.Status, &course.SortOrder)
	if errors.Is(err, pgx.ErrNoRows) {
		return CourseRow{}, ErrNotFound
	}
	if err != nil {
		return CourseRow{}, fmt.Errorf("get course: %w", err)
	}
	return course, nil
}

// ListModulesByCourse returns modules for a course ordered by sort_order.
func (q *Queries) ListModulesByCourse(ctx context.Context, courseID string) ([]ModuleRow, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, course_id::text, title, sort_order
		FROM modules WHERE course_id = $1::uuid
		ORDER BY sort_order, created_at
	`, courseID)
	if err != nil {
		return nil, fmt.Errorf("list modules: %w", err)
	}
	defer rows.Close()

	var modules []ModuleRow
	for rows.Next() {
		var m ModuleRow
		if err := rows.Scan(&m.ID, &m.CourseID, &m.Title, &m.SortOrder); err != nil {
			return nil, fmt.Errorf("scan module: %w", err)
		}
		modules = append(modules, m)
	}
	return modules, rows.Err()
}

// ListLessonsByCourse returns all lessons for a course ordered by module then sort_order.
func (q *Queries) ListLessonsByCourse(ctx context.Context, courseID string) ([]LessonRow, error) {
	rows, err := q.db.Query(ctx, `
		SELECT l.id::text, l.module_id::text, l.title, l.youtube_embed_url, l.duration_seconds, l.sort_order
		FROM lessons l
		JOIN modules m ON m.id = l.module_id
		WHERE m.course_id = $1::uuid
		ORDER BY m.sort_order, l.sort_order, l.created_at
	`, courseID)
	if err != nil {
		return nil, fmt.Errorf("list lessons: %w", err)
	}
	defer rows.Close()

	var lessons []LessonRow
	for rows.Next() {
		var l LessonRow
		if err := rows.Scan(&l.ID, &l.ModuleID, &l.Title, &l.YouTubeEmbedURL, &l.DurationSeconds, &l.SortOrder); err != nil {
			return nil, fmt.Errorf("scan lesson: %w", err)
		}
		lessons = append(lessons, l)
	}
	return lessons, rows.Err()
}

// ListSequenceByCourse returns all sequence points for a course's lessons.
func (q *Queries) ListSequenceByCourse(ctx context.Context, courseID string) ([]LessonSequencePointRow, error) {
	rows, err := q.db.Query(ctx, `
		SELECT sp.id::text, sp.lesson_id::text, sp.title, sp.description, sp.timestamp_seconds, sp.sort_order
		FROM lesson_sequence_points sp
		JOIN lessons l ON l.id = sp.lesson_id
		JOIN modules m ON m.id = l.module_id
		WHERE m.course_id = $1::uuid
		ORDER BY sp.sort_order, sp.timestamp_seconds
	`, courseID)
	if err != nil {
		return nil, fmt.Errorf("list sequence: %w", err)
	}
	defer rows.Close()

	var points []LessonSequencePointRow
	for rows.Next() {
		var p LessonSequencePointRow
		if err := rows.Scan(&p.ID, &p.LessonID, &p.Title, &p.Description, &p.TimestampSeconds, &p.SortOrder); err != nil {
			return nil, fmt.Errorf("scan sequence point: %w", err)
		}
		points = append(points, p)
	}
	return points, rows.Err()
}

// CreateModule inserts a module after verifying the parent course exists.
func (q *Queries) CreateModule(ctx context.Context, params CreateModuleParams) (ModuleRow, error) {
	var m ModuleRow
	err := q.db.QueryRow(ctx, `
		INSERT INTO modules (course_id, title, sort_order)
		VALUES ($1::uuid, $2, $3)
		RETURNING id::text, course_id::text, title, sort_order
	`, params.CourseID, params.Title, params.SortOrder).
		Scan(&m.ID, &m.CourseID, &m.Title, &m.SortOrder)
	if err != nil {
		return ModuleRow{}, fmt.Errorf("create module: %w", err)
	}
	return m, nil
}

// CreateLesson inserts a lesson and its optional sequence points in one transaction.
func (q *Queries) CreateLesson(ctx context.Context, params CreateLessonParams, points []SequencePointParams) (LessonRow, []LessonSequencePointRow, error) {
	tx, err := q.db.Begin(ctx)
	if err != nil {
		return LessonRow{}, nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var lesson LessonRow
	err = tx.QueryRow(ctx, `
		INSERT INTO lessons (module_id, title, youtube_embed_url, duration_seconds, sort_order)
		VALUES ($1::uuid, $2, $3, $4, $5)
		RETURNING id::text, module_id::text, title, youtube_embed_url, duration_seconds, sort_order
	`, params.ModuleID, params.Title, params.YouTubeEmbedURL, params.DurationSeconds, params.SortOrder).
		Scan(&lesson.ID, &lesson.ModuleID, &lesson.Title, &lesson.YouTubeEmbedURL, &lesson.DurationSeconds, &lesson.SortOrder)
	if err != nil {
		return LessonRow{}, nil, fmt.Errorf("insert lesson: %w", err)
	}

	saved, err := insertSequencePoints(ctx, tx, lesson.ID, points)
	if err != nil {
		return LessonRow{}, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return LessonRow{}, nil, fmt.Errorf("commit tx: %w", err)
	}
	return lesson, saved, nil
}

// ReplaceLessonSequence replaces all sequence points for a lesson in one transaction.
func (q *Queries) ReplaceLessonSequence(ctx context.Context, lessonID string, points []SequencePointParams) ([]LessonSequencePointRow, error) {
	tx, err := q.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `DELETE FROM lesson_sequence_points WHERE lesson_id = $1::uuid`, lessonID); err != nil {
		return nil, fmt.Errorf("delete sequence: %w", err)
	}
	saved, err := insertSequencePoints(ctx, tx, lessonID, points)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return saved, nil
}

func insertSequencePoints(ctx context.Context, tx pgx.Tx, lessonID string, points []SequencePointParams) ([]LessonSequencePointRow, error) {
	saved := make([]LessonSequencePointRow, 0, len(points))
	for _, p := range points {
		var row LessonSequencePointRow
		err := tx.QueryRow(ctx, `
			INSERT INTO lesson_sequence_points (lesson_id, title, description, timestamp_seconds, sort_order)
			VALUES ($1::uuid, $2, $3, $4, $5)
			RETURNING id::text, lesson_id::text, title, description, timestamp_seconds, sort_order
		`, lessonID, p.Title, p.Description, p.TimestampSeconds, p.SortOrder).
			Scan(&row.ID, &row.LessonID, &row.Title, &row.Description, &row.TimestampSeconds, &row.SortOrder)
		if err != nil {
			return nil, fmt.Errorf("insert sequence point: %w", err)
		}
		saved = append(saved, row)
	}
	return saved, nil
}

// GetLessonByID returns a lesson by id.
func (q *Queries) GetLessonByID(ctx context.Context, id string) (LessonRow, error) {
	var l LessonRow
	err := q.db.QueryRow(ctx, `
		SELECT id::text, module_id::text, title, youtube_embed_url, duration_seconds, sort_order
		FROM lessons WHERE id = $1::uuid
	`, id).Scan(&l.ID, &l.ModuleID, &l.Title, &l.YouTubeEmbedURL, &l.DurationSeconds, &l.SortOrder)
	if errors.Is(err, pgx.ErrNoRows) {
		return LessonRow{}, ErrNotFound
	}
	if err != nil {
		return LessonRow{}, fmt.Errorf("get lesson: %w", err)
	}
	return l, nil
}

// ListLessonProgressByCourse returns one row per lesson in a course with persisted user status or not_started.
func (q *Queries) ListLessonProgressByCourse(ctx context.Context, courseID, userID string) ([]LessonProgressRow, error) {
	rows, err := q.db.Query(ctx, `
		SELECT l.id::text,
			COALESCE(lp.status, 'not_started') AS status,
			lp.last_position_seconds,
			lp.completed_at
		FROM lessons l
		JOIN modules m ON m.id = l.module_id
		LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
		WHERE m.course_id = $1::uuid
		ORDER BY m.sort_order, l.sort_order, l.created_at
	`, courseID, userID)
	if err != nil {
		return nil, fmt.Errorf("list lesson progress: %w", err)
	}
	defer rows.Close()

	var progress []LessonProgressRow
	for rows.Next() {
		var row LessonProgressRow
		if err := rows.Scan(&row.LessonID, &row.Status, &row.LastPositionSeconds, &row.CompletedAt); err != nil {
			return nil, fmt.Errorf("scan lesson progress: %w", err)
		}
		progress = append(progress, row)
	}
	return progress, rows.Err()
}

// UpsertLessonProgress inserts or updates a per-user lesson progress row idempotently.
func (q *Queries) UpsertLessonProgress(ctx context.Context, params UpsertLessonProgressParams) (LessonProgressRow, error) {
	var row LessonProgressRow
	err := q.db.QueryRow(ctx, `
		INSERT INTO lesson_progress (user_id, lesson_id, status, last_position_seconds, completed_at)
		VALUES ($1, $2::uuid, $3, $4, CASE WHEN $3 = 'completed' THEN now() ELSE NULL END)
		ON CONFLICT (user_id, lesson_id) DO UPDATE SET
			status = EXCLUDED.status,
			last_position_seconds = COALESCE(EXCLUDED.last_position_seconds, lesson_progress.last_position_seconds),
			completed_at = CASE
				WHEN EXCLUDED.status = 'completed' THEN COALESCE(lesson_progress.completed_at, now())
				ELSE NULL
			END,
			updated_at = now()
		RETURNING lesson_id::text, status, last_position_seconds, completed_at
	`, params.UserID, params.LessonID, params.Status, params.LastPositionSeconds).
		Scan(&row.LessonID, &row.Status, &row.LastPositionSeconds, &row.CompletedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return LessonProgressRow{}, ErrNotFound
	}
	if err != nil {
		return LessonProgressRow{}, fmt.Errorf("upsert lesson progress: %w", err)
	}
	return row, nil
}

// CourseSlugByModuleID resolves the parent course slug for a module, for cache invalidation.
func (q *Queries) CourseSlugByModuleID(ctx context.Context, moduleID string) (string, error) {
	return q.courseSlugBy(ctx, `
		SELECT c.slug FROM courses c
		JOIN modules m ON m.course_id = c.id
		WHERE m.id = $1::uuid
	`, moduleID)
}

// CourseSlugByLessonID resolves the parent course slug for a lesson, for cache invalidation.
func (q *Queries) CourseSlugByLessonID(ctx context.Context, lessonID string) (string, error) {
	return q.courseSlugBy(ctx, `
		SELECT c.slug FROM courses c
		JOIN modules m ON m.course_id = c.id
		JOIN lessons l ON l.module_id = m.id
		WHERE l.id = $1::uuid
	`, lessonID)
}

// CourseSlugBySequencePointID resolves the parent course slug for a lesson bookmark, for cache invalidation.
func (q *Queries) CourseSlugBySequencePointID(ctx context.Context, pointID string) (string, error) {
	return q.courseSlugBy(ctx, `
		SELECT c.slug FROM courses c
		JOIN modules m ON m.course_id = c.id
		JOIN lessons l ON l.module_id = m.id
		JOIN lesson_sequence_points sp ON sp.lesson_id = l.id
		WHERE sp.id = $1::uuid
	`, pointID)
}

func (q *Queries) courseSlugBy(ctx context.Context, query, arg string) (string, error) {
	var slug string
	err := q.db.QueryRow(ctx, query, arg).Scan(&slug)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("resolve course slug: %w", err)
	}
	return slug, nil
}
