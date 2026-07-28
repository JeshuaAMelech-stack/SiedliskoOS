import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { addDemoProperties } from "../database/properties";

type UseDemoDataResult = {
  demoBusy: boolean;
  addDemoData: () => Promise<void>;
};

export default function useDemoData(
  reloadProperties: () => Promise<void>,
  setNotice: Dispatch<SetStateAction<string>>,
): UseDemoDataResult {
  const [demoBusy, setDemoBusy] = useState(false);

  const addDemoData = useCallback(async () => {
    setDemoBusy(true);
    setNotice("Dodaję dane testowe…");

    try {
      const addedCount = await addDemoProperties();
      await reloadProperties();

      setNotice(
        addedCount > 0
          ? `Dodano ${addedCount} działek testowych.`
          : "Dane testowe już znajdują się w bazie.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      setNotice(`Błąd: ${message}`);
      alert(`Nie udało się dodać danych testowych:\n\n${message}`);
    } finally {
      setDemoBusy(false);
    }
  }, [reloadProperties, setNotice]);

  return {
    demoBusy,
    addDemoData,
  };
}
