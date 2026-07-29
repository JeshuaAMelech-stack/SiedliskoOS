import UpdateChecker from "../UpdateChecker";
import type { AppView } from "../models/App";

type Props = {
  view: AppView;
  demoBusy: boolean;
  notice: string;
  onAddDemoData: () => void | Promise<void>;
  onAddProperty: () => void;
  onCaptureInternet: () => void;
};

const titles: Record<AppView, string> = {
  dash: "Dashboard",
  list: "Nieruchomości",
  map: "Mapa działek",
  settings: "Ustawienia",
};

export default function Header({
  view,
  demoBusy,
  notice,
  onAddDemoData,
  onAddProperty,
  onCaptureInternet,
}: Props) {
  const noticeClassName = notice.startsWith("Błąd")
    ? "notice error"
    : "notice";

  return (
    <>
      <header>
        <div>
          <h1>{titles[view]}</h1>
          <p>Wyszukiwanie siedliska w Pomorskiem</p>
        </div>

        <div className="headerActions">
          <UpdateChecker />

          <button
            className="secondary"
            disabled={demoBusy}
            onClick={onAddDemoData}
          >
            {demoBusy ? "Dodawanie…" : "Dane testowe"}
          </button>

          <button className="secondary" onClick={onCaptureInternet}>
            🌐 Dodaj z Internetu
          </button>

          <button className="primary" onClick={onAddProperty}>
            + Dodaj działkę
          </button>
        </div>
      </header>

      {notice && <div className={noticeClassName}>{notice}</div>}
    </>
  );
}
