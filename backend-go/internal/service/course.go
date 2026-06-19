package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
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
)

type Lesson struct {
	ID              string       `json:"id"`
	Title           string       `json:"title"`
	YouTubeEmbedURL string       `json:"youtube_embed_url"`
	DurationSeconds int          `json:"duration_seconds"`
	Status          LessonStatus `json:"status,omitempty"`
}

type Module struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	Lessons []Lesson `json:"lessons"`
}

type Course struct {
	ID          string       `json:"id"`
	Slug        string       `json:"slug"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Status      CourseStatus `json:"status"`
	Progress    int          `json:"progress,omitempty"`
	Modules     []Module     `json:"modules"`
}

type CourseProgress struct {
	CourseSlug       string `json:"course_slug"`
	CompletedLessons int    `json:"completed_lessons"`
	TotalLessons     int    `json:"total_lessons"`
	Percent          int    `json:"percent"`
}

type LessonProgressUpdate struct {
	Status LessonStatus `json:"status"`
}

var seedCourses = []Course{
	{
		ID:          "course_ai_products",
		Slug:        "building-with-ai",
		Title:       "Building with AI",
		Description: "A practical course for shipping AI products.",
		Status:      CourseStatusBeta,
		Progress:    42,
		Modules: []Module{
			{
				ID:    "mod_01",
				Title: "Orientation",
				Lessons: []Lesson{
					{ID: "lesson_welcome", Title: "Welcome and operating principles", YouTubeEmbedURL: "https://www.youtube.com/embed/dQw4w9WgXcQ", DurationSeconds: 420, Status: LessonStatusCompleted},
					{ID: "lesson_stack", Title: "Course stack and project constraints", YouTubeEmbedURL: "https://www.youtube.com/embed/dQw4w9WgXcQ", DurationSeconds: 690, Status: LessonStatusCompleted},
				},
			},
			{
				ID:    "mod_02",
				Title: "Designing the learning loop",
				Lessons: []Lesson{
					{ID: "lesson_loop", Title: "From passive video to tracked knowledge", YouTubeEmbedURL: "https://www.youtube.com/embed/dQw4w9WgXcQ", DurationSeconds: 840, Status: LessonStatusInProgress},
					{ID: "lesson_cache", Title: "Caching static content without leaking progress", YouTubeEmbedURL: "https://www.youtube.com/embed/dQw4w9WgXcQ", DurationSeconds: 780, Status: LessonStatusNotStarted},
				},
			},
		},
	},
}

func (s *Service) ListCourses(ctx context.Context) ([]Course, error) {
	const key = "courses:list:v1"
	if cached, err := s.cache.Get(ctx, key); err == nil && cached != "" {
		var courses []Course
		if err := json.Unmarshal([]byte(cached), &courses); err == nil {
			return courses, nil
		}
	}

	payload, err := json.Marshal(seedCourses)
	if err != nil {
		return nil, fmt.Errorf("marshal courses: %w", err)
	}
	_ = s.cache.Set(ctx, key, string(payload), 24*time.Hour)
	return seedCourses, nil
}

func (s *Service) GetCourse(ctx context.Context, slug string) (Course, error) {
	for _, course := range seedCourses {
		if course.Slug != slug {
			continue
		}
		key := fmt.Sprintf("courses:detail:%s:v1", course.ID)
		if cached, err := s.cache.Get(ctx, key); err == nil && cached != "" {
			var cachedCourse Course
			if err := json.Unmarshal([]byte(cached), &cachedCourse); err == nil {
				return cachedCourse, nil
			}
		}
		payload, err := json.Marshal(course)
		if err != nil {
			return Course{}, fmt.Errorf("marshal course: %w", err)
		}
		_ = s.cache.Set(ctx, key, string(payload), 24*time.Hour)
		return course, nil
	}
	return Course{}, fmt.Errorf("course not found: %s", slug)
}

func (s *Service) GetCourseProgress(ctx context.Context, slug string) (CourseProgress, error) {
	course, err := s.GetCourse(ctx, slug)
	if err != nil {
		return CourseProgress{}, err
	}
	completed := 0
	total := 0
	for _, module := range course.Modules {
		for _, lesson := range module.Lessons {
			total++
			if lesson.Status == LessonStatusCompleted {
				completed++
			}
		}
	}
	percent := 0
	if total > 0 {
		percent = completed * 100 / total
	}
	return CourseProgress{CourseSlug: slug, CompletedLessons: completed, TotalLessons: total, Percent: percent}, nil
}

func (s *Service) UpdateLessonProgress(_ context.Context, lessonID string, update LessonProgressUpdate) (LessonProgressUpdate, error) {
	if lessonID == "" {
		return LessonProgressUpdate{}, fmt.Errorf("lesson id is required")
	}
	if update.Status == "" {
		update.Status = LessonStatusCompleted
	}
	return update, nil
}
