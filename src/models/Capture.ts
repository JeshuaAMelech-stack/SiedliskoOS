import type { PropertyInput } from "./Property";

export type CaptureResult = {
  source_url: string;
  final_url: string;
  portal: string;
  parser: string;
  source_title: string;
  title: string;
  description: string;
  location: string;
  price: number;
  area_ha: number;
  confidence: number;
  missing_fields: string[];
  captured_at: string;
  html_path: string;
  metadata_path: string;
  content_length: number;
  listing_id: string;
};

export type CaptureDraft = Pick<
  PropertyInput,
  "name" | "location" | "price" | "area_ha" | "notes" | "source_url" | "portal" | "listing_id" | "captured_at"
>;
