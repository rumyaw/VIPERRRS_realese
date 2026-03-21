package geocode

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"trumplin/internal/config"
	"trumplin/internal/db"
)

type Service struct {
	cfg *config.Config
	db  *db.Database
}

func New(cfg *config.Config, database *db.Database) *Service {
	return &Service{cfg: cfg, db: database}
}

type geocodeResponse struct {
	GeoObjectCollection struct {
		featureMember []struct {
			GeoObject struct {
				Point struct {
					Pos string `json:"pos"`
				} `json:"Point"`
			} `json:"GeoObject"`
		} `json:"featureMember"`
	} `json:"GeoObjectCollection"`
}

func normalizeQuery(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ToLower(s)
	// Collapse whitespace.
	return strings.Join(strings.Fields(s), " ")
}

// Geocode returns lat,lng for an input address/city using Yandex HTTP Geocoder.
// It uses DB cache to avoid repetitive API calls.
func (s *Service) Geocode(ctx context.Context, query string) (lat float64, lng float64, err error) {
	q := normalizeQuery(query)
	if q == "" {
		return 0, 0, errors.New("empty_query")
	}

	var cachedLat, cachedLng float64
	if err := s.db.DB.QueryRowContext(
		ctx,
		`SELECT lat, lng FROM address_geocode_cache WHERE norm_query=?`,
		q,
	).Scan(&cachedLat, &cachedLng); err == nil {
		return cachedLat, cachedLng, nil
	}

	lat, lng, err = s.geocodeHttp(ctx, q)
	if err != nil {
		return 0, 0, err
	}

	// Cache best-effort.
	_, _ = s.db.DB.ExecContext(ctx,
		`INSERT INTO address_geocode_cache (norm_query, lat, lng, created_at, last_success_at)
		 VALUES (?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
		 ON CONFLICT (norm_query) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng, last_success_at=CURRENT_TIMESTAMP`,
		q, lat, lng,
	)

	return lat, lng, nil
}

func (s *Service) geocodeHttp(ctx context.Context, queryNorm string) (lat float64, lng float64, err error) {
	if s.cfg.Yandex.GeocoderKey == "" || s.cfg.Yandex.GeocoderKey == "CHANGE_ME" {
		return 0, 0, errors.New("yandex_geocoder_key_not_configured")
	}

	base := s.cfg.Yandex.GeocoderBaseURL
	u, err := url.Parse(base)
	if err != nil {
		return 0, 0, err
	}
	// Keep base path as-is, add params.
	q := u.Query()
	q.Set("apikey", s.cfg.Yandex.GeocoderKey)
	q.Set("geocode", queryNorm)
	q.Set("format", "json")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return 0, 0, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return 0, 0, fmt.Errorf("yandex_geocoder_http_status: %d", resp.StatusCode)
	}

	var decoded geocodeResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return 0, 0, err
	}

	if len(decoded.GeoObjectCollection.featureMember) == 0 {
		return 0, 0, errors.New("yandex_no_results")
	}

	pos := decoded.GeoObjectCollection.featureMember[0].GeoObject.Point.Pos
	// Typical format: "lon lat"
	parts := strings.Fields(pos)
	if len(parts) != 2 {
		return 0, 0, errors.New("yandex_pos_parse_failed")
	}

	// Parse floats.
	var lon, la float64
	if _, err := fmt.Sscanf(parts[0], "%f", &lon); err != nil {
		return 0, 0, err
	}
	if _, err := fmt.Sscanf(parts[1], "%f", &la); err != nil {
		return 0, 0, err
	}

	return la, lon, nil
}

