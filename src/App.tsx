import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  initDatabase,
  listProperties,
  saveProperty,
  deleteProperty,
  addDemoProperties,
} from "./database/properties";
import type { Property as Item } from "./models/Property";
import UpdateChecker from "./UpdateChecker";
import SettingsView from "./components/SettingsView";
import PropertyForm from "./components/PropertyForm";
import DashboardView from "./components/DashboardView";
import ListView from "./components/ListView";
import MapView from "./components/MapView";

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
          <ListView
            rows={shown}
            query={q}
            filter={filter}
            setQuery={setQ}
            setFilter={setFilter}
            open={open}
            deleteItem={removeItem}
            reload={load}
          />
        )}

        {view === "map" && <MapView rows={shown} open={open} />}

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
