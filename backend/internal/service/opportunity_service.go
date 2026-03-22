package service

import (
	"context"

	"github.com/google/uuid"
	"tramplin/internal/domain"
	"tramplin/internal/repository"
)

type OpportunityService struct {
	repo *repository.OpportunityRepository
}

func NewOpportunityService(repo *repository.OpportunityRepository) *OpportunityService {
	return &OpportunityService{repo: repo}
}

func (s *OpportunityService) List(ctx context.Context, limit, offset int) ([]domain.Opportunity, error) {
	return s.repo.List(ctx, limit, offset)
}

func (s *OpportunityService) GetByID(ctx context.Context, id string) (*domain.Opportunity, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, uid)
}
