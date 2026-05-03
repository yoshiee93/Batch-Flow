import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ChevronRight, Loader2, AlertCircle, Sparkles, Play, Box, ShieldCheck,
  Package, ArrowRightLeft, Printer, CheckCircle2, Flag, History, User, ExternalLink,
} from 'lucide-react';
import { useBatch, useBatchTimeline, type TimelineEvent } from '@/features/production/api';
import { format } from 'date-fns';

const ICONS: Record<TimelineEvent['kind'], typeof Sparkles> = {
  created: Sparkles,
  started: Play,
  input: Box,
  qc: ShieldCheck,
  output: Package,
  output_lot: Package,
  status: ArrowRightLeft,
  print: Printer,
  finalize: CheckCircle2,
  completed: Flag,
  audit: History,
};

const ICON_BG: Record<TimelineEvent['kind'], string> = {
  created: 'bg-slate-100 text-slate-700',
  started: 'bg-blue-100 text-blue-700',
  input: 'bg-amber-100 text-amber-700',
  qc: 'bg-purple-100 text-purple-700',
  output: 'bg-emerald-100 text-emerald-700',
  output_lot: 'bg-emerald-100 text-emerald-700',
  status: 'bg-indigo-100 text-indigo-700',
  print: 'bg-sky-100 text-sky-700',
  finalize: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  audit: 'bg-gray-100 text-gray-600',
};

function qcResultClass(result: unknown) {
  if (result === 'pass') return 'bg-green-100 text-green-700';
  if (result === 'fail') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}

export default function BatchTimeline() {
  const { id } = useParams<{ id: string }>();
  const { data: batch, isLoading: batchLoading } = useBatch(id!);
  const { data: events = [], isLoading: timelineLoading, isError } = useBatchTimeline(id!);

  if (batchLoading || timelineLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Timeline unavailable</h2>
        <p className="text-muted-foreground">Could not load events for this batch.</p>
        <Link href="/production">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Production</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/production">
          <Button variant="ghost" size="sm" data-testid="button-back-production">
            <ArrowLeft className="h-4 w-4 mr-1" /> Production
          </Button>
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Link href={`/batches/${batch.id}`}>
          <Button variant="ghost" size="sm" data-testid="button-back-batch">
            <span className="font-mono font-bold">{batch.batchNumber}</span>
          </Button>
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Timeline</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <History className="h-5 w-5" />
            Batch Timeline
          </CardTitle>
          <CardDescription>
            Chronological story of <span className="font-mono">{batch.batchNumber}</span> · {events.length} event{events.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm" data-testid="text-timeline-empty">
              No events recorded for this batch yet.
            </div>
          ) : (
            <ol className="relative space-y-6" data-testid="list-timeline">
              <li
                aria-hidden
                className="pointer-events-none absolute left-[19px] top-2 bottom-2 w-px bg-border list-none"
              />
              {events.map((ev, i) => {
                const Icon = ICONS[ev.kind] ?? History;
                const bg = ICON_BG[ev.kind] ?? 'bg-gray-100 text-gray-600';
                const dt = new Date(ev.at);
                return (
                  <li key={`${ev.at}-${i}`} className="relative flex gap-4" data-testid={`row-event-${i}`}>
                    <div className={`shrink-0 z-10 h-10 w-10 rounded-full ${bg} flex items-center justify-center ring-4 ring-background`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="font-medium text-sm" data-testid={`text-event-title-${i}`}>{ev.title}</div>
                        <div className="text-xs text-muted-foreground font-mono shrink-0">
                          {format(dt, 'dd MMM yyyy, HH:mm')}
                        </div>
                      </div>
                      {ev.detail && (
                        <div className="text-sm text-muted-foreground mt-0.5">{ev.detail}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        {ev.kind === 'qc' && ev.meta?.result != null && (
                          <Badge className={`${qcResultClass(ev.meta.result)} text-xs px-1.5 py-0`}>
                            {String(ev.meta.result)}
                          </Badge>
                        )}
                        {ev.userName && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ev.userName}
                          </span>
                        )}
                        {ev.link && (
                          <Link href={ev.link.href}>
                            <span className="inline-flex items-center gap-1 font-mono bg-background border px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer">
                              {ev.link.label}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link href={`/batches/${batch.id}`}>
          <Button variant="outline" data-testid="button-back-batch-bottom">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Batch Detail
          </Button>
        </Link>
      </div>
    </div>
  );
}
