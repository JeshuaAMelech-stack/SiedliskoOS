import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  initDatabase,
  listProperties,
  saveProperty,
  deleteProperty,
  deleteTestProperties,
  addDemoProperties,
} from "./database/properties";
import type { Property as Item } from "./models/Property";
import UpdateChecker from "./UpdateChecker";
import Metric from "./components/Metric";
import PropertyTable from "./components/PropertyTable";
import { formatMoney, propertyScore } from "./utils/property";
const blank: Omit<Item, "id"> = {
  name: "",
  location: "",
  price: 0,
  area_ha: 0,
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
  notes: "",
};
const icon = (test: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="pin ${test ? "test" : "real"}"></div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
  });
export default function App() {
  const [view, setView] = useState<"dash" | "list" | "map" | "settings">(
    "dash",
  );
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Omit<Item, "id"> | null>(null);
  const [edit, setEdit] = useState<Item | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = async () => setItems(await listProperties());
  useEffect(() => {
    initDatabase().then(load);
  }, []);
  const shown = useMemo(
    () =>
      items.filter(
        (x) =>
          (filter === "all" || x.record_type === filter) &&
          `${x.name} ${x.location}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [items, filter, q],
  );
  const open = (x?: Item) => {
    setEdit(x || null);
    setForm(x ? { ...x } : blank);
  };
  const submit = async () => {
    if (!form?.name.trim()) return alert("Podaj nazwę");
    await saveProperty(form, edit?.id);
    setForm(null);
    setEdit(null);
    await load();
  };
  const createBackup = async () => {
    setBackupBusy(true);
    setNotice("Tworzę kopię zapasową…");
    try {
      const path = await invoke<string>("create_backup");
      setNotice(`Backup utworzony: ${path}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNotice(`Błąd: ${msg}`);
      alert(`Nie udało się utworzyć backupu:\n\n${msg}`);
    } finally {
      setBackupBusy(false);
    }
  };
  return (
    <div className="app">
      <aside>
        <div className="brand">
          🌲 SiedliskoOS <small>ALPHA · v0.2.1</small>
        </div>
        <button onClick={() => setView("dash")}>Dashboard</button>
        <button onClick={() => setView("list")}>Nieruchomości</button>
        <button onClick={() => setView("map")}>Mapa</button>
        <button onClick={() => setView("settings")}>⚙ Ustawienia</button>
        <div className="bottom">SQLite · {items.length} rekordów</div>
      </aside>
      <main>
        <header>
          <div>
            <h1>
              {view === "dash"
                ? "Dashboard"
                : view === "list"
                  ? "Nieruchomości"
                  : view === "map"
                    ? "Mapa działek"
                    : "Ustawienia"}
            </h1>
            <p>Wyszukiwanie siedliska w Pomorskiem</p>
          </div>
          <div className="headerActions">
            <UpdateChecker />
            <button
              className="secondary"
              disabled={demoBusy}
              onClick={async () => {
                setDemoBusy(true);
                setNotice("Dodaję dane testowe…");
                try {
                  const n = await addDemoProperties();
                  await load();
                  setNotice(
                    n > 0
                      ? `Dodano ${n} działek testowych.`
                      : "Dane testowe już znajdują się w bazie.",
                  );
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  setNotice(`Błąd: ${msg}`);
                  alert(`Nie udało się dodać danych testowych:

${msg}`);
                } finally {
                  setDemoBusy(false);
                }
              }}
            >
              {demoBusy ? "Dodawanie…" : "Dane testowe"}
            </button>
            <button className="primary" onClick={() => open()}>
              + Dodaj działkę
            </button>
          </div>
        </header>
        {notice && (
          <div
            className={notice.startsWith("Błąd") ? "notice error" : "notice"}
          >
            {notice}
          </div>
        )}
        {view === "dash" && (
          <>
            <section className="metrics">
              <Metric n={items.length} t="Wszystkie" />
              <Metric
                n={items.filter((x) => x.record_type === "real").length}
                t="Realne"
              />
              <Metric
                n={items.filter((x) => x.record_type === "test").length}
                t="Testowe"
              />
              <Metric
                n={`${items.length ? (items.reduce((a, b) => a + b.area_ha, 0) / items.length).toFixed(1) : 0} ha`}
                t="Średnia powierzchnia"
              />
            </section>
            <PropertyTable
              rows={[...items]
                .sort((a, b) => propertyScore(b) - propertyScore(a))
                .slice(0, 8)}
              open={open}
              del={async (id) => {
                await deleteProperty(id);
                await load();
              }}
            />
          </>
        )}
        {view === "list" && (
          <>
            <div className="toolbar">
              <input
                placeholder="Szukaj…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Wszystkie</option>
                <option value="real">Realne</option>
                <option value="test">Testowe</option>
              </select>
              <button
                onClick={async () => {
                  if (confirm("Usunąć testowe?")) {
                    await deleteTestProperties();
                    await load();
                  }
                }}
              >
                Usuń testowe
              </button>
            </div>
            <PropertyTable
              rows={shown}
              open={open}
              del={async (id) => {
                if (confirm("Usunąć rekord?")) {
                  await deleteProperty(id);
                  await load();
                }
              }}
            />
          </>
        )}
        {view === "map" && (
          <div className="mapGrid">
            <div className="mapList">
              <h3>Działki ({shown.length})</h3>
              {shown.map((x) => (
                <button key={x.id} onClick={() => open(x)}>
                  <b>{x.name}</b>
                  <span>
                    {x.location} · {x.area_ha} ha
                  </span>
                  <small>
                    {formatMoney(x.price)} · {propertyScore(x)}/100
                  </small>
                </button>
              ))}
            </div>
            <MapContainer center={[54.62, 18.08]} zoom={10}>
              <TileLayer
                attribution="© OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {shown
                .filter((x) => x.latitude && x.longitude)
                .map((x) => (
                  <Marker
                    key={x.id}
                    position={[x.latitude!, x.longitude!]}
                    icon={icon(x.record_type === "test")}
                  >
                    <Popup>
                      <b>{x.name}</b>
                      <br />
                      {x.location}
                      <br />
                      {formatMoney(x.price)} · {x.area_ha} ha
                      <br />
                      {propertyScore(x)}/100
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        )}
        {view === "settings" && (
          <div className="settingsPage">
            <section className="settingsCard">
              <div>
                <span className="settingsLabel">Wersja aplikacji</span>
                <strong>SiedliskoOS 0.2.1</strong>
              </div>
              <span className="settingsBadge">ALPHA</span>
            </section>

            <section className="settingsCard settingsColumn">
              <div>
                <span className="settingsLabel">Lokalna baza danych</span>
                <strong>SQLite · siedliskoos.db</strong>
                <p>Dane działek są przechowywane lokalnie na tym komputerze.</p>
              </div>
            </section>

            <section className="settingsCard settingsColumn">
              <div>
                <span className="settingsLabel">Kopia zapasowa</span>
                <strong>Backup i przywracanie</strong>
                <p>
                  Kopia bazy zostanie zapisana w katalogu danych aplikacji, w
                  folderze Backups.
                </p>
              </div>
              <button
                className="primary"
                disabled={backupBusy}
                onClick={createBackup}
              >
                {backupBusy ? "Tworzenie…" : "Utwórz backup"}
              </button>
            </section>
          </div>
        )}
      </main>
      {form && (
        <div className="overlay" onMouseDown={() => setForm(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>{edit ? "Edytuj" : "Nowa działka"}</h2>
            <div className="grid">
              {[
                ["name", "Nazwa"],
                ["location", "Miejscowość"],
                ["price", "Cena"],
                ["area_ha", "Powierzchnia ha"],
                ["latitude", "Szerokość"],
                ["longitude", "Długość"],
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <input
                    type={
                      ["price", "area_ha", "latitude", "longitude"].includes(k)
                        ? "number"
                        : "text"
                    }
                    step="any"
                    value={(form as any)[k] ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [k]: [
                          "price",
                          "area_ha",
                          "latitude",
                          "longitude",
                        ].includes(k)
                          ? e.target.value === ""
                            ? null
                            : Number(e.target.value)
                          : e.target.value,
                      })
                    }
                  />
                </label>
              ))}
              <label>
                Typ
                <select
                  value={form.record_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      record_type: e.target.value as "real" | "test",
                    })
                  }
                >
                  <option value="real">Realna</option>
                  <option value="test">Testowa</option>
                </select>
              </label>
              {(
                [
                  "water",
                  "topography",
                  "farm_potential",
                  "pasture",
                  "access_score",
                  "price_score",
                ] as const
              ).map((k) => (
                <label key={k}>
                  {k}: {form[k]}
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={form[k]}
                    onChange={(e) =>
                      setForm({ ...form, [k]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="actions">
              <button onClick={() => setForm(null)}>Anuluj</button>
              <button className="primary" onClick={submit}>
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
