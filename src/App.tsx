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
import PropertyTable from "./components/PropertyTable";
import SettingsView from "./components/SettingsView";
import PropertyForm from "./components/PropertyForm";
import DashboardView from "./components/DashboardView";
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
    setForm(x ? { ...x } : { ...blank });
  };

  const closeForm = () => {
    setForm(null);
    setEdit(null);
  };

  const submit = async () => {
    if (!form?.name.trim()) {
      alert("Podaj nazwę");
      return;
    }

    await saveProperty(form, edit?.id);
    closeForm();
    await load();
  };

  const removeItem = async (id: number) => {
    await deleteProperty(id);
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
                  alert(`Nie udało się dodać danych testowych:\n\n${msg}`);
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
          <DashboardView
            items={items}
            open={open}
            deleteItem={removeItem}
          />
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
                  await removeItem(id);
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
          <SettingsView
            backupBusy={backupBusy}
            createBackup={createBackup}
          />
        )}
      </main>

      {form && (
        <PropertyForm
          form={form}
          isEditing={Boolean(edit)}
          setForm={setForm}
          onCancel={closeForm}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
