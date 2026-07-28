type Props = {
  backupBusy: boolean;
  createBackup: () => Promise<void>;
};

export default function SettingsView({
  backupBusy,
  createBackup,
}: Props) {
  return (
    <div className="settingsPage">
      <section className="settingsCard">
        <div>
          <span className="settingsLabel">Wersja aplikacji</span>
          <strong>SiedliskoOS 0.2.1</strong>
        </div>
        <span className="settingsBadge">ALPHA</span>
      </section>

      <section className="settingsCard settingsColumn">
        <div>
          <span className="settingsLabel">Lokalna baza danych</span>
          <strong>SQLite · siedliskoos.db</strong>
          <p>Dane działek są przechowywane lokalnie na tym komputerze.</p>
        </div>
      </section>

      <section className="settingsCard settingsColumn">
        <div>
          <span className="settingsLabel">Kopia zapasowa</span>
          <strong>Backup i przywracanie</strong>
          <p>
            Kopia bazy zostanie zapisana w katalogu danych aplikacji, w folderze
            Backups.
          </p>
        </div>

        <button
          className="primary"
          disabled={backupBusy}
          onClick={createBackup}
        >
          {backupBusy ? "Tworzenie…" : "Utwórz backup"}
        </button>
      </section>
    </div>
  );
}