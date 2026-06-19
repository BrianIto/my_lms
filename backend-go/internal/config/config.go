// Package config loads application configuration from environment variables.
package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
)

// Config contains all runtime configuration.
type Config struct {
	HTTPAddr         string        `env:"HTTP_ADDR" envDefault:":8080"`
	ShutdownTimeout  time.Duration `env:"SHUTDOWN_TIMEOUT" envDefault:"10s"`
	Env              string        `env:"ENV" envDefault:"development"`
	DatabaseURL      string        `env:"DATABASE_URL,required"`
	RedisAddr        string        `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	RedisPassword    string        `env:"REDIS_PASSWORD" envDefault:""`
	OTLPEndpoint     string        `env:"OTEL_EXPORTER_OTLP_ENDPOINT" envDefault:"localhost:4317"`
	ServiceName      string        `env:"OTEL_SERVICE_NAME" envDefault:"go-server"`
	WSAllowedOrigins string        `env:"WS_ALLOWED_ORIGINS" envDefault:"http://localhost:3000,http://localhost:5173"`
}

// Load parses environment variables into Config.
func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, fmt.Errorf("parse env config: %w", err)
	}
	return cfg, nil
}
