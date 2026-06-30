export type TransactionType = "achat" | "location";

export interface UserPreferences {
  id: string;
  userId: string;
  transactionType: TransactionType;
  budgetMin: number;
  budgetMax: number;
  zones: string[];
  propertyTypes: PropertyType[];
  bedroomsMin: number;
  bedroomsMax: number | null;
  surfaceMin: number | null;
  surfaceMax: number | null;
  pebScores: PebScore[];
  features: string[];
  dealBreakers: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PropertyType = "maison" | "appartement" | "studio" | "duplex" | "villa" | "terrain" | "immeuble";

export type PebScore = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface Property {
  id: string;
  externalId: string;
  source: string;
  url: string;
  title: string;
  description: string | null;
  price: number;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  surface: number | null;
  landSurface: number | null;
  pebScore: PebScore | null;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrls: string[];
  features: string[];
  rawData: Record<string, unknown> | null;
  scrapedAt: string;
  createdAt: string;
}

export interface PropertyMatch {
  id: string;
  userId: string;
  propertyId: string;
  score: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  isFavorite: boolean;
  isViewed: boolean;
  isDismissed: boolean;
  isValidated: boolean;
  createdAt: string;
  property?: Property;
}

export interface ScoringResult {
  score: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}
