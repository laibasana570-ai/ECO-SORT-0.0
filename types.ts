export enum WasteCategory {
  RECYCLE = 'RECYCLE',
  COMPOST = 'COMPOST',
  HAZARD = 'HAZARD',
  TRASH = 'TRASH',
  UNKNOWN = 'UNKNOWN'
}

export interface AnalysisResult {
  category: WasteCategory;
  itemName: string;
  confidence: number;
  reasoning: string;
  disposalAction: string;
  sustainabilityTip: string; // New field for fun/interesting facts
}

export interface AnalysisState {
  isLoading: boolean;
  result: AnalysisResult | null;
  error: string | null;
  imagePreview: string | null;
}