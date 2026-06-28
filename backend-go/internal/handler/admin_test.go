package handler

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"backend-go/internal/repository"
)

func authServer(status int, body string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
}

func doAdmin(r http.Handler, method, path, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Cookie", "better-auth.session_token=test")
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w
}

func TestAdminMiddleware(t *testing.T) {
	repo := newHandlerRepo()

	t.Run("no cookie", func(t *testing.T) {
		auth := authServer(http.StatusOK, `{"user":{"role":"admin"},"session":{"id":"s"}}`)
		defer auth.Close()
		r := testRouter(repo, auth.URL, false)
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/courses", nil)
		r.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("status=%d", w.Code)
		}
	})

	for _, tc := range []struct {
		name   string
		status int
		body   string
		want   int
	}{
		{"auth non-200", http.StatusUnauthorized, `{}`, http.StatusUnauthorized},
		{"malformed session", http.StatusOK, `{`, http.StatusUnauthorized},
		{"non admin", http.StatusOK, `{"user":{"role":"student"},"session":{"id":"s"}}`, http.StatusForbidden},
		{"admin", http.StatusOK, `{"user":{"role":"admin"},"session":{"id":"s"}}`, http.StatusOK},
		{"csv admin", http.StatusOK, `{"user":{"role":"student, admin"},"session":{"id":"s"}}`, http.StatusOK},
	} {
		t.Run(tc.name, func(t *testing.T) {
			auth := authServer(tc.status, tc.body)
			defer auth.Close()
			r := testRouter(repo, auth.URL, false)
			w := doAdmin(r, http.MethodGet, "/api/v1/admin/courses", "")
			if w.Code != tc.want {
				t.Fatalf("status=%d body=%s want=%d", w.Code, w.Body.String(), tc.want)
			}
		})
	}

	t.Run("disabled", func(t *testing.T) {
		auth := authServer(http.StatusOK, `{"user":{"role":"admin"},"session":{"id":"s"}}`)
		defer auth.Close()
		r := testRouter(repo, auth.URL, true)
		w := doAdmin(r, http.MethodGet, "/api/v1/admin/courses", "")
		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("status=%d", w.Code)
		}
	})
}

func TestAdminEndpoints(t *testing.T) {
	auth := authServer(http.StatusOK, `{"user":{"role":"admin"},"session":{"id":"s"}}`)
	defer auth.Close()
	repo := newHandlerRepo()
	repo.courses["building-with-ai"] = repository.CourseRow{ID: "c1", Slug: "building-with-ai", Title: "Building", Description: "D", Status: "beta"}
	r := testRouter(repo, auth.URL, false)

	tests := []struct {
		method, path, body string
		want               int
	}{
		{http.MethodPost, "/api/v1/admin/courses", `{"slug":"new-course","title":"New","description":"D","status":"beta"}`, http.StatusCreated},
		{http.MethodPost, "/api/v1/admin/courses", `{"slug":"building-with-ai","title":"Dup","description":"D","status":"beta"}`, http.StatusConflict},
		{http.MethodPost, "/api/v1/admin/courses", `{"slug":"bad slug"}`, http.StatusBadRequest},
		{http.MethodPatch, "/api/v1/admin/courses/c1", `{"title":"Updated"}`, http.StatusOK},
		{http.MethodPatch, "/api/v1/admin/courses/missing", `{}`, http.StatusNotFound},
		{http.MethodDelete, "/api/v1/admin/courses/c1", ``, http.StatusNoContent},
		{http.MethodDelete, "/api/v1/admin/courses/missing", ``, http.StatusNotFound},
		{http.MethodPost, "/api/v1/admin/courses/c1/modules", `{"title":"Module"}`, http.StatusCreated},
		{http.MethodPost, "/api/v1/admin/courses/missing/modules", `{"title":"Module"}`, http.StatusNotFound},
		{http.MethodDelete, "/api/v1/admin/modules/m1", ``, http.StatusNoContent},
		{http.MethodDelete, "/api/v1/admin/modules/missing", ``, http.StatusNotFound},
		{http.MethodPost, "/api/v1/admin/modules/m1/lessons", `{"title":"Lesson","youtube_embed_url":"https://youtu.be/VIDEO_ID","duration_seconds":30}`, http.StatusCreated},
		{http.MethodPost, "/api/v1/admin/modules/missing/lessons", `{"title":"Lesson","youtube_embed_url":"https://youtu.be/VIDEO_ID","duration_seconds":30}`, http.StatusNotFound},
		{http.MethodDelete, "/api/v1/admin/lessons/l1", ``, http.StatusNoContent},
		{http.MethodDelete, "/api/v1/admin/lessons/missing", ``, http.StatusNotFound},
		{http.MethodPut, "/api/v1/admin/lessons/l1/sequence", `{"points":[{"title":"Start","timestamp_seconds":0}]}`, http.StatusOK},
		{http.MethodPut, "/api/v1/admin/lessons/missing/sequence", `{"points":[]}`, http.StatusNotFound},
		{http.MethodDelete, "/api/v1/admin/sequence/p1", ``, http.StatusNoContent},
		{http.MethodDelete, "/api/v1/admin/sequence/missing", ``, http.StatusNotFound},
	}
	for i, tc := range tests {
		t.Run(fmt.Sprintf("%d %s", i, tc.path), func(t *testing.T) {
			w := doAdmin(r, tc.method, tc.path, tc.body)
			if w.Code != tc.want {
				t.Fatalf("status=%d body=%s want=%d", w.Code, w.Body.String(), tc.want)
			}
		})
	}

	w := doAdmin(r, http.MethodPost, "/api/v1/admin/courses", `{bad json`)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("malformed json status=%d", w.Code)
	}
}
