import type { Property as Item } from "../models/Property";
import Metric from "./Metric";
import PropertyTable from "./PropertyTable";

 type Props = {
  items: Item[];
  open: (item?: Item) => void;
  deleteItem: (id: number) => void | Promise<void>;
};

export default function DashboardView({ items, open, deleteItem }: Props) {
  const averageArea = items.length > 0
    ? (items.reduce((total, item) => total + item.area_ha, 0) / items.length).toFixed(1)
    : "0";

  const recentItems = [...items].sort((a, b) => b.id - a.id).slice(0, 8);

  return (
    <>
      <section className="metrics">
        <Metric n={items.length} t="Wszystkie" />
        <Metric n={items.filter((item) => item.record_type === "real").length} t="Realne" />
        <Metric n={items.filter((item) => item.status === "Nowa").length} t="Nowe" />
        <Metric n={`${averageArea} ha`} t="Średnia powierzchnia" />
      </section>

      <section className="dashboardSectionHeading">
        <div>
          <span>Centrum pracy</span>
          <h2>Ostatnio dodane nieruchomości</h2>
        </div>
        <small>{recentItems.length > 0 ? "Najnowsze rekordy są na górze" : "Dodaj pierwszą ofertę"}</small>
      </section>

      <PropertyTable rows={recentItems} open={open} del={deleteItem} />
    </>
  );
}
