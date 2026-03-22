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
	c := Config{
		HTTPAddr:    getEnv("HTTP_ADDR", ":8080"),
		DatabaseURL: strings.TrimSpace(os.Getenv("DATABASE_URL")),
		JWTSecret:   strings.TrimSpace(os.Getenv("JWT_SECRET")),
	}
	rawCORS := getEnv("CORS_ORIGINS", "http://localhost:3000")
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
