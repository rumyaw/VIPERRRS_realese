package config

import (
	"fmt"
	"os"
	"strings"
)

// Config загружается из переменных окружения (и опционально .env через godotenv в main).
type Config struct {
	HTTPAddr     string
	DatabaseURL  string
	JWTSecret    string
	CORSOrigins  []string
}

func Load() (Config, error) {
	databaseURL := firstNonEmptyEnv("DATABASE_URL", "TRUMPLIN_DATABASE_URL", "TRUMPLIN_DATABASE_DSN")
	jwtSecret := firstNonEmptyEnv("JWT_SECRET", "TRUMPLIN_JWT_SECRET")
	httpAddr := firstNonEmptyEnv("HTTP_ADDR", "TRUMPLIN_HTTP_ADDR")
	if httpAddr == "" {
		httpAddr = ":8080"
	}
	cors := firstNonEmptyEnv("CORS_ORIGINS", "TRUMPLIN_CORS_ORIGIN", "TRUMPLIN_CORS_ORIGINS")
	if cors == "" {
		cors = "http://localhost:3000"
	}

	c := Config{
		HTTPAddr:    strings.TrimSpace(httpAddr),
		DatabaseURL: strings.TrimSpace(databaseURL),
		JWTSecret:   strings.TrimSpace(jwtSecret),
	}
	rawCORS := cors
	for _, o := range strings.Split(rawCORS, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			c.CORSOrigins = append(c.CORSOrigins, o)
		}
	}
	if c.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if len(c.JWTSecret) < 32 {
		return Config{}, fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}
	return c, nil
}

func getEnv(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func firstNonEmptyEnv(keys ...string) string {
	for _, key := range keys {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return v
		}
	}
	return ""
}
