-- name: GetUserByID :one
SELECT id, email, created_at FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT id, email, created_at FROM users WHERE email = $1;

-- name: CreateUser :one
INSERT INTO users (email) VALUES ($1) RETURNING id, email, created_at;

-- name: ListUsers :many
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2;
