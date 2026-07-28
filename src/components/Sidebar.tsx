import type { AppView } from "./Header";

type Props = {
  view: AppView;
  itemCount: number;
  onChangeView: (view: AppView) => void;
};

export default function Sidebar({
  view,
  itemCount,
  onChangeView,
}: Props) {
  const navButton = (target: AppView, label: string) => (
    <button
      className={view === target ? "active" : undefined}
      onClick={() => onChangeView(target)}
    >
      {label}
    </button>
  );

  return (
    <aside>
      <div className="brand">
        🌲 SiedliskoOS <small>ALPHA · v0.2.1</small>
      </div>

      {navButton("dash", "Dashboard")}
      {navButton("list", "Nieruchomości")}
      {navButton("map", "Mapa")}
      {navButton("settings", "⚙ Ustawienia")}

      <div className="bottom">SQLite · {itemCount} rekordów</div>
    </aside>
  );
}
