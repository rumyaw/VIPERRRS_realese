package handlers

import (
	"net/http"

	"tramplin/internal/httpapi/respond"
)

func HealthOK(w http.ResponseWriter, _ *http.Request) {
	respond.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "tramplin-api"})
}
