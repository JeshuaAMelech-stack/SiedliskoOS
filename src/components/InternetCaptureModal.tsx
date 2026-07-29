import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CaptureDraft, CaptureResult } from "../models/Capture";
import type { PropertyInput } from "../models/Property";

type Props = {
  onClose: () => void;
  onSave: (property: PropertyInput) => void | Promise<void>;
};

const emptyDraft: CaptureDraft = {
  name: "",
  location: "",
  price: 0,
  area_ha: 0,
  notes: "",
};

export default function InternetCaptureModal({ onClose, onSave }: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [draft, setDraft] = useState<CaptureDraft>(emptyDraft);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, saving]);

  const capture = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Wklej adres ogłoszenia.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const captured = await invoke<CaptureResult>("capture_listing", {
        url: trimmedUrl,
      });

      setResult(captured);
      setDraft({
        name: captured.title || "Nowa oferta z Internetu",
        location: "",
        price: 0,
        area_ha: 0,
        notes: [
          captured.description,
          `Źródło: ${captured.final_url}`,
          `Kopia HTML: ${captured.html_path}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
    } catch (captureError) {
      const message =
        captureError instanceof Error
          ? captureError.message
          : String(captureError);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result) {
      return;
    }

    if (!draft.name.trim()) {
      setError("Podaj nazwę działki lub oferty.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({
        name: draft.name.trim(),
        location: draft.location.trim(),
        price: Number(draft.price) || 0,
        area_ha: Number(draft.area_ha) || 0,
        status: "Nowa",
        record_type: "real",
        latitude: null,
        longitude: null,
        water: 0,
        topography: 0,
        farm_potential: 0,
        pasture: 0,
        access_score: 0,
        price_score: 0,
        notes: draft.notes.trim(),
      });
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setResult(null);
    setDraft(emptyDraft);
    setError("");
  };

  return (
    <div className="overlay captureOverlay" onMouseDown={onClose}>
      <section
        className="modal captureModal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="captureHeading">
          <div>
            <span className="captureEyebrow">Internet Capture</span>
            <h2>{result ? "Sprawdź przechwyconą ofertę" : "Przechwyć ogłoszenie"}</h2>
            <p>
              {result
                ? "Uzupełnij brakujące dane i zapisz ofertę na dashboardzie."
                : "Wklej link. SiedliskoOS zachowa lokalną kopię strony."}
            </p>
          </div>
          <button
            className="captureClose"
            onClick={onClose}
            disabled={busy || saving}
          >
            ×
          </button>
        </div>

        {!result ? (
          <>
            <label className="captureUrlField">
              Adres ogłoszenia
              <input
                autoFocus
                type="url"
                placeholder="https://www.otodom.pl/..."
                value={url}
                disabled={busy}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void capture();
                  }
                }}
              />
            </label>

            {error && <div className="captureError">Błąd: {error}</div>}

            <div className="captureInfo">
              Strona zostanie zachowana lokalnie. Przed dodaniem do bazy zawsze
              zobaczysz podgląd i możesz poprawić dane.
            </div>

            <div className="actions">
              <button className="secondary" onClick={onClose} disabled={busy}>
                Anuluj
              </button>
              <button className="primary" onClick={capture} disabled={busy}>
                {busy ? "Pobieranie…" : "Przechwyć ofertę"}
              </button>
            </div>
          </>
        ) : (
          <div className="capturePreview">
            <div className="captureSourceCard">
              <div>
                <span className="captureSourceLabel">Przechwycona strona</span>
                <strong>{result.title || "Strona bez tytułu"}</strong>
                <a href={result.final_url} target="_blank" rel="noreferrer">
                  {result.final_url}
                </a>
              </div>
              <span>{Math.max(1, Math.round(result.content_length / 1024))} KB</span>
            </div>

            <div className="captureFormGrid">
              <label className="captureWideField">
                Nazwa
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>

              <label>
                Miejscowość
                <input
                  value={draft.location}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Cena (PLN)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.price || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      price: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label>
                Powierzchnia (ha)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.area_ha || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      area_ha: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label className="captureWideField">
                Notatki
                <textarea
                  rows={8}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </label>
            </div>

            {error && <div className="captureError">Błąd: {error}</div>}

            <div className="actions capturePreviewActions">
              <button className="secondary" onClick={reset} disabled={saving}>
                Wklej inny link
              </button>
              <button className="secondary" onClick={onClose} disabled={saving}>
                Anuluj
              </button>
              <button className="primary" onClick={save} disabled={saving}>
                {saving ? "Zapisywanie…" : "Zapisz na dashboardzie"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
