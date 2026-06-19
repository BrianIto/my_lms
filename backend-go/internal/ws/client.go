package ws

import (
	"bytes"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const writeWait = 10 * time.Second
const pongWait = 60 * time.Second
const pingPeriod = (pongWait * 9) / 10
const maxMessageSize = 512

// Client is a websocket client connection.
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	logger *zap.Logger
}

// Serve upgrades and registers a websocket connection.
func Serve(hub *Hub, allowedOrigins []string, dev bool, logger *zap.Logger) http.HandlerFunc {
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool {
		if dev {
			return true
		}
		origin := r.Header.Get("Origin")
		for _, o := range allowedOrigins {
			if strings.TrimSpace(o) == origin {
				return true
			}
		}
		return false
	}}

	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.Error("upgrade websocket", zap.Error(err))
			return
		}
		client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), logger: logger}
		client.hub.register <- client
		go client.writePump()
		go client.readPump()
	}
}

func (c *Client) readPump() {
	defer func() { c.hub.unregister <- c; _ = c.conn.Close() }()
	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { return c.conn.SetReadDeadline(time.Now().Add(pongWait)) })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		message = bytes.TrimSpace(bytes.ReplaceAll(message, []byte("\n"), []byte(" ")))
		c.hub.Broadcast(message)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() { ticker.Stop(); _ = c.conn.Close() }()
	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
