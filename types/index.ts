export interface CandidatePoint {
  longitude: number;
  latitude: number;
  temp_seasonality: number;
  temp_annual_range: number;
  precip_driest_quarter: number;
  max_temp_warmest_month: number;
  annual_precipitation: number;
  precip_coldest_quarter: number;
  isothermality: number;
  elevation: number;
  sand_frac_pct: number;
  gravel_frac_pct: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  analysis: string;
  features: string[];
}
