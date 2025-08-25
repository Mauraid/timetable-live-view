import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';
import { Map } from './Map';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
}

export const MapModal = ({ isOpen, onClose, location }: MapModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Location: {location}
          </DialogTitle>
        </DialogHeader>

        <div className="h-[500px] rounded-lg overflow-hidden">
          <Map location={location} />
        </div>
      </DialogContent>
    </Dialog>
  );
};