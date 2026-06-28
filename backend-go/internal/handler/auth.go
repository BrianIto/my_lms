package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"backend-go/pkg/response"
)

type authContextKey struct{}

type authenticatedUser struct {
	ID    string
	Email string
}

func userFromContext(ctx context.Context) (authenticatedUser, bool) {
	user, ok := ctx.Value(authContextKey{}).(authenticatedUser)
	return user, ok
}

// requireBetaUser validates the Better Auth session and active beta access via auth_service.
func (h *Handler) requireBetaUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, status, err := h.currentSessionUser(r)
		if err != nil {
			response.Error(w, status, "authentication required")
			return
		}
		if ok, status, err := h.hasActiveBetaAccess(r); err != nil {
			response.Error(w, status, "beta access check failed")
			return
		} else if !ok {
			response.Error(w, http.StatusForbidden, "active beta access required")
			return
		}

		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), authContextKey{}, user)))
	})
}

func (h *Handler) currentSessionUser(r *http.Request) (authenticatedUser, int, error) {
	cookie := r.Header.Get("Cookie")
	if cookie == "" {
		return authenticatedUser{}, http.StatusUnauthorized, http.ErrNoCookie
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, h.authServiceURL+"/api/auth/get-session", nil)
	if err != nil {
		return authenticatedUser{}, http.StatusInternalServerError, err
	}
	req.Header.Set("Cookie", cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		h.logger.Error("auth session check: auth service unreachable")
		return authenticatedUser{}, http.StatusUnauthorized, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return authenticatedUser{}, http.StatusUnauthorized, http.ErrNoCookie
	}
	var payload struct {
		User *struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
		Session json.RawMessage `json:"session"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil || payload.User == nil || payload.User.ID == "" || len(payload.Session) == 0 {
		return authenticatedUser{}, http.StatusUnauthorized, http.ErrNoCookie
	}
	return authenticatedUser{ID: payload.User.ID, Email: payload.User.Email}, http.StatusOK, nil
}

func (h *Handler) hasActiveBetaAccess(r *http.Request) (bool, int, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, h.authServiceURL+"/api/beta/access", nil)
	if err != nil {
		return false, http.StatusInternalServerError, err
	}
	req.Header.Set("Cookie", r.Header.Get("Cookie"))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		h.logger.Error("beta access check: auth service unreachable")
		return false, http.StatusUnauthorized, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode == http.StatusUnauthorized {
		return false, http.StatusUnauthorized, nil
	}
	if resp.StatusCode != http.StatusOK {
		return false, http.StatusForbidden, nil
	}
	var payload struct {
		BetaAccess bool `json:"beta_access"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return false, http.StatusInternalServerError, err
	}
	return payload.BetaAccess, http.StatusOK, nil
}
