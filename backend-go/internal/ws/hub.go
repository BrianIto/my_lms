// Package ws implements WebSocket hub and clients.
package ws

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.uber.org/zap"
)

// Hub manages websocket clients and broadcasts.
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	logger     *zap.Logger
}

// NewHub creates a Hub.
func NewHub(logger *zap.Logger) *Hub {
	return &Hub{clients: map[*Client]bool{}, broadcast: make(chan []byte), register: make(chan *Client), unregister: make(chan *Client), logger: logger}
}

// Run starts the Hub loop.
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case c := <-h.register:
			h.clients[c] = true
		case c := <-h.unregister:
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
		case msg := <-h.broadcast:
			_, span := otel.Tracer("ws").Start(ctx, "broadcast")
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
					delete(h.clients, c)
					close(c.send)
				}
			}
			span.End()
		}
	}
}

// Broadcast queues a message.
func (h *Hub) Broadcast(message []byte) { h.broadcast <- message }
