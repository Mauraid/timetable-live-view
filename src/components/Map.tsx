import React from 'react';
import { MapPin } from 'lucide-react';

interface MapProps {
  location: string;
}

export const Map = ({ location }: MapProps) => {
  // Construct simple Google Maps search URL that doesn't require API key
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;
  
  return (
    <div className="relative w-full h-full">
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="rounded-lg"
        title={`Map showing ${location}`}
      />
      
      {/* Location label */}
      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-sm flex items-center gap-1">
        <MapPin className="w-3 h-3 text-primary" />
        <span className="font-medium">{location}</span>
      </div>
    </div>
  );
};