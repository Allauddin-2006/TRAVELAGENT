import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { TripPlan } from '../types';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  trip: TripPlan | null;
}

const MapBoundsUpdater = ({ trip }: { trip: TripPlan | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!trip) return;

    const bounds = new L.LatLngBounds([]);

    if (trip.summary?.coordinates) {
      bounds.extend([trip.summary.coordinates.lat, trip.summary.coordinates.lng]);
    }

    if (trip.accommodations) {
      trip.accommodations.forEach(acc => {
        if (acc.coordinates) {
          bounds.extend([acc.coordinates.lat, acc.coordinates.lng]);
        }
      });
    }

    if (trip.itinerary) {
      trip.itinerary.forEach(day => {
        day.activities.forEach(activity => {
          if (activity.coordinates) {
            bounds.extend([activity.coordinates.lat, activity.coordinates.lng]);
          }
        });
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [trip, map]);

  return null;
};

export default function Map({ trip }: MapProps) {
  // Default to a world view if no trip
  const defaultCenter: [number, number] = [20, 0];

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsUpdater trip={trip} />

        {/* Render Destination */}
        {trip?.summary?.coordinates && (
          <Marker position={[trip.summary.coordinates.lat, trip.summary.coordinates.lng]}>
            <Popup>
              <strong>{trip.summary.destination}</strong>
              <br />
              Destination
            </Popup>
          </Marker>
        )}

        {/* Render Accommodations */}
        {trip?.accommodations?.map((acc, idx) => (
          acc.coordinates && (
            <Marker key={`acc-${idx}`} position={[acc.coordinates.lat, acc.coordinates.lng]}>
              <Popup>
                <strong>{acc.name}</strong>
                <br />
                {acc.type} - {acc.price}
              </Popup>
            </Marker>
          )
        ))}

        {/* Render Activities */}
        {trip?.itinerary?.map((day, dIdx) => (
          day.activities.map((activity, aIdx) => (
            activity.coordinates && (
              <Marker key={`act-${dIdx}-${aIdx}`} position={[activity.coordinates.lat, activity.coordinates.lng]}>
                <Popup>
                  <strong>{activity.title}</strong>
                  <br />
                  Day {day.day} - {activity.time}
                </Popup>
              </Marker>
            )
          ))
        ))}
      </MapContainer>
    </div>
  );
}
