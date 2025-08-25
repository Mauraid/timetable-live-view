import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface MapProps {
  location: string;
}

export const Map = ({ location }: MapProps) => {
  // Construct simple Google Maps search URL that doesn't require API key
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;
  const openInGoogleMaps = () => {
    window.open(`https://maps.google.com/maps?q=${encodeURIComponent(location)}`, '_blank');
  };
  
  return (
    <div className="relative w-full h-full group">
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
      
      {/* Clickable overlay */}
      <div 
        onClick={openInGoogleMaps}
        className="absolute inset-0 bg-transparent cursor-pointer hover:bg-black/5 transition-colors rounded-lg flex items-center justify-center group-hover:bg-black/10"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Open in Google Maps</span>
        </div>
      </div>
      
      {/* Location label */}
      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-sm flex items-center gap-1">
        <MapPin className="w-3 h-3 text-primary" />
        <span className="font-medium">{location}</span>
      </div>
    </div>
  );
};