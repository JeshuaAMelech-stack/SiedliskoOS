import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { addDemoProperties } from "./database/properties";
import SettingsView from "./components/SettingsView";
import PropertyForm from "./components/PropertyForm";
import DashboardView from "./components/DashboardView";
import ListView from "./components/ListView";
import MapView from "./components/MapView";
import Header, { type AppView } from "./components/Header";
import Sidebar from "./components/Sidebar";
import useProperties from "./hooks/useProperties";

export default function App() {
  const [view, setView] = useState<AppView>("dash");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const {
    items,
    form,
    edit,
    setForm,
    load,
    open,
    closeForm,
    submit,
    removeItem,
  } = useProperties();

  const shown = useMemo(
    () =>
      items.filter(
        (x) =>
          (filter === "all" || x.record_type === filter) &&
          `${x.name} ${x.location}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [items, filter, q],
  );

  const addDemoData = async () => {
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
      <Sidebar
        view={view}
        itemCount={items.length}
        onChangeView={setView}
      />

      <main>
        <Header
          view={view}
          demoBusy={demoBusy}
          notice={notice}
          onAddDemoData={addDemoData}
          onAddProperty={() => open()}
        />

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
