// Package config loads application configuration from environment variables.
package config

import (
	"fmt"
	"net/url"
	"strings"
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
	AuthServiceURL   string        `env:"AUTH_SERVICE_URL" envDefault:"http://localhost:3000"`
	AdminWritesOff   bool          `env:"ADMIN_WRITES_DISABLED" envDefault:"false"`
}

// Load parses environment variables into Config.
func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, fmt.Errorf("parse env config: %w", err)
	}
	if err := cfg.validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) validate() error {
	if strings.EqualFold(c.Env, "production") && isLocalhostURL(c.AuthServiceURL) {
		return fmt.Errorf("AUTH_SERVICE_URL must point to the auth service in production, got %q", c.AuthServiceURL)
	}
	return nil
}

func isLocalhostURL(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	host := strings.ToLower(u.Hostname())
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}
