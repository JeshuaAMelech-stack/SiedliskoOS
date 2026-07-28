import type { AppView } from "../models/App";

type Props = {
  view: AppView;
  itemCount: number;
  onChangeView: (view: AppView) => void;
};

const navigationItems: Array<{
  view: AppView;
  label: string;
}> = [
  { view: "dash", label: "Dashboard" },
  { view: "list", label: "Nieruchomości" },
  { view: "map", label: "Mapa" },
  { view: "settings", label: "⚙ Ustawienia" },
];

export default function Sidebar({
  view,
  itemCount,
  onChangeView,
}: Props) {
  return (
    <aside>
      <div className="brand">
        🌲 SiedliskoOS <small>ALPHA · v0.2.1</small>
      </div>

      {navigationItems.map((item) => (
        <button
          key={item.view}
          className={view === item.view ? "active" : undefined}
          onClick={() => onChangeView(item.view)}
        >
          {item.label}
        </button>
      ))}

      <div className="bottom">SQLite · {itemCount} rekordów</div>
    </aside>
  );
}
