//go:build integration

package repository

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var integrationRepo *Queries
var integrationPool *pgxpool.Pool
var integrationSchema string

func TestMain(m *testing.M) {
	ctx := context.Background()
	dsn := os.Getenv("BACKEND_INTEGRATION_DATABASE_URL")
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "BACKEND_INTEGRATION_DATABASE_URL is required for integration tests")
		os.Exit(2)
	}
	if err := validateIntegrationDSN(dsn); err != nil {
		fmt.Fprintf(os.Stderr, "refusing integration database URL: %v\n", err)
		os.Exit(2)
	}

	basePool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "connect integration db: %v\n", err)
		os.Exit(2)
	}
	defer basePool.Close()

	integrationSchema = fmt.Sprintf("test_lms_%d_%d", time.Now().UnixNano(), os.Getpid())
	if _, err := basePool.Exec(ctx, `CREATE SCHEMA `+integrationSchema); err != nil {
		fmt.Fprintf(os.Stderr, "create schema: %v\n", err)
		os.Exit(2)
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "parse integration dsn: %v\n", err)
		os.Exit(2)
	}
	if cfg.ConnConfig.RuntimeParams == nil {
		cfg.ConnConfig.RuntimeParams = map[string]string{}
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = integrationSchema
	integrationPool, err = pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "connect schema db: %v\n", err)
		cleanupSchema(ctx, basePool)
		os.Exit(2)
	}

	if err := applyMigrations(ctx, integrationPool); err != nil {
		fmt.Fprintf(os.Stderr, "apply migrations: %v\n", err)
		integrationPool.Close()
		cleanupSchema(ctx, basePool)
		os.Exit(2)
	}
	integrationRepo = New(integrationPool)

	code := m.Run()
	integrationPool.Close()
	cleanupSchema(ctx, basePool)
	os.Exit(code)
}

func validateIntegrationDSN(dsn string) error {
	u, err := url.Parse(dsn)
	if err != nil {
		return err
	}
	dbName := strings.TrimPrefix(u.Path, "/")
	host := u.Hostname()
	if !strings.HasSuffix(dbName, "_test") {
		return fmt.Errorf("database name %q must end in _test", dbName)
	}
	if host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return fmt.Errorf("host %q must be localhost/127.0.0.1", host)
	}
	return nil
}

func applyMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	files, err := filepath.Glob(filepath.Join("..", "db", "migrations", "*.up.sql"))
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("no migration files found")
	}
	for _, file := range files {
		b, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read %s: %w", file, err)
		}
		if _, err := pool.Exec(ctx, string(b)); err != nil {
			return fmt.Errorf("exec %s: %w", file, err)
		}
	}
	return nil
}

func cleanupSchema(ctx context.Context, pool *pgxpool.Pool) {
	if integrationSchema == "" {
		return
	}
	_, _ = pool.Exec(ctx, `DROP SCHEMA IF EXISTS `+integrationSchema+` CASCADE`)
}

func TestIntegrationMigrationsSeedAndRepositorySQL(t *testing.T) {
	ctx := context.Background()
	seed, err := integrationRepo.GetCourseBySlug(ctx, "building-with-ai")
	if err != nil {
		t.Fatalf("seeded course missing: %v", err)
	}
	if seed.Status != "beta" {
		t.Fatalf("seed status = %q", seed.Status)
	}

	published, err := integrationRepo.CreateCourse(ctx, CreateCourseParams{Slug: "integration-published", Title: "Integration Published", Description: "D", Status: "published", SortOrder: 1})
	if err != nil {
		t.Fatalf("create published: %v", err)
	}
	draft, err := integrationRepo.CreateCourse(ctx, CreateCourseParams{Slug: "integration-draft", Title: "Integration Draft", Description: "D", Status: "draft", SortOrder: 2})
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}
	if _, err := integrationRepo.CreateCourse(ctx, CreateCourseParams{Slug: "integration-published", Title: "Dup", Description: "D", Status: "published"}); err != ErrUniqueViolation {
		t.Fatalf("duplicate err = %v, want ErrUniqueViolation", err)
	}

	m1, err := integrationRepo.CreateModule(ctx, CreateModuleParams{CourseID: published.ID, Title: "Second", SortOrder: 2})
	if err != nil {
		t.Fatalf("create m1: %v", err)
	}
	m0, err := integrationRepo.CreateModule(ctx, CreateModuleParams{CourseID: published.ID, Title: "First", SortOrder: 1})
	if err != nil {
		t.Fatalf("create m0: %v", err)
	}
	if _, _, err := integrationRepo.CreateLesson(ctx, CreateLessonParams{ModuleID: m1.ID, Title: "Later", YouTubeEmbedURL: "https://www.youtube.com/embed/VIDEO_ID", DurationSeconds: 30, SortOrder: 2}, nil); err != nil {
		t.Fatalf("create later lesson: %v", err)
	}
	firstLesson, points, err := integrationRepo.CreateLesson(ctx, CreateLessonParams{ModuleID: m0.ID, Title: "Earlier", YouTubeEmbedURL: "https://www.youtube.com/embed/VIDEO_ID", DurationSeconds: 70, SortOrder: 1}, []SequencePointParams{{Title: "B", TimestampSeconds: 20, SortOrder: 2}, {Title: "A", TimestampSeconds: 0, SortOrder: 1}})
	if err != nil {
		t.Fatalf("create earlier lesson: %v", err)
	}
	if len(points) != 2 || points[0].Title != "B" {
		t.Fatalf("CreateLesson should return insertion order points, got %#v", points)
	}

	publicCards, err := integrationRepo.ListCourseCards(ctx, false)
	if err != nil {
		t.Fatalf("list public: %v", err)
	}
	if hasSlug(publicCards, draft.Slug) {
		t.Fatal("public cards included draft course")
	}
	if !hasSlug(publicCards, published.Slug) {
		t.Fatal("public cards missing published course")
	}
	card := findCard(publicCards, published.Slug)
	if card.ModuleCount != 2 || card.LessonCount != 2 || card.DurationSeconds != 100 {
		t.Fatalf("aggregates = modules %d lessons %d duration %d", card.ModuleCount, card.LessonCount, card.DurationSeconds)
	}
	adminCards, err := integrationRepo.ListCourseCards(ctx, true)
	if err != nil {
		t.Fatalf("list admin: %v", err)
	}
	if !hasSlug(adminCards, draft.Slug) {
		t.Fatal("admin cards missing draft course")
	}

	modules, err := integrationRepo.ListModulesByCourse(ctx, published.ID)
	if err != nil {
		t.Fatalf("list modules: %v", err)
	}
	if len(modules) != 2 || modules[0].Title != "First" || modules[1].Title != "Second" {
		t.Fatalf("module ordering = %#v", modules)
	}
	lessons, err := integrationRepo.ListLessonsByCourse(ctx, published.ID)
	if err != nil {
		t.Fatalf("list lessons: %v", err)
	}
	if len(lessons) != 2 || lessons[0].Title != "Earlier" || lessons[1].Title != "Later" {
		t.Fatalf("lesson ordering = %#v", lessons)
	}
	seq, err := integrationRepo.ListSequenceByCourse(ctx, published.ID)
	if err != nil {
		t.Fatalf("list sequence: %v", err)
	}
	if len(seq) != 2 || seq[0].Title != "A" || seq[1].Title != "B" {
		t.Fatalf("sequence ordering = %#v", seq)
	}

	slug, err := integrationRepo.CourseSlugByLessonID(ctx, firstLesson.ID)
	if err != nil || slug != published.Slug {
		t.Fatalf("CourseSlugByLessonID = %q, %v", slug, err)
	}
	pointSlug, err := integrationRepo.CourseSlugBySequencePointID(ctx, points[0].ID)
	if err != nil || pointSlug != published.Slug {
		t.Fatalf("CourseSlugBySequencePointID = %q, %v", pointSlug, err)
	}
	if err := integrationRepo.DeleteSequencePoint(ctx, points[0].ID); err != nil {
		t.Fatalf("delete sequence point: %v", err)
	}
	seq, err = integrationRepo.ListSequenceByCourse(ctx, published.ID)
	if err != nil || len(seq) != 1 {
		t.Fatalf("sequence after point delete len=%d err=%v", len(seq), err)
	}
	if err := integrationRepo.DeleteModule(ctx, m0.ID); err != nil {
		t.Fatalf("delete module: %v", err)
	}
	lessons, err = integrationRepo.ListLessonsByCourse(ctx, published.ID)
	if err != nil || len(lessons) != 1 || lessons[0].Title != "Later" {
		t.Fatalf("lessons after module delete = %#v, %v", lessons, err)
	}
	if err := integrationRepo.DeleteCourse(ctx, published.ID); err != nil {
		t.Fatalf("delete course: %v", err)
	}
	if _, err := integrationRepo.GetCourseByID(ctx, published.ID); err != ErrNotFound {
		t.Fatalf("deleted course err = %v, want ErrNotFound", err)
	}
}

func hasSlug(cards []CourseCardRow, slug string) bool { return findCard(cards, slug).Slug != "" }
func findCard(cards []CourseCardRow, slug string) CourseCardRow {
	for _, c := range cards {
		if c.Slug == slug {
			return c
		}
	}
	return CourseCardRow{}
}
