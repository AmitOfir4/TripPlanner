import { useState, useEffect } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
}

export const useUserLocation = (): UserLocation | undefined => {
  const [location, setLocation] = useState<UserLocation | undefined>();

  useEffect(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.log('Location access denied:', error);
      }
    );
  }, []);

  return location;
};
