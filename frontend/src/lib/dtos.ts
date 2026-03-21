export type OpportunityMarkerDTO = {
  id: string;
  title: string;
  company: string;
  type: string;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  lat: number;
  lng: number;
  workFormat?: string;
};
