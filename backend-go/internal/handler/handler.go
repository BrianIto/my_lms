// Package handler wires HTTP routes and handlers.
package handler

import (
	"backend-go/docs"
	"backend-go/internal/service"
	"backend-go/internal/ws"
	"backend-go/pkg/response"
	"encoding/json"
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
}

// New creates a Handler.
func New(service *service.Service, hub *ws.Hub, logger *zap.Logger, env, wsAllowedOrigins string) *Handler {
	return &Handler{service: service, hub: hub, logger: logger, env: env, wsAllowedOrigins: strings.Split(wsAllowedOrigins, ",")}
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
		r.Get("/courses/{slug}/progress", h.GetCourseProgress)
		r.Post("/lessons/{lessonID}/progress", h.UpdateLessonProgress)
		r.Get("/ws", ws.Serve(h.hub, h.wsAllowedOrigins, h.env == "development", h.logger))
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
	html, err := scalar.ApiReferenceHTML(&scalar.Options{SpecContent: docs.SwaggerInfo.ReadDoc(), CustomOptions: scalar.CustomOptions{PageTitle: "Go Server API"}})
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "render scalar")
		return
	}
	w.Header().Set("Content-Type", "text/html")
	_, _ = w.Write([]byte(html))
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
// @Description Returns session/beta access state for the current user. This is a development placeholder until Better Auth session validation is wired.
// @Tags access
// @Produce json
// @Success 200 {object} AccessResponse
// @Router /api/v1/me/access [get]
func (h *Handler) GetAccess(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, AccessResponse{Authenticated: true, BetaAccess: true, Status: "active"})
}

// ListCourses godoc
// @Summary List courses
// @Description Lists cacheable course catalog data.
// @Tags courses
// @Produce json
// @Success 200 {array} service.Course
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
// @Description Gets per-user course progress. Development placeholder uses seeded progress.
// @Tags progress
// @Produce json
// @Param slug path string true "Course slug"
// @Success 200 {object} service.CourseProgress
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/courses/{slug}/progress [get]
func (h *Handler) GetCourseProgress(w http.ResponseWriter, r *http.Request) {
	progress, err := h.service.GetCourseProgress(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		response.Error(w, http.StatusNotFound, "course not found")
		return
	}
	response.JSON(w, http.StatusOK, progress)
}

// UpdateLessonProgress godoc
// @Summary Update lesson progress
// @Description Idempotently updates lesson progress for the authenticated user. Development placeholder echoes the normalized status.
// @Tags progress
// @Accept json
// @Produce json
// @Param lessonID path string true "Lesson ID"
// @Param body body service.LessonProgressUpdate true "Progress payload"
// @Success 200 {object} service.LessonProgressUpdate
// @Failure 400 {object} response.ErrorResponse
// @Router /api/v1/lessons/{lessonID}/progress [post]
func (h *Handler) UpdateLessonProgress(w http.ResponseWriter, r *http.Request) {
	var req service.LessonProgressUpdate
	if err := jsonNewDecoder(r).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	progress, err := h.service.UpdateLessonProgress(r.Context(), chi.URLParam(r, "lessonID"), req)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "update lesson progress")
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
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
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
