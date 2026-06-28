package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"backend-go/internal/repository"
	"backend-go/internal/service"
	"backend-go/internal/ws"

	"go.uber.org/zap"
)

type handlerCache struct{ data map[string]string }

func (c *handlerCache) Get(_ context.Context, k string) (string, error) {
	if c.data != nil {
		if v, ok := c.data[k]; ok {
			return v, nil
		}
	}
	return "", context.Canceled
}
func (c *handlerCache) Set(context.Context, string, string, time.Duration) error { return nil }
func (c *handlerCache) Delete(context.Context, string) error                     { return nil }
func (c *handlerCache) Publish(context.Context, string, string) error            { return nil }

type handlerRepo struct {
	cards    []repository.CourseCardRow
	courses  map[string]repository.CourseRow
	modules  map[string][]repository.ModuleRow
	lessons  map[string][]repository.LessonRow
	seq      map[string][]repository.LessonSequencePointRow
	progress map[string][]repository.LessonProgressRow
}

func newHandlerRepo() *handlerRepo {
	return &handlerRepo{courses: map[string]repository.CourseRow{}, modules: map[string][]repository.ModuleRow{}, lessons: map[string][]repository.LessonRow{}, seq: map[string][]repository.LessonSequencePointRow{}, progress: map[string][]repository.LessonProgressRow{}}
}
func (r *handlerRepo) CreateBetaAccessRequest(context.Context, string) (repository.BetaAccessRequest, error) {
	return repository.BetaAccessRequest{}, nil
}
func (r *handlerRepo) CreateCourse(_ context.Context, p repository.CreateCourseParams) (repository.CourseRow, error) {
	if _, exists := r.courses[p.Slug]; exists {
		return repository.CourseRow{}, repository.ErrUniqueViolation
	}
	return repository.CourseRow{ID: "c1", Slug: p.Slug, Title: p.Title, Description: p.Description, Status: p.Status}, nil
}
func (r *handlerRepo) UpdateCourse(_ context.Context, id string, p repository.UpdateCourseParams) (repository.CourseRow, error) {
	if id == "missing" {
		return repository.CourseRow{}, repository.ErrNotFound
	}
	return repository.CourseRow{ID: id, Slug: "building-with-ai", Title: "Updated", Description: "D", Status: "beta"}, nil
}
func (r *handlerRepo) DeleteCourse(context.Context, string) error { return nil }
func (r *handlerRepo) DeleteModule(_ context.Context, id string) error {
	if id == "missing" {
		return repository.ErrNotFound
	}
	return nil
}
func (r *handlerRepo) DeleteLesson(_ context.Context, id string) error {
	if id == "missing" {
		return repository.ErrNotFound
	}
	return nil
}
func (r *handlerRepo) DeleteSequencePoint(_ context.Context, id string) error {
	if id == "missing" {
		return repository.ErrNotFound
	}
	return nil
}
func (r *handlerRepo) ListCourseCards(context.Context, bool) ([]repository.CourseCardRow, error) {
	return r.cards, nil
}
func (r *handlerRepo) GetCourseBySlug(_ context.Context, slug string) (repository.CourseRow, error) {
	c, ok := r.courses[slug]
	if !ok {
		return repository.CourseRow{}, repository.ErrNotFound
	}
	return c, nil
}
func (r *handlerRepo) GetCourseByID(_ context.Context, id string) (repository.CourseRow, error) {
	for _, c := range r.courses {
		if c.ID == id {
			return c, nil
		}
	}
	return repository.CourseRow{}, repository.ErrNotFound
}
func (r *handlerRepo) ListModulesByCourse(_ context.Context, id string) ([]repository.ModuleRow, error) {
	return r.modules[id], nil
}
func (r *handlerRepo) ListLessonsByCourse(_ context.Context, id string) ([]repository.LessonRow, error) {
	return r.lessons[id], nil
}
func (r *handlerRepo) ListSequenceByCourse(_ context.Context, id string) ([]repository.LessonSequencePointRow, error) {
	return r.seq[id], nil
}
func (r *handlerRepo) CreateModule(_ context.Context, p repository.CreateModuleParams) (repository.ModuleRow, error) {
	if _, err := r.GetCourseByID(context.Background(), p.CourseID); err != nil {
		return repository.ModuleRow{}, err
	}
	return repository.ModuleRow{ID: "m1", CourseID: p.CourseID, Title: p.Title}, nil
}
func (r *handlerRepo) CreateLesson(_ context.Context, p repository.CreateLessonParams, points []repository.SequencePointParams) (repository.LessonRow, []repository.LessonSequencePointRow, error) {
	saved := []repository.LessonSequencePointRow{}
	return repository.LessonRow{ID: "l1", ModuleID: p.ModuleID, Title: p.Title, YouTubeEmbedURL: p.YouTubeEmbedURL, DurationSeconds: p.DurationSeconds}, saved, nil
}
func (r *handlerRepo) ReplaceLessonSequence(context.Context, string, []repository.SequencePointParams) ([]repository.LessonSequencePointRow, error) {
	return []repository.LessonSequencePointRow{}, nil
}
func (r *handlerRepo) GetLessonByID(_ context.Context, id string) (repository.LessonRow, error) {
	if id == "missing" {
		return repository.LessonRow{}, repository.ErrNotFound
	}
	return repository.LessonRow{ID: id, DurationSeconds: 100}, nil
}
func (r *handlerRepo) ListLessonProgressByCourse(_ context.Context, courseID, _ string) ([]repository.LessonProgressRow, error) {
	if rows, ok := r.progress[courseID]; ok {
		return rows, nil
	}
	lessons := r.lessons[courseID]
	rows := make([]repository.LessonProgressRow, 0, len(lessons))
	for _, lesson := range lessons {
		rows = append(rows, repository.LessonProgressRow{LessonID: lesson.ID, Status: "not_started"})
	}
	return rows, nil
}
func (r *handlerRepo) UpsertLessonProgress(_ context.Context, p repository.UpsertLessonProgressParams) (repository.LessonProgressRow, error) {
	return repository.LessonProgressRow{LessonID: p.LessonID, Status: p.Status, LastPositionSeconds: p.LastPositionSeconds}, nil
}
func (r *handlerRepo) CourseSlugByModuleID(_ context.Context, id string) (string, error) {
	if id == "missing" {
		return "", repository.ErrNotFound
	}
	return "building-with-ai", nil
}
func (r *handlerRepo) CourseSlugByLessonID(_ context.Context, id string) (string, error) {
	if id == "missing" {
		return "", repository.ErrNotFound
	}
	return "building-with-ai", nil
}
func (r *handlerRepo) CourseSlugBySequencePointID(_ context.Context, id string) (string, error) {
	if id == "missing" {
		return "", repository.ErrNotFound
	}
	return "building-with-ai", nil
}

func testRouter(repo *handlerRepo, authURL string, adminOff bool) http.Handler {
	svc := service.New(repo, &handlerCache{})
	logger := zap.NewNop()
	return New(svc, ws.NewHub(logger), logger, "test", "http://allowed.test", authURL, adminOff).Routes()
}

func TestPublicCourseHandlers(t *testing.T) {
	repo := newHandlerRepo()
	repo.cards = []repository.CourseCardRow{{CourseRow: repository.CourseRow{ID: "c1", Slug: "building-with-ai", Title: "Building", Description: "D", Status: "beta"}}}
	repo.courses["building-with-ai"] = repository.CourseRow{ID: "c1", Slug: "building-with-ai", Title: "Building", Description: "D", Status: "beta"}
	repo.modules["c1"] = []repository.ModuleRow{{ID: "m1", CourseID: "c1", Title: "M"}}
	r := testRouter(repo, "", false)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "building-with-ai") {
		t.Fatalf("list status=%d body=%s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/courses/building-with-ai", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "modules") {
		t.Fatalf("detail status=%d body=%s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/courses/missing", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("missing status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestScalarUsesGeneratedSpecFileContent(t *testing.T) {
	specPath := filepath.Join(t.TempDir(), "swagger.yaml")
	marker := "Scalar regression marker from generated swagger yaml"
	spec := "swagger: \"2.0\"\ninfo:\n  title: \"" + marker + "\"\n  version: \"1.0\"\npaths: {}\ndefinitions: {}\n"
	if err := os.WriteFile(specPath, []byte(spec), 0o644); err != nil {
		t.Fatal(err)
	}

	svc := service.New(newHandlerRepo(), &handlerCache{})
	logger := zap.NewNop()
	h := New(svc, ws.NewHub(logger), logger, "test", "http://allowed.test", "", false)
	h.scalarSpecPath = specPath
	r := h.Routes()

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/scalar", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("scalar status=%d body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), marker) {
		t.Fatalf("scalar did not include generated spec file marker %q; body=%s", marker, w.Body.String())
	}
}

func TestProgressRequiresAuthentication(t *testing.T) {
	repo := newHandlerRepo()
	repo.courses["building-with-ai"] = repository.CourseRow{ID: "c1", Slug: "building-with-ai", Title: "Building", Description: "D", Status: "beta"}
	r := testRouter(repo, "http://auth.test", false)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses/building-with-ai/progress", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("progress without auth status=%d body=%s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/lessons/l1/progress", strings.NewReader(`{"status":"completed"}`))
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("progress update without auth status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestCORS(t *testing.T) {
	r := testRouter(newHandlerRepo(), "", false)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/courses", nil)
	req.Header.Set("Origin", "http://allowed.test")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("OPTIONS status=%d", w.Code)
	}
	if w.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatal("expected credentials header")
	}
	methods := w.Header().Get("Access-Control-Allow-Methods")
	for _, m := range []string{"PATCH", "PUT", "DELETE"} {
		if !strings.Contains(methods, m) {
			t.Fatalf("methods %q missing %s", methods, m)
		}
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodOptions, "/api/v1/courses", nil)
	req.Header.Set("Origin", "http://evil.test")
	r.ServeHTTP(w, req)
	if w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("disallowed origin got %q", w.Header().Get("Access-Control-Allow-Origin"))
	}
}
