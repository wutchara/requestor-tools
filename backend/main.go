package main

import (
	"net/http"

	"github.com/gin-contrib/cors" // Import the cors middleware
	"github.com/gin-gonic/gin"
)

type Message struct {
	Text string `json:"text"`
}

func main() {
	router := gin.Default()

	// 1. Use the CORS middleware.
	// cors.Default() provides a permissive configuration allowing all origins.
	// This is perfect for development.
	router.Use(cors.Default())

	// 2. Define the GET route. The handler is now much cleaner.
	router.GET("/greet", func(c *gin.Context) {
		msg := Message{Text: "Hello from the Go backend! 👋"}

		// The middleware has already handled the CORS headers for you.
		// You only need to send the JSON response.
		c.JSON(http.StatusOK, msg)
	})

	// 3. Define a GET route for the root path '/'.
	router.GET("/", func(c *gin.Context) {
		welcomeMsg := Message{Text: "Welcome to the Requestor Tools API!"}
		c.JSON(http.StatusOK, welcomeMsg)
	})

	// 4. Start the server.
	router.Run(":8080")
}
