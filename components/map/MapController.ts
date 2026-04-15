import { useState, useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { TripRecommendation } from '../../types';
import { geocodeAddress } from '../../services/geocodeService';

interface MapControllerProps {
  city: string;
  focusedPlace?: TripRecommendation | null;
  places: TripRecommendation[];
  selectedPlace?: TripRecommendation | null;
}

export const MapController: React.FC<MapControllerProps> = ({
  city,
  focusedPlace,
  places,
  selectedPlace,
}) => {
  const map = useMap();
  const [geocodedCenter, setGeocodedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [lastGeocodedCity, setLastGeocodedCity] = useState<string>('');

  useEffect(() => {
    if (!map || !city) return;

    if (selectedPlace) {
      if (selectedPlace.lat && selectedPlace.lng) {
        map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
        map.setZoom(15);
      } else {
        const searchQuery = `${selectedPlace.title}, ${selectedPlace.city || city}`;
        geocodeAddress(searchQuery).then((result) => {
          if (result) {
            map.panTo({ lat: result.lat, lng: result.lng });
            map.setZoom(15);
          }
        });
      }
      return;
    }

    if (focusedPlace) {
      if (focusedPlace.lat && focusedPlace.lng) {
        map.panTo({ lat: focusedPlace.lat, lng: focusedPlace.lng });
        map.setZoom(15);
      } else {
        const searchQuery = `${focusedPlace.title}, ${focusedPlace.city || city}`;
        geocodeAddress(searchQuery).then((result) => {
          if (result) {
            map.panTo({ lat: result.lat, lng: result.lng });
            map.setZoom(15);
          }
        });
      }
      return;
    }

    const placeWithCoords = places.find((p) => p.lat && p.lng);
    if (placeWithCoords?.lat && placeWithCoords?.lng) {
      map.setCenter({ lat: placeWithCoords.lat, lng: placeWithCoords.lng });
      map.setZoom(13);
      return;
    }

    if (!geocodedCenter && places.length > 0 && city !== lastGeocodedCity) {
      geocodeAddress(city).then((result) => {
        if (result) {
          const center = { lat: result.lat, lng: result.lng };
          setGeocodedCenter(center);
          setLastGeocodedCity(city);
          map.setCenter(center);
          map.setZoom(12);
        }
      });
    }
  }, [map, city, focusedPlace, selectedPlace, places, geocodedCenter, lastGeocodedCity]);

  return null;
};
