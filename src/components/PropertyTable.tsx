import type {Property} from '../models/Property';
import {formatMoney, propertyScore} from '../utils/property';

type Props = {
  rows: Property[];
  open: (property: Property) => void;
  del: (id: number) => void;
};

export default function PropertyTable({rows, open, del}: Props) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Typ</th>
            <th>Nazwa</th>
            <th>Miejscowość</th>
            <th>Cena</th>
            <th>ha</th>
            <th>Ocena</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(property => (
            <tr key={property.id}>
              <td>
                <span className={`tag ${property.record_type}`}>
                  {property.record_type === 'test' ? 'TEST' : 'REALNA'}
                </span>
              </td>
              <td><b>{property.name}</b></td>
              <td>{property.location}</td>
              <td>{formatMoney(property.price)}</td>
              <td>{property.area_ha}</td>
              <td>{propertyScore(property)}</td>
              <td>{property.status}</td>
              <td>
                <button onClick={() => open(property)}>Edytuj</button>
                <button onClick={() => del(property.id)}>Usuń</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
