import type {Property} from '../models/Property';

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(value);
}

export function propertyScore(property: Property): number {
  return Math.round(
    (
      property.water +
      property.topography +
      property.farm_potential +
      property.pasture +
      property.access_score +
      property.price_score
    ) / 6 * 10,
  );
}
