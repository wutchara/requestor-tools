package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Message struct is used for JSON responses.
type Message struct {
	Text string `json:"text"`
}

// Greet handles the /greet endpoint.
// @Summary Greet the user
// @Description Get a greeting message from the backend
// @Produce json
// @Success 200 {object} Message
// @Router /greet [get]
func Greet(c *gin.Context) {
	msg := Message{Text: "Hello from the Go backend! 👋"}
	c.JSON(http.StatusOK, msg)
}
