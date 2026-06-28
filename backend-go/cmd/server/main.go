// Package main wires and runs the HTTP server.
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	_ "backend-go/docs"
	"backend-go/internal/cache"
	"backend-go/internal/config"
	"backend-go/internal/handler"
	"backend-go/internal/repository"
	"backend-go/internal/service"
	"backend-go/internal/telemetry"
	"backend-go/internal/ws"
	"github.com/exaring/otelpgx"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// @title Go Backend Server
// @version 1.0
// @description Production-ready Go backend with chi, PostgreSQL, Redis, OpenTelemetry, WebSockets, Swaggo, and Scalar.
// @BasePath /
// @schemes http https
func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logger, err := zap.NewProduction()
	if err != nil {
		return fmt.Errorf("create logger: %w", err)
	}
	defer syncLogger(logger)

	shutdownTelemetry, err := telemetry.Setup(ctx, cfg.ServiceName, cfg.OTLPEndpoint)
	if err != nil {
		return fmt.Errorf("setup telemetry: %w", err)
	}
	defer func() {
		sdCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		if err := shutdownTelemetry(sdCtx); err != nil {
			logger.Error("shutdown telemetry", zap.Error(err))
		}
	}()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("parse database url: %w", err)
	}
	poolConfig.ConnConfig.Tracer = otelpgx.NewTracer()
	dbpool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer dbpool.Close()

	redisCache, err := cache.New(cfg.RedisAddr, cfg.RedisPassword)
	if err != nil {
		return fmt.Errorf("create cache: %w", err)
	}
	defer func() {
		if err := redisCache.Close(); err != nil {
			logger.Error("close redis", zap.Error(err))
		}
	}()

	hub := ws.NewHub(logger)
	go hub.Run(ctx)
	svc := service.New(repository.New(dbpool), redisCache)
	h := handler.New(svc, hub, logger, cfg.Env, cfg.WSAllowedOrigins, cfg.AuthServiceURL, cfg.AdminWritesOff)

	server := &http.Server{Addr: cfg.HTTPAddr, Handler: h.Routes()}
	go func() {
		logger.Info("server listening", zap.String("addr", cfg.HTTPAddr))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("serve http", zap.Error(err))
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown server: %w", err)
	}
	return nil
}

func syncLogger(logger *zap.Logger) {
	if err := logger.Sync(); err != nil && !errors.Is(err, syscall.EINVAL) && !errors.Is(err, os.ErrInvalid) {
		_, _ = fmt.Fprintf(os.Stderr, "sync logger: %v\n", err)
	}
}
