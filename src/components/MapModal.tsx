import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, AlertCircle } from 'lucide-react';
import { Map } from './Map';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
}

export const MapModal = ({ isOpen, onClose, location }: MapModalProps) => {
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setShowTokenInput(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Location: {location}
          </DialogTitle>
        </DialogHeader>

        {showTokenInput ? (
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-amber-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">Mapbox token required to display map</span>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="mapbox-token" className="text-sm font-medium">
                Mapbox Public Token
              </label>
              <Input
                id="mapbox-token"
                type="text"
                placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Get your token from{' '}
                <a 
                  href="https://mapbox.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            
            <Button onClick={handleTokenSubmit} disabled={!mapboxToken.trim()}>
              Show Map
            </Button>
          </div>
        ) : (
          <div className="h-[500px] rounded-lg overflow-hidden">
            <Map mapboxToken={mapboxToken} location={location} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};