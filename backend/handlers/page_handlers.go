package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// PageData holds the data to be passed to the HTML template.
type PageData struct {
	Title       string
	TimePrefix  string
	InitialTime string
}

// PageStart handles the /page/start endpoint.
// @Summary Start Page
// @Description Renders a dynamic HTML start page.
// @Produce html
// @Success 200 {string} string "HTML content of the start page"
// @Router /page/start [get]
func PageStart(c *gin.Context) {
	data := PageData{
		Title:       "Dynamic Page with Go & Gin!",
		TimePrefix:  "The current time is ",
		InitialTime: time.Now().Format("3:04:05 PM"),
	}
	c.HTML(http.StatusOK, "template.html", data)
}
