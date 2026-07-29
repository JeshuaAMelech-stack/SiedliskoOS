import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  deleteProperty,
  initDatabase,
  listProperties,
  saveProperty,
} from "../database/properties";
import type { Property, PropertyInput } from "../models/Property";

const blankProperty: PropertyInput = {
  name: "",
  location: "",
  price: 0,
  area_ha: 0,
  status: "Nowa",
  record_type: "real",
  latitude: null,
  longitude: null,
  water: 0,
  topography: 0,
  farm_potential: 0,
  pasture: 0,
  access_score: 0,
  price_score: 0,
  notes: "",
};

type UsePropertiesResult = {
  items: Property[];
  form: PropertyInput | null;
  edit: Property | null;
  setForm: Dispatch<SetStateAction<PropertyInput | null>>;
  load: () => Promise<void>;
  open: (property?: Property) => void;
  closeForm: () => void;
  submit: () => Promise<void>;
  add: (property: PropertyInput) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
};

export default function useProperties(): UsePropertiesResult {
  const [items, setItems] = useState<Property[]>([]);
  const [form, setForm] = useState<PropertyInput | null>(null);
  const [edit, setEdit] = useState<Property | null>(null);

  const load = useCallback(async () => {
    setItems(await listProperties());
  }, []);

  useEffect(() => {
    const initialise = async () => {
      await initDatabase();
      await load();
    };

    void initialise();
  }, [load]);

  const open = useCallback((property?: Property) => {
    setEdit(property ?? null);
    setForm(property ? { ...property } : { ...blankProperty });
  }, []);

  const closeForm = useCallback(() => {
    setForm(null);
    setEdit(null);
  }, []);

  const submit = useCallback(async () => {
    if (!form?.name.trim()) {
      alert("Podaj nazwę");
      return;
    }

    await saveProperty(form, edit?.id);
    closeForm();
    await load();
  }, [closeForm, edit?.id, form, load]);

  const add = useCallback(
    async (property: PropertyInput) => {
      await saveProperty(property);
      await load();
    },
    [load],
  );

  const removeItem = useCallback(
    async (id: number) => {
      await deleteProperty(id);
      await load();
    },
    [load],
  );

  return {
    items,
    form,
    edit,
    setForm,
    load,
    open,
    closeForm,
    submit,
    add,
    removeItem,
  };
}
