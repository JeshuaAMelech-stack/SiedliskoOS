import { useMemo, useState } from "react";
import SettingsView from "./components/SettingsView";
import PropertyForm from "./components/PropertyForm";
import DashboardView from "./components/DashboardView";
import ListView from "./components/ListView";
import MapView from "./components/MapView";
import Header, { type AppView } from "./components/Header";
import Sidebar from "./components/Sidebar";
import useProperties from "./hooks/useProperties";
import useBackup from "./hooks/useBackup";
import useDemoData from "./hooks/useDemoData";

export default function App() {
  const [view, setView] = useState<AppView>("dash");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
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

  const { backupBusy, createBackup } = useBackup(setNotice);
  const { demoBusy, addDemoData } = useDemoData(load, setNotice);

  const shown = useMemo(
    () =>
      items.filter(
        (x) =>
          (filter === "all" || x.record_type === filter) &&
          `${x.name} ${x.location}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [items, filter, q],
  );

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
