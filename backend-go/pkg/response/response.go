// Package response provides JSON response helpers.
package response

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// ErrorResponse is a standard JSON error payload.
type ErrorResponse struct {
	Error string `json:"error"`
}

// JSON writes a JSON response.
func JSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		http.Error(w, fmt.Sprintf("encode json: %v", err), http.StatusInternalServerError)
	}
}

// Error writes a JSON error response.
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, ErrorResponse{Error: message})
}

// NoContent writes a 204 No Content response.
func NoContent(w http.ResponseWriter) { w.WriteHeader(http.StatusNoContent) }
