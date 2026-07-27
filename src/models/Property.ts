export type PropertyRecordType = 'real' | 'test';

export type Property = {
  id: number;
  name: string;
  location: string;
  price: number;
  area_ha: number;
  status: string;
  record_type: PropertyRecordType;
  latitude: number | null;
  longitude: number | null;
  water: number;
  topography: number;
  farm_potential: number;
  pasture: number;
  access_score: number;
  price_score: number;
  notes: string;
};

export type PropertyInput = Omit<Property, 'id'>;
