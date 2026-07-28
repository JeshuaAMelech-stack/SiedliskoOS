import { deleteTestProperties } from "../database/properties";
import type { PropertyFilter } from "../models/App";
import type { Property } from "../models/Property";
import PropertyTable from "./PropertyTable";

type Props = {
  rows: Property[];
  query: string;
  filter: PropertyFilter;
  setQuery: (value: string) => void;
  setFilter: (value: PropertyFilter) => void;
  open: (property: Property) => void;
  deleteItem: (id: number) => void | Promise<void>;
  reload: () => void | Promise<void>;
};

export default function ListView({
  rows,
  query,
  filter,
  setQuery,
  setFilter,
  open,
  deleteItem,
  reload,
}: Props) {
  const removeTestProperties = async () => {
    if (!confirm("Usunąć testowe?")) {
      return;
    }

    await deleteTestProperties();
    await reload();
  };

  const removeProperty = async (id: number) => {
    if (!confirm("Usunąć rekord?")) {
      return;
    }

    await deleteItem(id);
  };

  return (
    <>
      <div className="toolbar">
        <input
          placeholder="Szukaj…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as PropertyFilter)
          }
        >
          <option value="all">Wszystkie</option>
          <option value="real">Realne</option>
          <option value="test">Testowe</option>
        </select>

        <button onClick={removeTestProperties}>Usuń testowe</button>
      </div>

      <PropertyTable rows={rows} open={open} del={removeProperty} />
    </>
  );
}
