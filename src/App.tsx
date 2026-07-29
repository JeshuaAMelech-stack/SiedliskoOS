import { useMemo, useState } from "react";
import DashboardView from "./components/DashboardView";
import Header from "./components/Header";
import InternetCaptureModal from "./components/InternetCaptureModal";
import ListView from "./components/ListView";
import MapView from "./components/MapView";
import PropertyForm from "./components/PropertyForm";
import SettingsView from "./components/SettingsView";
import Sidebar from "./components/Sidebar";
import useBackup from "./hooks/useBackup";
import useDemoData from "./hooks/useDemoData";
import useProperties from "./hooks/useProperties";
import type { AppView, PropertyFilter } from "./models/App";

export default function App() {
  const [view, setView] = useState<AppView>("dash");
  const [filter, setFilter] = useState<PropertyFilter>("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);

  const {
    items: properties,
    form,
    edit: editingProperty,
    setForm,
    load,
    open,
    closeForm,
    submit,
    add,
    removeItem,
  } = useProperties();

  const { backupBusy, createBackup } = useBackup(setNotice);
  const { demoBusy, addDemoData } = useDemoData(load, setNotice);

  const visibleProperties = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesFilter =
        filter === "all" || property.record_type === filter;
      const matchesQuery =
        !normalisedQuery ||
        `${property.name} ${property.location}`
          .toLowerCase()
          .includes(normalisedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, properties, query]);

  return (
    <div className="app">
      <Sidebar
        view={view}
        itemCount={properties.length}
        onChangeView={setView}
      />

      <main>
        <Header
          view={view}
          demoBusy={demoBusy}
          notice={notice}
          onAddDemoData={addDemoData}
          onAddProperty={() => open()}
          onCaptureInternet={() => setCaptureOpen(true)}
        />

        {view === "dash" && (
          <DashboardView
            items={properties}
            open={open}
            deleteItem={removeItem}
          />
        )}

        {view === "list" && (
          <ListView
            rows={visibleProperties}
            query={query}
            filter={filter}
            setQuery={setQuery}
            setFilter={setFilter}
            open={open}
            deleteItem={removeItem}
            reload={load}
          />
        )}

        {view === "map" && (
          <MapView rows={visibleProperties} open={open} />
        )}

        {view === "settings" && (
          <SettingsView
            backupBusy={backupBusy}
            createBackup={createBackup}
          />
        )}
      </main>

      {captureOpen && (
        <InternetCaptureModal
          onClose={() => setCaptureOpen(false)}
          onSave={async (property) => {
            await add(property);
            setView("dash");
          }}
        />
      )}

      {form && (
        <PropertyForm
          form={form}
          isEditing={Boolean(editingProperty)}
          setForm={setForm}
          onCancel={closeForm}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
