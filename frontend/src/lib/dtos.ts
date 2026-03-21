export type OpportunityMarkerDTO = {
  id: string;
  title: string;
  description?: string;
  company: string;
  type: string;
  workFormat?: string;
  locationType?: string;
  addressText?: string | null;
  cityText?: string | null;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  lat: number;
  lng: number;
};

