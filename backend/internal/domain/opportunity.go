package domain

import (
	"time"

	"github.com/google/uuid"
)

type Opportunity struct {
	ID               uuid.UUID
	AuthorID         uuid.UUID
	Title            string
	ShortDescription string
	FullDescription  string
	CompanyName      string
	Type             string
	WorkFormat       string
	LocationLabel    string
	Lon              *float64
	Lat              *float64
	PublishedAt      time.Time
	ValidUntil       *time.Time
	EventAt          *time.Time
	SalaryMin        *int
	SalaryMax        *int
	Currency         string
	Contacts         map[string]any
	Tags             []string
	Level            string
	Employment       string
	MediaURL         *string
	ModerationStatus string
	/** JSON черновика правки; на сайте до одобрения показываются основные поля строки. */
	PendingRevision []byte
	/** pending | rejected — статус проверки правки; nil если правки нет. */
	RevisionModerationStatus *string
	ViewCount                int64
	CreatedAt                time.Time
	UpdatedAt                time.Time
}
