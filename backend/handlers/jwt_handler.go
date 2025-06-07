package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTRequest defines the expected body for the /jwt endpoint.
type JWTRequest struct {
	Token string `json:"token" binding:"required" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"`
}

// JWTResponse defines the response for the /jwt endpoint.
type JWTResponse struct {
	Claims map[string]interface{} `json:"claims,omitempty"`
	Text   string                 `json:"text,omitempty"` // For general messages or errors
}

// ProcessJWT handles the POST /jwt endpoint.
// @Summary Process JWT
// @Description Receives a JWT token in the body, decodes it, and returns the claims.
// @Description Note: This endpoint uses ParseUnverified for simplicity to show claims. For production, you MUST validate the token's signature and claims (e.g., 'exp', 'iss', 'aud').
// @Accept  json
// @Produce json
// @Param   token_payload body JWTRequest true "JWT Token to process"
// @Success 200 {object} JWTResponse "Successfully decoded JWT with claims"
// @Failure 400 {object} JWTResponse "Bad Request - Invalid input (e.g., missing token, malformed JSON)"
// @Failure 422 {object} JWTResponse "Unprocessable Entity - Invalid JWT (e.g., parsing error, failed to extract claims)"
// @Router /jwt [post]
func ProcessJWT(c *gin.Context) {
	var req JWTRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, JWTResponse{Text: "Invalid request body: " + err.Error()})
		return
	}

	if req.Token == "" {
		c.JSON(http.StatusBadRequest, JWTResponse{Text: "Token cannot be empty in the request body"})
		return
	}

	// Parse the token without verifying the signature.
	// IMPORTANT: For production environments, you MUST validate the signature using jwt.Parse with a proper jwt.Keyfunc.
	token, _, err := new(jwt.Parser).ParseUnverified(req.Token, jwt.MapClaims{})
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, JWTResponse{Text: "Invalid or malformed JWT: " + err.Error()})
		return
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		c.JSON(http.StatusOK, JWTResponse{Claims: claims, Text: "JWT processed successfully"})
	} else {
		c.JSON(http.StatusUnprocessableEntity, JWTResponse{Text: "Failed to extract claims from JWT"})
	}
}
