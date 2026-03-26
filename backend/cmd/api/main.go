package main

import (
	"context"
	"log"
	"net/http"
	"path/filepath"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"tramplin/internal/config"
	"tramplin/internal/db"
	"tramplin/internal/httpapi"
	"tramplin/internal/repository"
	"tramplin/internal/service"
)

func main() {
	loadDotEnv()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	userRepo := repository.NewUserRepository(pool)
	oppRepo := repository.NewOpportunityRepository(pool)
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret)
	oppSvc := service.NewOpportunityService(oppRepo)

	handler := httpapi.NewRouter(cfg, authSvc, oppSvc, userRepo, oppRepo)
	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("tramplin-api listening on %s", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func loadDotEnv() {
	paths := []string{
		".env",
		filepath.Join("..", "..", ".env"),
		filepath.Join("backend", ".env"),
	}
	_ = godotenv.Load(paths...)
}
