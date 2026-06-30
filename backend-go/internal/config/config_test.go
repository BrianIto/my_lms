package config

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestLoadKeepsLocalAuthServiceDefaultForDevelopment(t *testing.T) {
	withUnsetEnv(t, "AUTH_SERVICE_URL")
	t.Setenv("DATABASE_URL", "postgres://app:pass@localhost:5432/app?sslmode=disable")
	t.Setenv("ENV", "development")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.AuthServiceURL != "http://localhost:3000" {
		t.Fatalf("AuthServiceURL = %q, want local default", cfg.AuthServiceURL)
	}
}

func TestLoadRejectsProductionLocalhostAuthServiceURL(t *testing.T) {
	withUnsetEnv(t, "AUTH_SERVICE_URL")
	t.Setenv("DATABASE_URL", "postgres://app:pass@postgres:5432/app?sslmode=disable")
	t.Setenv("ENV", "production")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "AUTH_SERVICE_URL") {
		t.Fatalf("Load() error = %v, want AUTH_SERVICE_URL production validation error", err)
	}
}

func TestLoadAcceptsProductionInternalAuthServiceURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://app:pass@postgres:5432/app?sslmode=disable")
	t.Setenv("ENV", "production")
	t.Setenv("AUTH_SERVICE_URL", "http://auth:3000")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.AuthServiceURL != "http://auth:3000" {
		t.Fatalf("AuthServiceURL = %q, want internal auth service URL", cfg.AuthServiceURL)
	}
}

func TestProductionComposeProvidesBackendAuthServiceURL(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	composePath := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "deploy", "docker-compose.prod.yml"))
	contents, err := os.ReadFile(composePath)
	if err != nil {
		t.Fatalf("read production compose: %v", err)
	}
	text := string(contents)
	if !strings.Contains(text, "AUTH_SERVICE_URL: ${AUTH_SERVICE_URL:-http://auth:3000}") {
		t.Fatalf("production backend compose must set AUTH_SERVICE_URL to internal auth service; got no expected entry")
	}
	if strings.Contains(text, "AUTH_SERVICE_URL: ${AUTH_SERVICE_URL:-http://localhost:3000}") {
		t.Fatalf("production backend compose must not default AUTH_SERVICE_URL to localhost")
	}
}

func withUnsetEnv(t *testing.T, key string) {
	t.Helper()
	oldValue, hadValue := os.LookupEnv(key)
	if err := os.Unsetenv(key); err != nil {
		t.Fatalf("unset %s: %v", key, err)
	}
	t.Cleanup(func() {
		if hadValue {
			_ = os.Setenv(key, oldValue)
			return
		}
		_ = os.Unsetenv(key)
	})
}
