package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"backend-go/internal/service"
	"backend-go/pkg/response"

	"github.com/go-chi/chi/v5"
)

// requireAdmin validates the Better Auth session by forwarding the request cookie to the
// auth service and confirming the user carries the admin role. Anonymous callers get 401;
// authenticated non-admins get 403. When ADMIN_WRITES_DISABLED is set, all admin routes 503.
func (h *Handler) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.adminWritesOff {
			response.Error(w, http.StatusServiceUnavailable, "admin writes are disabled")
			return
		}

		cookie := r.Header.Get("Cookie")
		if cookie == "" {
			response.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}

		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, h.authServiceURL+"/api/auth/get-session", nil)
		if err != nil {
			response.Error(w, http.StatusInternalServerError, "auth check failed")
			return
		}
		req.Header.Set("Cookie", cookie)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			h.logger.Error("admin auth check: auth service unreachable")
			response.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}
		defer func() { _ = resp.Body.Close() }()

		if resp.StatusCode != http.StatusOK {
			response.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}

		var payload struct {
			User *struct {
				Role *string `json:"role"`
			} `json:"user"`
			Session json.RawMessage `json:"session"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil || payload.User == nil || len(payload.Session) == 0 {
			response.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}
		if !isAdminRole(payload.User.Role) {
			response.Error(w, http.StatusForbidden, "admin access required")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func isAdminRole(role *string) bool {
	if role == nil {
		return false
	}
	for part := range strings.SplitSeq(*role, ",") {
		if strings.EqualFold(strings.TrimSpace(part), "admin") {
			return true
		}
	}
	return false
}

// writeServiceError maps service-layer sentinel errors to HTTP status codes.
func writeServiceError(w http.ResponseWriter, err error, fallback string) {
	var validationErr service.ValidationError
	switch {
	case errors.As(err, &validationErr):
		response.Error(w, http.StatusBadRequest, validationErr.Msg)
	case errors.Is(err, service.ErrConflict):
		response.Error(w, http.StatusConflict, "resource already exists")
	case errors.Is(err, service.ErrNotFound):
		response.Error(w, http.StatusNotFound, "resource not found")
	default:
		response.Error(w, http.StatusInternalServerError, fallback)
	}
}

// AdminListCourses godoc
// @Summary List courses (admin)
// @Description Lists all courses including drafts for the admin inventory. Bypasses the public list cache.
// @Tags admin
// @Produce json
// @Success 200 {array} service.CourseCard
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Router /api/v1/admin/courses [get]
func (h *Handler) AdminListCourses(w http.ResponseWriter, r *http.Request) {
	courses, err := h.service.ListCoursesAdmin(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "list courses")
		return
	}
	response.JSON(w, http.StatusOK, courses)
}

// CreateCourse godoc
// @Summary Create course
// @Description Creates a course. Requires session + admin permission.
// @Tags admin
// @Accept json
// @Produce json
// @Param body body service.CreateCourseInput true "Course"
// @Success 201 {object} service.CourseCard
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 409 {object} response.ErrorResponse
// @Router /api/v1/admin/courses [post]
func (h *Handler) CreateCourse(w http.ResponseWriter, r *http.Request) {
	var in service.CreateCourseInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	course, err := h.service.CreateCourse(r.Context(), in)
	if err != nil {
		writeServiceError(w, err, "create course")
		return
	}
	response.JSON(w, http.StatusCreated, course)
}

// UpdateCourse godoc
// @Summary Update course
// @Description Partially updates a course's metadata/status. Requires session + admin permission.
// @Tags admin
// @Accept json
// @Produce json
// @Param id path string true "Course ID"
// @Param body body service.UpdateCourseInput true "Partial course update"
// @Success 200 {object} service.CourseCard
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/courses/{id} [patch]
func (h *Handler) UpdateCourse(w http.ResponseWriter, r *http.Request) {
	var in service.UpdateCourseInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	course, err := h.service.UpdateCourse(r.Context(), chi.URLParam(r, "id"), in)
	if err != nil {
		writeServiceError(w, err, "update course")
		return
	}
	response.JSON(w, http.StatusOK, course)
}

// DeleteCourse godoc
// @Summary Delete course
// @Description Deletes a course. Modules, lessons, and lesson bookmarks cascade via database constraints. Requires session + admin permission.
// @Tags admin
// @Param id path string true "Course ID"
// @Success 204
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/courses/{id} [delete]
func (h *Handler) DeleteCourse(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteCourse(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeServiceError(w, err, "delete course")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// CreateModule godoc
// @Summary Create module
// @Description Adds a module to a course. Requires session + admin permission.
// @Tags admin
// @Accept json
// @Produce json
// @Param id path string true "Course ID"
// @Param body body service.CreateModuleInput true "Module"
// @Success 201 {object} service.Module
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/courses/{id}/modules [post]
func (h *Handler) CreateModule(w http.ResponseWriter, r *http.Request) {
	var in service.CreateModuleInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	module, err := h.service.CreateModule(r.Context(), chi.URLParam(r, "id"), in)
	if err != nil {
		writeServiceError(w, err, "create module")
		return
	}
	response.JSON(w, http.StatusCreated, module)
}

// DeleteModule godoc
// @Summary Delete module
// @Description Deletes a module. Lessons and lesson bookmarks cascade via database constraints. Requires session + admin permission.
// @Tags admin
// @Param id path string true "Module ID"
// @Success 204
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/modules/{id} [delete]
func (h *Handler) DeleteModule(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteModule(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeServiceError(w, err, "delete module")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// CreateLesson godoc
// @Summary Create lesson
// @Description Adds a YouTube lesson (with optional sequence bookmarks) to a module. Requires session + admin permission.
// @Tags admin
// @Accept json
// @Produce json
// @Param id path string true "Module ID"
// @Param body body service.CreateLessonInput true "Lesson"
// @Success 201 {object} service.Lesson
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/modules/{id}/lessons [post]
func (h *Handler) CreateLesson(w http.ResponseWriter, r *http.Request) {
	var in service.CreateLessonInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	lesson, err := h.service.CreateLesson(r.Context(), chi.URLParam(r, "id"), in)
	if err != nil {
		writeServiceError(w, err, "create lesson")
		return
	}
	response.JSON(w, http.StatusCreated, lesson)
}

// DeleteLesson godoc
// @Summary Delete lesson
// @Description Deletes a lesson. Lesson bookmarks cascade via database constraints. Requires session + admin permission.
// @Tags admin
// @Param id path string true "Lesson ID"
// @Success 204
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/lessons/{id} [delete]
func (h *Handler) DeleteLesson(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteLesson(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeServiceError(w, err, "delete lesson")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ReplaceLessonSequence godoc
// @Summary Replace lesson sequence
// @Description Replaces all timestamped bookmarks for a lesson in one transaction. Requires session + admin permission.
// @Tags admin
// @Accept json
// @Produce json
// @Param id path string true "Lesson ID"
// @Param body body service.ReplaceSequenceInput true "Sequence points"
// @Success 200 {array} service.LessonSequencePoint
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/lessons/{id}/sequence [put]
func (h *Handler) ReplaceLessonSequence(w http.ResponseWriter, r *http.Request) {
	var in service.ReplaceSequenceInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	points, err := h.service.ReplaceLessonSequence(r.Context(), chi.URLParam(r, "id"), in)
	if err != nil {
		writeServiceError(w, err, "replace lesson sequence")
		return
	}
	response.JSON(w, http.StatusOK, points)
}

// DeleteSequencePoint godoc
// @Summary Delete lesson sequence point
// @Description Deletes a single timestamped lesson bookmark without deleting the lesson. Requires session + admin permission.
// @Tags admin
// @Param id path string true "Sequence point ID"
// @Success 204
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/admin/sequence/{id} [delete]
func (h *Handler) DeleteSequencePoint(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteSequencePoint(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeServiceError(w, err, "delete sequence point")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
