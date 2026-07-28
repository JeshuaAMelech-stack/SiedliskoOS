import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type UseBackupResult = {
  backupBusy: boolean;
  createBackup: () => Promise<void>;
};

export default function useBackup(
  setNotice: (message: string) => void,
): UseBackupResult {
  const [backupBusy, setBackupBusy] = useState(false);

  const createBackup = useCallback(async () => {
    setBackupBusy(true);
    setNotice("Tworzę kopię zapasową…");

    try {
      const path = await invoke<string>("create_backup");
      setNotice(`Backup utworzony: ${path}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      setNotice(`Błąd: ${message}`);
      alert(`Nie udało się utworzyć backupu:\n\n${message}`);
    } finally {
      setBackupBusy(false);
    }
  }, [setNotice]);

  return {
    backupBusy,
    createBackup,
  };
}
