import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertyMatch } from "../../../../shared/types";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#ca8a04";
  return "#ea580c";
}

function createScoreIcon(score: number) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${scoreColor(score)};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${score}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

interface PropertyMapProps {
  matches: PropertyMatch[];
  onSelect?: (match: PropertyMatch) => void;
}

export function PropertyMap({ matches, onSelect }: PropertyMapProps) {
  const geoMatches = matches.filter(
    (m) => m.property?.latitude && m.property?.longitude
  );

  if (geoMatches.length === 0) {
    return (
      <div className="bg-gray-100 rounded-xl h-96 flex items-center justify-center text-gray-500">
        Aucun bien avec coordonnées GPS
      </div>
    );
  }

  const center: [number, number] = [
    geoMatches.reduce((sum, m) => sum + m.property!.latitude!, 0) / geoMatches.length,
    geoMatches.reduce((sum, m) => sum + m.property!.longitude!, 0) / geoMatches.length,
  ];

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "450px", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoMatches.map((match) => (
          <Marker
            key={match.id}
            position={[match.property!.latitude!, match.property!.longitude!]}
            icon={createScoreIcon(match.score)}
            eventHandlers={{ click: () => onSelect?.(match) }}
          >
            <Popup>
              <div className="min-w-48">
                <p className="font-semibold text-sm">{match.property!.title}</p>
                <p className="text-primary-600 font-bold">
                  {match.property!.price.toLocaleString("fr-BE")} €
                </p>
                <div className="text-xs text-gray-600 mt-1">
                  {match.property!.bedrooms != null && <span>{match.property!.bedrooms} ch. </span>}
                  {match.property!.surface != null && <span>{match.property!.surface} m² </span>}
                  {match.property!.pebScore && <span>PEB {match.property!.pebScore}</span>}
                </div>
                <p className="text-xs mt-1">Score: <strong>{match.score}/100</strong></p>
                <a
                  href={match.property!.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:underline mt-1 block"
                >
                  Voir l'annonce
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
