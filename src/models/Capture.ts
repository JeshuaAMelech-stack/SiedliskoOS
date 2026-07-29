import type { PropertyInput } from "./Property";

export type CaptureResult = {
  source_url: string;
  final_url: string;
  title: string;
  description: string;
  captured_at: string;
  html_path: string;
  metadata_path: string;
  content_length: number;
};

export type CaptureDraft = Pick<
  PropertyInput,
  "name" | "location" | "price" | "area_ha" | "notes"
>;
