package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AAASettingsRequest defines the expected body for the /aaa endpoint.
type AAASettingsRequest struct {
	SettingName []string `json:"settingName" binding:"required"`
}

type AAAResponse struct {
	Names []string `json:"names"`
	Text  string   `json:"text"`
}

// ProcessAAASettings handles the POST /aaa endpoint.
// @Summary Process AAA settings
// @Description Receives AAA settings and an authorization token.
// @Accept  json
// @Produce json
// @Param   Authorization header string true "Authorization token"
// @Param   settings body AAASettingsRequest true "Settings to process"
// @Success 200 {object} AAAResponse "Successfully processed settings"
// @Failure 400 {object} AAAResponse "Bad Request - Invalid input"
// @Failure 401 {object} AAAResponse "Unauthorized - Missing Authorization header"
// @Router /aaa [post]
func ProcessAAASettings(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, AAAResponse{Text: "Authorization header is required"})
		return
	}

	var req AAASettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, AAAResponse{Text: "Invalid request body: " + err.Error()})
		return
	}

	fmt.Println("Authorization header received.")
	fmt.Println("req", req)

	// TODO:

	// For now, just acknowledge receipt. You can add more processing logic here.
	responseText := "Authorization header received."
	c.JSON(http.StatusOK, AAAResponse{Names: req.SettingName, Text: responseText})
}
