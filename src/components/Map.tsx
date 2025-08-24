import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Loader2 } from 'lucide-react';

interface MapProps {
  mapboxToken: string;
  location: string;
}

export const Map = ({ mapboxToken, location }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        zoom: 15,
        center: [0, 0], // Default center, will be updated when location is geocoded
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Geocode the location
      const geocodeLocation = async () => {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}&limit=1`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            
            // Update map center
            map.current?.flyTo({
              center: [lng, lat],
              zoom: 15,
              essential: true
            });

            // Add marker
            new mapboxgl.Marker({
              color: '#3b82f6',
              scale: 1.2
            })
              .setLngLat([lng, lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                  .setHTML(`<div class="font-semibold">${location}</div>`)
              )
              .addTo(map.current!);
              
            setLoading(false);
          } else {
            setError('Location not found');
            setLoading(false);
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          setError('Failed to find location');
          setLoading(false);
        }
      };

      map.current.on('load', () => {
        geocodeLocation();
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
      setLoading(false);
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, location]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <div className="text-center space-y-2">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">Location: {location}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};