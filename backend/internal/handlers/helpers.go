package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
)

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func parseSkillsCSV(csv string) []string {
	if strings.TrimSpace(csv) == "" {
		return []string{}
	}
	raw := strings.Split(csv, ",")
	out := make([]string, 0, len(raw))
	seen := map[string]struct{}{}
	for _, s := range raw {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

