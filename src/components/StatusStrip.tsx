import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatusStripProps {
  online: boolean;
  offlineReady: boolean;
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

export const StatusStrip = ({ online, offlineReady, lastUpdated, loading, onRefresh }: StatusStripProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {offlineReady && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 text-secondary px-3 py-1 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Offline-ready
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Last updated:{' '}
          {lastUpdated
            ? lastUpdated.toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
            aria-label="Refresh schedule"
            className="rounded-full border-border bg-card font-medium"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh schedule
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh schedule</TooltipContent>
      </Tooltip>
    </div>

    {!online && (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3"
      >
        <CloudOff className="w-5 h-5 text-accent mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-sm text-foreground leading-snug">
          You&apos;re offline. Showing the last saved version of the schedule.
        </p>
      </div>
    )}
  </div>
);
