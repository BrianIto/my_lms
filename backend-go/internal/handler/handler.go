// Package handler wires HTTP routes and handlers.
package handler

import (
	"backend-go/docs"
	"backend-go/internal/service"
	"backend-go/internal/ws"
	"backend-go/pkg/response"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"

	scalar "github.com/MarceloPetrucio/go-scalar-api-reference"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.uber.org/zap"
	"net/http"
	"strings"
)

// Handler owns dependencies for HTTP handlers.
type Handler struct {
	service          *service.Service
	hub              *ws.Hub
	logger           *zap.Logger
	env              string
	wsAllowedOrigins []string
	authServiceURL   string
	adminWritesOff   bool
	scalarSpecPath   string
}

// New creates a Handler.
func New(service *service.Service, hub *ws.Hub, logger *zap.Logger, env, wsAllowedOrigins, authServiceURL string, adminWritesOff bool) *Handler {
	return &Handler{
		service:          service,
		hub:              hub,
		logger:           logger,
		env:              env,
		wsAllowedOrigins: strings.Split(wsAllowedOrigins, ","),
		authServiceURL:   strings.TrimRight(authServiceURL, "/"),
		adminWritesOff:   adminWritesOff,
		scalarSpecPath:   defaultScalarSpecPath(),
	}
}

// Routes builds the chi router.
func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer, middleware.Timeout(60_000_000_000))
	r.Use(h.cors)
	r.Use(func(next http.Handler) http.Handler { return otelhttp.NewHandler(next, "http") })
	r.Get("/health", h.Health)
	r.Get("/scalar", h.Scalar)
	r.Get("/swagger/*", httpSwagger.Handler(httpSwagger.URL("/swagger/doc.json")))
	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/beta-access-requests", h.CreateBetaAccessRequest)
		r.Get("/me/access", h.GetAccess)
		r.Get("/courses", h.ListCourses)
		r.Get("/courses/{slug}", h.GetCourse)
		r.Group(func(r chi.Router) {
			r.Use(h.requireBetaUser)
			r.Get("/courses/{slug}/progress", h.GetCourseProgress)
			r.Post("/lessons/{lessonID}/progress", h.UpdateLessonProgress)
		})
		r.Get("/ws", ws.Serve(h.hub, h.wsAllowedOrigins, h.env == "development", h.logger))

		r.Route("/admin", func(r chi.Router) {
			r.Use(h.requireAdmin)
			r.Get("/courses", h.AdminListCourses)
			r.Post("/courses", h.CreateCourse)
			r.Patch("/courses/{id}", h.UpdateCourse)
			r.Delete("/courses/{id}", h.DeleteCourse)
			r.Post("/courses/{id}/modules", h.CreateModule)
			r.Delete("/modules/{id}", h.DeleteModule)
			r.Post("/modules/{id}/lessons", h.CreateLesson)
			r.Delete("/lessons/{id}", h.DeleteLesson)
			r.Put("/lessons/{id}/sequence", h.ReplaceLessonSequence)
			r.Delete("/sequence/{id}", h.DeleteSequencePoint)
		})
	})
	return r
}

// BetaAccessRequestBody is the public beta request body.
type BetaAccessRequestBody struct {
	Email string `json:"email" example:"student@example.com"`
}

// BetaAccessRequestResponse is returned after a beta request is accepted.
type BetaAccessRequestResponse struct {
	Email   string `json:"email" example:"student@example.com"`
	Status  string `json:"status" example:"requested"`
	Message string `json:"message" example:"Beta access request received."`
}

// HealthResponse is the health payload.
type HealthResponse struct {
	Status string `json:"status" example:"ok"`
}

// Health godoc
// @Summary Health check
// @Description Returns service health.
// @Tags ops
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, HealthResponse{Status: "ok"})
}

// Scalar godoc
func (h *Handler) Scalar(w http.ResponseWriter, r *http.Request) {
	specContent, err := h.scalarSpecContent()
	if err != nil {
		h.logger.Warn("scalar spec file unavailable; falling back to embedded generated docs", zap.Error(err))
		specContent = docs.SwaggerInfo.ReadDoc()
	}
	html, err := scalar.ApiReferenceHTML(&scalar.Options{SpecContent: specContent, CustomOptions: scalar.CustomOptions{PageTitle: "Go Server API"}})
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "render scalar")
		return
	}
	w.Header().Set("Content-Type", "text/html")
	_, _ = w.Write([]byte(html))
}

func (h *Handler) scalarSpecContent() (string, error) {
	content, err := os.ReadFile(h.scalarSpecPath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func defaultScalarSpecPath() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return filepath.Join("docs", "swagger.yaml")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "docs", "swagger.yaml"))
}

// CreateBetaAccessRequest godoc
// @Summary Request beta access
// @Description Accepts a public beta-access request for the Agentic Engineering Course. This records interest only and does not grant private course access.
// @Tags access
// @Accept json
// @Produce json
// @Param body body BetaAccessRequestBody true "Beta access request"
// @Success 202 {object} BetaAccessRequestResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/v1/beta-access-requests [post]
func (h *Handler) CreateBetaAccessRequest(w http.ResponseWriter, r *http.Request) {
	var req BetaAccessRequestBody
	if err := jsonNewDecoder(r).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	betaRequest, err := h.service.RequestBetaAccess(r.Context(), req.Email)
	if err != nil {
		if strings.Contains(err.Error(), "invalid email") {
			response.Error(w, http.StatusBadRequest, "invalid email")
			return
		}
		response.Error(w, http.StatusInternalServerError, "request beta access")
		return
	}
	response.JSON(w, http.StatusAccepted, BetaAccessRequestResponse{
		Email:   betaRequest.Email,
		Status:  betaRequest.Status,
		Message: "Beta access request received. We’ll email you when the course opens.",
	})
}

// AccessResponse is the current user's private beta access payload.
type AccessResponse struct {
	Authenticated bool   `json:"authenticated" example:"true"`
	BetaAccess    bool   `json:"beta_access" example:"true"`
	Status        string `json:"status" example:"active"`
}

// GetAccess godoc
// @Summary Get current access state
// @Description Returns session/beta access state for the current user by validating Better Auth through auth_service.
// @Tags access
// @Produce json
// @Success 200 {object} AccessResponse
// @Router /api/v1/me/access [get]
func (h *Handler) GetAccess(w http.ResponseWriter, r *http.Request) {
	if _, _, err := h.currentSessionUser(r); err != nil {
		response.JSON(w, http.StatusOK, AccessResponse{Authenticated: false, BetaAccess: false, Status: "anonymous"})
		return
	}
	active, _, err := h.hasActiveBetaAccess(r)
	if err != nil {
		response.JSON(w, http.StatusOK, AccessResponse{Authenticated: true, BetaAccess: false, Status: "unknown"})
		return
	}
	status := "invited"
	if active {
		status = "active"
	}
	response.JSON(w, http.StatusOK, AccessResponse{Authenticated: true, BetaAccess: active, Status: status})
}

// ListCourses godoc
// @Summary List courses
// @Description Lists cacheable, draft-excluded course catalog cards.
// @Tags courses
// @Produce json
// @Success 200 {array} service.CourseCard
// @Router /api/v1/courses [get]
func (h *Handler) ListCourses(w http.ResponseWriter, r *http.Request) {
	courses, err := h.service.ListCourses(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "list courses")
		return
	}
	response.JSON(w, http.StatusOK, courses)
}

// GetCourse godoc
// @Summary Get course
// @Description Gets cacheable course detail data by slug.
// @Tags courses
// @Produce json
// @Param slug path string true "Course slug"
// @Success 200 {object} service.Course
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/courses/{slug} [get]
func (h *Handler) GetCourse(w http.ResponseWriter, r *http.Request) {
	course, err := h.service.GetCourse(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		response.Error(w, http.StatusNotFound, "course not found")
		return
	}
	response.JSON(w, http.StatusOK, course)
}

// GetCourseProgress godoc
// @Summary Get course progress
// @Description Gets authenticated per-user course progress, including lesson statuses.
// @Tags progress
// @Produce json
// @Param slug path string true "Course slug"
// @Success 200 {object} service.CourseProgress
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/courses/{slug}/progress [get]
func (h *Handler) GetCourseProgress(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	progress, err := h.service.GetCourseProgress(r.Context(), user.ID, chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "get course progress")
		return
	}
	response.JSON(w, http.StatusOK, progress)
}

// UpdateLessonProgress godoc
// @Summary Update lesson progress
// @Description Idempotently updates lesson progress for the authenticated beta user.
// @Tags progress
// @Accept json
// @Produce json
// @Param lessonID path string true "Lesson ID"
// @Param body body service.LessonProgressUpdate true "Progress payload"
// @Success 200 {object} service.LessonProgress
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/lessons/{lessonID}/progress [post]
func (h *Handler) UpdateLessonProgress(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req service.LessonProgressUpdate
	if err := jsonNewDecoder(r).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	progress, err := h.service.UpdateLessonProgress(r.Context(), user.ID, chi.URLParam(r, "lessonID"), req)
	if err != nil {
		writeServiceError(w, err, "update lesson progress")
		return
	}
	response.JSON(w, http.StatusOK, progress)
}

func (h *Handler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && h.originAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) originAllowed(origin string) bool {
	for _, allowedOrigin := range h.wsAllowedOrigins {
		if strings.TrimSpace(allowedOrigin) == origin {
			return true
		}
	}
	return false
}

type decoder interface{ Decode(any) error }

func jsonNewDecoder(r *http.Request) decoder { return json.NewDecoder(r.Body) }
