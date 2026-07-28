import type { Property as Item } from "../models/Property";
import Metric from "./Metric";
import PropertyTable from "./PropertyTable";
import { propertyScore } from "../utils/property";

type Props = {
  items: Item[];
  open: (item?: Item) => void;
  deleteItem: (id: number) => void | Promise<void>;
};

export default function DashboardView({
  items,
  open,
  deleteItem,
}: Props) {
  const averageArea =
    items.length > 0
      ? (
          items.reduce((total, item) => total + item.area_ha, 0) / items.length
        ).toFixed(1)
      : "0";

  const topItems = [...items]
    .sort((a, b) => propertyScore(b) - propertyScore(a))
    .slice(0, 8);

  return (
    <>
      <section className="metrics">
        <Metric n={items.length} t="Wszystkie" />
        <Metric
          n={items.filter((item) => item.record_type === "real").length}
          t="Realne"
        />
        <Metric
          n={items.filter((item) => item.record_type === "test").length}
          t="Testowe"
        />
        <Metric n={`${averageArea} ha`} t="Średnia powierzchnia" />
      </section>

      <PropertyTable
        rows={topItems}
        open={open}
        del={deleteItem}
      />
    </>
  );
}
