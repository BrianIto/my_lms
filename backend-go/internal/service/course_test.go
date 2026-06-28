package service

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"testing"
	"time"

	"backend-go/internal/repository"
)

type fakeCache struct {
	values  map[string]string
	sets    map[string]string
	deleted []string
}

func newFakeCache() *fakeCache {
	return &fakeCache{values: map[string]string{}, sets: map[string]string{}}
}
func (c *fakeCache) Get(_ context.Context, key string) (string, error) {
	v, ok := c.values[key]
	if !ok {
		return "", errors.New("miss")
	}
	return v, nil
}
func (c *fakeCache) Set(_ context.Context, key, value string, _ time.Duration) error {
	c.sets[key] = value
	c.values[key] = value
	return nil
}
func (c *fakeCache) Delete(_ context.Context, key string) error {
	c.deleted = append(c.deleted, key)
	delete(c.values, key)
	return nil
}
func (c *fakeCache) Publish(context.Context, string, string) error { return nil }
func (c *fakeCache) deletedKey(key string) bool {
	for _, k := range c.deleted {
		if k == key {
			return true
		}
	}
	return false
}

type fakeRepo struct {
	listIncludeDrafts []bool
	cards             []repository.CourseCardRow
	coursesBySlug     map[string]repository.CourseRow
	coursesByID       map[string]repository.CourseRow
	modulesByCourse   map[string][]repository.ModuleRow
	lessonsByCourse   map[string][]repository.LessonRow
	sequenceByCourse  map[string][]repository.LessonSequencePointRow
	lessonsByID       map[string]repository.LessonRow
	slugByModuleID    map[string]string
	slugByLessonID    map[string]string
	slugByPointID     map[string]string

	createCourseErr error
	updateCourseErr error
	createModuleErr error
	createLessonErr error
	replaceSeqErr   error
	deleteErr       error

	createdCourse  repository.CreateCourseParams
	updatedID      string
	updatedCourse  repository.UpdateCourseParams
	createdModule  repository.CreateModuleParams
	createdLesson  repository.CreateLessonParams
	createdPoints  []repository.SequencePointParams
	replacedLesson string
	replacedPoints []repository.SequencePointParams
	deletedCourse  string
	deletedModule  string
	deletedLesson  string
	deletedPoint   string
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{coursesBySlug: map[string]repository.CourseRow{}, coursesByID: map[string]repository.CourseRow{}, modulesByCourse: map[string][]repository.ModuleRow{}, lessonsByCourse: map[string][]repository.LessonRow{}, sequenceByCourse: map[string][]repository.LessonSequencePointRow{}, lessonsByID: map[string]repository.LessonRow{}, slugByModuleID: map[string]string{}, slugByLessonID: map[string]string{}, slugByPointID: map[string]string{}}
}

func (r *fakeRepo) CreateBetaAccessRequest(context.Context, string) (repository.BetaAccessRequest, error) {
	return repository.BetaAccessRequest{}, nil
}
func (r *fakeRepo) CreateCourse(_ context.Context, p repository.CreateCourseParams) (repository.CourseRow, error) {
	r.createdCourse = p
	if r.createCourseErr != nil {
		return repository.CourseRow{}, r.createCourseErr
	}
	return repository.CourseRow{ID: "course-1", Slug: p.Slug, Title: p.Title, Description: p.Description, Status: p.Status, SortOrder: p.SortOrder}, nil
}
func (r *fakeRepo) UpdateCourse(_ context.Context, id string, p repository.UpdateCourseParams) (repository.CourseRow, error) {
	r.updatedID = id
	r.updatedCourse = p
	if r.updateCourseErr != nil {
		return repository.CourseRow{}, r.updateCourseErr
	}
	title, desc, status, sort := "Updated", "Desc", "beta", 2
	if p.Title != nil {
		title = *p.Title
	}
	if p.Description != nil {
		desc = *p.Description
	}
	if p.Status != nil {
		status = *p.Status
	}
	if p.SortOrder != nil {
		sort = *p.SortOrder
	}
	return repository.CourseRow{ID: id, Slug: "building-with-ai", Title: title, Description: desc, Status: status, SortOrder: sort}, nil
}
func (r *fakeRepo) DeleteCourse(_ context.Context, id string) error {
	r.deletedCourse = id
	if r.deleteErr != nil {
		return r.deleteErr
	}
	return nil
}
func (r *fakeRepo) DeleteModule(_ context.Context, id string) error {
	r.deletedModule = id
	if r.deleteErr != nil {
		return r.deleteErr
	}
	return nil
}
func (r *fakeRepo) DeleteLesson(_ context.Context, id string) error {
	r.deletedLesson = id
	if r.deleteErr != nil {
		return r.deleteErr
	}
	return nil
}
func (r *fakeRepo) DeleteSequencePoint(_ context.Context, id string) error {
	r.deletedPoint = id
	if r.deleteErr != nil {
		return r.deleteErr
	}
	return nil
}
func (r *fakeRepo) ListCourseCards(_ context.Context, includeDrafts bool) ([]repository.CourseCardRow, error) {
	r.listIncludeDrafts = append(r.listIncludeDrafts, includeDrafts)
	return r.cards, nil
}
func (r *fakeRepo) GetCourseBySlug(_ context.Context, slug string) (repository.CourseRow, error) {
	c, ok := r.coursesBySlug[slug]
	if !ok {
		return repository.CourseRow{}, repository.ErrNotFound
	}
	return c, nil
}
func (r *fakeRepo) GetCourseByID(_ context.Context, id string) (repository.CourseRow, error) {
	c, ok := r.coursesByID[id]
	if !ok {
		return repository.CourseRow{}, repository.ErrNotFound
	}
	return c, nil
}
func (r *fakeRepo) ListModulesByCourse(_ context.Context, id string) ([]repository.ModuleRow, error) {
	return r.modulesByCourse[id], nil
}
func (r *fakeRepo) ListLessonsByCourse(_ context.Context, id string) ([]repository.LessonRow, error) {
	return r.lessonsByCourse[id], nil
}
func (r *fakeRepo) ListSequenceByCourse(_ context.Context, id string) ([]repository.LessonSequencePointRow, error) {
	return r.sequenceByCourse[id], nil
}
func (r *fakeRepo) CreateModule(_ context.Context, p repository.CreateModuleParams) (repository.ModuleRow, error) {
	r.createdModule = p
	if r.createModuleErr != nil {
		return repository.ModuleRow{}, r.createModuleErr
	}
	return repository.ModuleRow{ID: "module-1", CourseID: p.CourseID, Title: p.Title, SortOrder: p.SortOrder}, nil
}
func (r *fakeRepo) CreateLesson(_ context.Context, p repository.CreateLessonParams, points []repository.SequencePointParams) (repository.LessonRow, []repository.LessonSequencePointRow, error) {
	r.createdLesson = p
	r.createdPoints = points
	if r.createLessonErr != nil {
		return repository.LessonRow{}, nil, r.createLessonErr
	}
	saved := make([]repository.LessonSequencePointRow, 0, len(points))
	for i, p := range points {
		saved = append(saved, repository.LessonSequencePointRow{ID: "point", LessonID: "lesson-1", Title: p.Title, Description: p.Description, TimestampSeconds: p.TimestampSeconds, SortOrder: i + 1})
	}
	return repository.LessonRow{ID: "lesson-1", ModuleID: p.ModuleID, Title: p.Title, YouTubeEmbedURL: p.YouTubeEmbedURL, DurationSeconds: p.DurationSeconds, SortOrder: p.SortOrder}, saved, nil
}
func (r *fakeRepo) ReplaceLessonSequence(_ context.Context, lessonID string, points []repository.SequencePointParams) ([]repository.LessonSequencePointRow, error) {
	r.replacedLesson = lessonID
	r.replacedPoints = points
	if r.replaceSeqErr != nil {
		return nil, r.replaceSeqErr
	}
	saved := make([]repository.LessonSequencePointRow, 0, len(points))
	for _, p := range points {
		saved = append(saved, repository.LessonSequencePointRow{ID: "point", LessonID: lessonID, Title: p.Title, Description: p.Description, TimestampSeconds: p.TimestampSeconds, SortOrder: p.SortOrder})
	}
	return saved, nil
}
func (r *fakeRepo) GetLessonByID(_ context.Context, id string) (repository.LessonRow, error) {
	l, ok := r.lessonsByID[id]
	if !ok {
		return repository.LessonRow{}, repository.ErrNotFound
	}
	return l, nil
}
func (r *fakeRepo) CourseSlugByModuleID(_ context.Context, id string) (string, error) {
	s, ok := r.slugByModuleID[id]
	if !ok {
		return "", repository.ErrNotFound
	}
	return s, nil
}
func (r *fakeRepo) CourseSlugByLessonID(_ context.Context, id string) (string, error) {
	s, ok := r.slugByLessonID[id]
	if !ok {
		return "", repository.ErrNotFound
	}
	return s, nil
}
func (r *fakeRepo) CourseSlugBySequencePointID(_ context.Context, id string) (string, error) {
	s, ok := r.slugByPointID[id]
	if !ok {
		return "", repository.ErrNotFound
	}
	return s, nil
}

func TestListCoursesCacheAndRepo(t *testing.T) {
	ctx := context.Background()
	card := CourseCard{ID: "1", Slug: "building-with-ai", Title: "Building", Status: CourseStatusBeta}
	payload, _ := json.Marshal([]CourseCard{card})
	cache := newFakeCache()
	cache.values[courseListKey] = string(payload)
	repo := newFakeRepo()
	got, err := New(repo, cache).ListCourses(ctx)
	if err != nil || !reflect.DeepEqual(got, []CourseCard{card}) {
		t.Fatalf("cached ListCourses = %#v, %v", got, err)
	}
	if len(repo.listIncludeDrafts) != 0 {
		t.Fatal("cache hit should not call repo")
	}

	cache = newFakeCache()
	repo = newFakeRepo()
	repo.cards = []repository.CourseCardRow{{CourseRow: repository.CourseRow{ID: "1", Slug: "published", Title: "Published", Description: "D", Status: "published"}, LessonCount: 2}}
	got, err = New(repo, cache).ListCourses(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(repo.listIncludeDrafts) != 1 || repo.listIncludeDrafts[0] {
		t.Fatalf("includeDrafts = %v, want false", repo.listIncludeDrafts)
	}
	if cache.sets[courseListKey] == "" {
		t.Fatal("expected list cache set")
	}
	if got[0].LessonCount != 2 {
		t.Fatalf("lesson count = %d", got[0].LessonCount)
	}

	cache = newFakeCache()
	cache.values[courseListKey] = "not json"
	repo = newFakeRepo()
	repo.cards = []repository.CourseCardRow{{CourseRow: repository.CourseRow{ID: "2", Slug: "fallback", Title: "Fallback", Description: "D", Status: "beta"}}}
	got, err = New(repo, cache).ListCourses(ctx)
	if err != nil || got[0].Slug != "fallback" {
		t.Fatalf("corrupt cache fallback = %#v, %v", got, err)
	}
}

func TestListCoursesAdminBypassesPublicCache(t *testing.T) {
	cache := newFakeCache()
	cache.values[courseListKey] = `[]`
	repo := newFakeRepo()
	repo.cards = []repository.CourseCardRow{{CourseRow: repository.CourseRow{ID: "1", Slug: "draft", Title: "Draft", Description: "D", Status: "draft"}}}
	got, err := New(repo, cache).ListCoursesAdmin(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(repo.listIncludeDrafts) != 1 || !repo.listIncludeDrafts[0] {
		t.Fatalf("includeDrafts = %v, want true", repo.listIncludeDrafts)
	}
	if got[0].Status != CourseStatusDraft {
		t.Fatalf("status = %q", got[0].Status)
	}
}

func TestGetCourseCacheMissAssemblesAndCaches(t *testing.T) {
	repo := newFakeRepo()
	cache := newFakeCache()
	repo.coursesBySlug["building-with-ai"] = repository.CourseRow{ID: "c1", Slug: "building-with-ai", Title: "Building", Description: "D", Status: "beta", SortOrder: 1}
	repo.modulesByCourse["c1"] = []repository.ModuleRow{{ID: "m1", CourseID: "c1", Title: "M1", SortOrder: 1}, {ID: "m2", CourseID: "c1", Title: "M2", SortOrder: 2}}
	repo.lessonsByCourse["c1"] = []repository.LessonRow{{ID: "l1", ModuleID: "m1", Title: "L1", YouTubeEmbedURL: "u", DurationSeconds: 10, SortOrder: 1}}
	repo.sequenceByCourse["c1"] = []repository.LessonSequencePointRow{{ID: "p1", LessonID: "l1", Title: "P1", TimestampSeconds: 0, SortOrder: 1}}
	got, err := New(repo, cache).GetCourse(context.Background(), "building-with-ai")
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Modules) != 2 || len(got.Modules[0].Lessons) != 1 || len(got.Modules[1].Lessons) != 0 {
		t.Fatalf("assembled course = %#v", got)
	}
	if got.Modules[0].Lessons[0].LessonSequence == nil || got.Modules[1].Lessons == nil {
		t.Fatal("expected empty slices, not nil")
	}
	if cache.sets[courseDetailKey("building-with-ai")] == "" {
		t.Fatal("expected detail cache set")
	}
}

func TestGetCourseCacheHitAndNotFound(t *testing.T) {
	course := Course{ID: "c1", Slug: "cached", Modules: []Module{}}
	payload, _ := json.Marshal(course)
	cache := newFakeCache()
	cache.values[courseDetailKey("cached")] = string(payload)
	got, err := New(newFakeRepo(), cache).GetCourse(context.Background(), "cached")
	if err != nil || got.Slug != "cached" {
		t.Fatalf("cached GetCourse = %#v, %v", got, err)
	}

	_, err = New(newFakeRepo(), newFakeCache()).GetCourse(context.Background(), "missing")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing err = %v, want ErrNotFound", err)
	}
}

func TestAdminWritesValidationMappingAndInvalidation(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	cache := newFakeCache()
	svc := New(repo, cache)
	if _, err := svc.CreateCourse(ctx, CreateCourseInput{Slug: "bad slug"}); err == nil {
		t.Fatal("invalid create should fail")
	}
	repo.createCourseErr = repository.ErrUniqueViolation
	if _, err := svc.CreateCourse(ctx, CreateCourseInput{Slug: "building-with-ai", Title: "Building", Description: "D", Status: "beta"}); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate err = %v", err)
	}
	repo.createCourseErr = nil
	if _, err := svc.CreateCourse(ctx, CreateCourseInput{Slug: "building-with-ai", Title: "Building", Description: "D", Status: "beta"}); err != nil {
		t.Fatal(err)
	}
	if !cache.deletedKey(courseListKey) {
		t.Fatal("create should invalidate list")
	}

	repo.updateCourseErr = repository.ErrNotFound
	if _, err := svc.UpdateCourse(ctx, "missing", UpdateCourseInput{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("update missing err = %v", err)
	}
	repo.updateCourseErr = nil
	title := "New"
	status := "published"
	if _, err := svc.UpdateCourse(ctx, "c1", UpdateCourseInput{Title: &title, Status: &status}); err != nil {
		t.Fatal(err)
	}
	if repo.updatedCourse.Description != nil {
		t.Fatal("omitted description should stay nil")
	}
	if !cache.deletedKey(courseListKey) || !cache.deletedKey(courseDetailKey("building-with-ai")) {
		t.Fatalf("update deleted keys = %v", cache.deleted)
	}
}

func TestCreateModuleLessonAndReplaceSequence(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	cache := newFakeCache()
	svc := New(repo, cache)
	if _, err := svc.CreateModule(ctx, "missing", CreateModuleInput{Title: "M"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("module missing err = %v", err)
	}
	repo.coursesByID["c1"] = repository.CourseRow{ID: "c1", Slug: "building-with-ai"}
	if _, err := svc.CreateModule(ctx, "c1", CreateModuleInput{Title: " "}); err == nil {
		t.Fatal("invalid module title should fail")
	}
	if _, err := svc.CreateModule(ctx, "c1", CreateModuleInput{Title: "M"}); err != nil {
		t.Fatal(err)
	}
	if !cache.deletedKey(courseListKey) || !cache.deletedKey(courseDetailKey("building-with-ai")) {
		t.Fatalf("module deleted keys = %v", cache.deleted)
	}

	if _, err := svc.CreateLesson(ctx, "missing", CreateLessonInput{Title: "L", YouTubeEmbedURL: "https://youtu.be/VIDEO_ID", DurationSeconds: 10}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("lesson missing err = %v", err)
	}
	repo.slugByModuleID["m1"] = "building-with-ai"
	if _, err := svc.CreateLesson(ctx, "m1", CreateLessonInput{Title: "L", YouTubeEmbedURL: "http://youtu.be/VIDEO_ID", DurationSeconds: 10}); err == nil {
		t.Fatal("invalid URL should fail")
	}
	if _, err := svc.CreateLesson(ctx, "m1", CreateLessonInput{Title: "L", YouTubeEmbedURL: "https://youtu.be/VIDEO_ID", DurationSeconds: 0}); err == nil {
		t.Fatal("non-positive duration should fail")
	}
	lesson, err := svc.CreateLesson(ctx, "m1", CreateLessonInput{Title: "L", YouTubeEmbedURL: "https://youtu.be/VIDEO_ID", DurationSeconds: 10, LessonSequence: []SequencePointInput{{Title: "Start", TimestampSeconds: 0}}})
	if err != nil {
		t.Fatal(err)
	}
	if lesson.YouTubeEmbedURL != "https://www.youtube.com/embed/VIDEO_ID" || repo.createdPoints[0].SortOrder != 1 {
		t.Fatalf("lesson = %#v points=%#v", lesson, repo.createdPoints)
	}

	if _, err := svc.ReplaceLessonSequence(ctx, "missing", ReplaceSequenceInput{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("replace missing err = %v", err)
	}
	repo.lessonsByID["l1"] = repository.LessonRow{ID: "l1", DurationSeconds: 10}
	repo.slugByLessonID["l1"] = "building-with-ai"
	if _, err := svc.ReplaceLessonSequence(ctx, "l1", ReplaceSequenceInput{Points: []SequencePointInput{{Title: "Too far", TimestampSeconds: 11}}}); err == nil {
		t.Fatal("invalid sequence should fail")
	}
	if _, err := svc.ReplaceLessonSequence(ctx, "l1", ReplaceSequenceInput{Points: []SequencePointInput{{Title: "Ok", TimestampSeconds: 10}}}); err != nil {
		t.Fatal(err)
	}
	if repo.replacedLesson != "l1" || !cache.deletedKey(courseDetailKey("building-with-ai")) {
		t.Fatalf("replace state lesson=%s deleted=%v", repo.replacedLesson, cache.deleted)
	}
}

func TestDeleteCatalogInvalidatesExpectedCaches(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	cache := newFakeCache()
	svc := New(repo, cache)

	if err := svc.DeleteCourse(ctx, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("delete missing course err = %v", err)
	}
	repo.coursesByID["c1"] = repository.CourseRow{ID: "c1", Slug: "building-with-ai"}
	if err := svc.DeleteCourse(ctx, "c1"); err != nil {
		t.Fatal(err)
	}
	if repo.deletedCourse != "c1" || !cache.deletedKey(courseListKey) || !cache.deletedKey(courseDetailKey("building-with-ai")) {
		t.Fatalf("course delete id=%s deleted=%v", repo.deletedCourse, cache.deleted)
	}

	if err := svc.DeleteModule(ctx, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("delete missing module err = %v", err)
	}
	repo.slugByModuleID["m1"] = "building-with-ai"
	if err := svc.DeleteModule(ctx, "m1"); err != nil {
		t.Fatal(err)
	}
	if repo.deletedModule != "m1" || !cache.deletedKey(courseListKey) || !cache.deletedKey(courseDetailKey("building-with-ai")) {
		t.Fatalf("module delete id=%s deleted=%v", repo.deletedModule, cache.deleted)
	}

	if err := svc.DeleteLesson(ctx, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("delete missing lesson err = %v", err)
	}
	repo.slugByLessonID["l1"] = "building-with-ai"
	if err := svc.DeleteLesson(ctx, "l1"); err != nil {
		t.Fatal(err)
	}
	if repo.deletedLesson != "l1" || !cache.deletedKey(courseListKey) || !cache.deletedKey(courseDetailKey("building-with-ai")) {
		t.Fatalf("lesson delete id=%s deleted=%v", repo.deletedLesson, cache.deleted)
	}

	if err := svc.DeleteSequencePoint(ctx, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("delete missing point err = %v", err)
	}
	repo.slugByPointID["p1"] = "building-with-ai"
	cache.deleted = nil
	if err := svc.DeleteSequencePoint(ctx, "p1"); err != nil {
		t.Fatal(err)
	}
	if repo.deletedPoint != "p1" || cache.deletedKey(courseListKey) || !cache.deletedKey(courseDetailKey("building-with-ai")) {
		t.Fatalf("point delete id=%s deleted=%v", repo.deletedPoint, cache.deleted)
	}
}

func TestProgressPlaceholders(t *testing.T) {
	repo := newFakeRepo()
	cache := newFakeCache()
	repo.coursesBySlug["building-with-ai"] = repository.CourseRow{ID: "c1", Slug: "building-with-ai", Status: "beta"}
	repo.modulesByCourse["c1"] = []repository.ModuleRow{{ID: "m1"}}
	repo.lessonsByCourse["c1"] = []repository.LessonRow{{ID: "l1", ModuleID: "m1"}, {ID: "l2", ModuleID: "m1"}}
	svc := New(repo, cache)
	progress, err := svc.GetCourseProgress(context.Background(), "building-with-ai")
	if err != nil {
		t.Fatal(err)
	}
	if progress.TotalLessons != 2 || progress.CompletedLessons != 0 || progress.Percent != 0 {
		t.Fatalf("progress = %#v", progress)
	}
	if _, err := svc.GetCourseProgress(context.Background(), "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing progress err = %v", err)
	}
	update, err := svc.UpdateLessonProgress(context.Background(), "lesson", LessonProgressUpdate{})
	if err != nil || update.Status != LessonStatusCompleted {
		t.Fatalf("update = %#v, %v", update, err)
	}
	if _, err := svc.UpdateLessonProgress(context.Background(), "", LessonProgressUpdate{}); err == nil {
		t.Fatal("empty lesson id should fail")
	}
}
