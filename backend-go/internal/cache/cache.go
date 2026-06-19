// Package cache wraps Redis operations.
package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/extra/redisotel/v9"
	"github.com/redis/go-redis/v9"
)

// RedisCache wraps a go-redis client.
type RedisCache struct{ client *redis.Client }

// New creates an instrumented Redis cache.
func New(addr, password string) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{Addr: addr, Password: password})
	if err := redisotel.InstrumentTracing(client); err != nil {
		return nil, fmt.Errorf("instrument redis tracing: %w", err)
	}
	if err := redisotel.InstrumentMetrics(client); err != nil {
		return nil, fmt.Errorf("instrument redis metrics: %w", err)
	}
	return &RedisCache{client: client}, nil
}

// Get returns a value by key.
func (c *RedisCache) Get(ctx context.Context, key string) (string, error) {
	v, err := c.client.Get(ctx, key).Result()
	if err != nil {
		return "", fmt.Errorf("redis get: %w", err)
	}
	return v, nil
}

// Set stores a value with TTL.
func (c *RedisCache) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	if err := c.client.Set(ctx, key, value, ttl).Err(); err != nil {
		return fmt.Errorf("redis set: %w", err)
	}
	return nil
}

// Delete removes a key.
func (c *RedisCache) Delete(ctx context.Context, key string) error {
	if err := c.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("redis delete: %w", err)
	}
	return nil
}

// Publish sends a pub/sub message.
func (c *RedisCache) Publish(ctx context.Context, channel, payload string) error {
	if err := c.client.Publish(ctx, channel, payload).Err(); err != nil {
		return fmt.Errorf("redis publish: %w", err)
	}
	return nil
}

// Subscribe subscribes to a channel.
func (c *RedisCache) Subscribe(ctx context.Context, channel string) *redis.PubSub {
	return c.client.Subscribe(ctx, channel)
}

// Close closes the Redis client.
func (c *RedisCache) Close() error {
	if err := c.client.Close(); err != nil {
		return fmt.Errorf("close redis: %w", err)
	}
	return nil
}
