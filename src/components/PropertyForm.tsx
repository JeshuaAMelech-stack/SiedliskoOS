import type { Dispatch, SetStateAction } from "react";
import type { Property as Item } from "../models/Property";
import PropertyModal from "./PropertyModal";

type PropertyDraft = Omit<Item, "id">;

type Props = {
  form: PropertyDraft;
  isEditing: boolean;
  setForm: Dispatch<SetStateAction<PropertyDraft | null>>;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
};

const textAndNumberFields = [
  ["name", "Nazwa"],
  ["location", "Miejscowość"],
  ["price", "Cena"],
  ["area_ha", "Powierzchnia ha"],
  ["latitude", "Szerokość"],
  ["longitude", "Długość"],
  ["source_url", "Link do ogłoszenia"],
  ["portal", "Portal"],
  ["listing_id", "ID ogłoszenia"],
] as const;

const numberFields = new Set([
  "price",
  "area_ha",
  "latitude",
  "longitude",
]);

const scoreFields = [
  "water",
  "topography",
  "farm_potential",
  "pasture",
  "access_score",
  "price_score",
] as const;

const scoreLabels: Record<(typeof scoreFields)[number], string> = {
  water: "Woda",
  topography: "Ukształtowanie terenu",
  farm_potential: "Potencjał gospodarstwa",
  pasture: "Pastwiska",
  access_score: "Dojazd",
  price_score: "Cena",
};

export default function PropertyForm({
  form,
  isEditing,
  setForm,
  onCancel,
  onSubmit,
}: Props) {
  const updateForm = (changes: Partial<PropertyDraft>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
  };

  return (
    <PropertyModal onClose={onCancel}>
      <h2>{isEditing ? "Edytuj" : "Nowa działka"}</h2>

      <div className="grid">
        {textAndNumberFields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type={key === "source_url" ? "url" : numberFields.has(key) ? "number" : "text"}
              step="any"
              value={form[key] ?? ""}
              onChange={(event) => {
                const value = event.target.value;

                updateForm({
                  [key]: numberFields.has(key)
                    ? value === ""
                      ? null
                      : Number(value)
                    : value,
                } as Partial<PropertyDraft>);
              }}
            />
          </label>
        ))}

        <label>
          Typ
          <select
            value={form.record_type}
            onChange={(event) =>
              updateForm({
                record_type: event.target.value as "real" | "test",
              })
            }
          >
            <option value="real">Realna</option>
            <option value="test">Testowa</option>
          </select>
        </label>

        {scoreFields.map((key) => (
          <label key={key}>
            {scoreLabels[key]}: {form[key]}
            <input
              type="range"
              min="0"
              max="10"
              value={form[key]}
              onChange={(event) =>
                updateForm({ [key]: Number(event.target.value) })
              }
            />
          </label>
        ))}
      </div>

      {form.source_url && (
        <div className="propertySourceBox">
          <div>
            <span>Źródło ogłoszenia</span>
            <strong>{form.portal || "Internet"}{form.listing_id ? ` · ${form.listing_id}` : ""}</strong>
          </div>
          <a className="sourceLinkButton" href={form.source_url} target="_blank" rel="noreferrer">
            Otwórz ogłoszenie ↗
          </a>
        </div>
      )}

      <div className="actions">
        <button onClick={onCancel}>Anuluj</button>
        <button className="primary" onClick={onSubmit}>
          Zapisz
        </button>
      </div>
    </PropertyModal>
  );
}
