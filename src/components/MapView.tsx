import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Property } from "../models/Property";
import { formatMoney, propertyScore } from "../utils/property";

type Props = {
  rows: Property[];
  open: (property: Property) => void;
};

const markerIcon = (isTest: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="pin ${isTest ? "test" : "real"}"></div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
  });

export default function MapView({ rows, open }: Props) {
  const mappedRows = rows.filter(
    (property) =>
      property.latitude !== null && property.longitude !== null,
  );

  return (
    <div className="mapGrid">
      <div className="mapList">
        <h3>Działki ({rows.length})</h3>

        {rows.map((property) => (
          <button key={property.id} onClick={() => open(property)}>
            <b>{property.name}</b>
            <span>
              {property.location} · {property.area_ha} ha
            </span>
            <small>
              {formatMoney(property.price)} · {propertyScore(property)}/100
            </small>
          </button>
        ))}
      </div>

      <MapContainer center={[54.62, 18.08]} zoom={10}>
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mappedRows.map((property) => (
          <Marker
            key={property.id}
            position={[property.latitude!, property.longitude!]}
            icon={markerIcon(property.record_type === "test")}
          >
            <Popup>
              <b>{property.name}</b>
              <br />
              {property.location}
              <br />
              {formatMoney(property.price)} · {property.area_ha} ha
              <br />
              {propertyScore(property)}/100
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
