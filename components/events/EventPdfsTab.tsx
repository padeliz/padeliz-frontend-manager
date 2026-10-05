import { postersApi } from '@/services/api/postersApi';
import { eventPostersApi } from '@/services/api/eventPostersApi';
import { scheduleApi } from '@/services/api/scheduleApi';
import { PosterRow } from '@/types/api/event';
import { ApiEventDivision } from '@/types/api/entities';
import { EventGeneralEditHint } from '@/components/events/eventGeneralHint';
import ActionButton, { ActionButtonProps } from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Text,
  View,
} from 'react-native';

/** Downloads flash a checkmark and fall back to idle; label-only actions stay sticky. */
const DOWNLOAD_SUCCESS_HOLD_MS = 4000;

type Props = {
  eventId: number;
  eventFinalized?: boolean;
  eventDivisionId: number | null;
  divisions?: ApiEventDivision[];
};

type EdCourtOption = {
  id_event_division_court: number;
  name: string;
};

function extractEdCourts(scheduleData: any): EdCourtOption[] {
  const byId = new Map<number, EdCourtOption>();

  const push = (id: number | null | undefined, name: string) => {
    if (id == null || !Number.isFinite(Number(id))) return;
    const n = Number(id);
    if (!byId.has(n)) byId.set(n, { id_event_division_court: n, name });
  };

  const courts = scheduleData?.courts || [];
  for (const c of courts) {
    const id =
      c?.pivot?.id_event_division_court ??
      c?.id_event_division_court ??
      null;
    push(id, c?.name || c?.court?.name || `Court #${id}`);
  }

  const edCourts =
    scheduleData?.event_division?.event_division_courts || [];
  for (const c of edCourts) {
    push(
      c?.id_event_division_court,
      c?.court?.name || c?.name || `Court #${c?.id_event_division_court}`
    );
  }

  for (const m of scheduleData?.matches || []) {
    const edc = m?.event_division_court;
    push(
      edc?.id_event_division_court ?? m?.event_division_court_id,
      edc?.court?.name || `Court #${edc?.id_event_division_court ?? '?'}`
    );
  }

  return Array.from(byId.values());
}

function divisionTitle(d: ApiEventDivision): string {
  return d.division_title || `ED #${d.id_event_division}`;
}

function hasGenerated(poster: PosterRow | undefined): boolean {
  return !!(poster?.generated_path || poster?.generated_url);
}

function hasPrinted(poster: PosterRow | undefined): boolean {
  return !!(poster?.printed_path || poster?.printed_url);
}

function rankingPoster(posters: PosterRow[]): PosterRow | undefined {
  return posters.find(
    p => p.poster_kind === 'RANKING' && p.event_division_court_id == null
  );
}

function matchesPoster(
  posters: PosterRow[],
  courtId: number
): PosterRow | undefined {
  return posters.find(
    p =>
      p.poster_kind === 'MATCHES' && p.event_division_court_id === courtId
  );
}

function requireWebForDownload(): void {
  if (Platform.OS !== 'web') {
    throw new Error('PDF download is web-only.');
  }
}

/**
 * One poster action. Each instance owns its own status hook so a press only
 * reports pending / success / error on the button that was pressed.
 */
function PdfActionButton({
  testID,
  label,
  onRun,
  accessibilityLabel,
  startIcon,
  variant = 'primary',
  disabled = false,
  auditoryFeedback = false,
  successHoldMs,
}: {
  testID: string;
  label: string;
  onRun: () => Promise<void>;
  accessibilityLabel?: string;
  startIcon?: ActionButtonProps['startIcon'];
  variant?: ActionButtonProps['variant'];
  disabled?: boolean;
  auditoryFeedback?: boolean;
  successHoldMs?: number;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback,
    successHoldMs,
  });

  return (
    <ActionButton
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      label={label}
      startIcon={startIcon}
      variant={variant}
      size="sm"
      status={status}
      errorMessage={errorMessage ?? undefined}
      disabled={disabled}
      onPress={() => void run(onRun)}
    />
  );
}

function PosterActions({
  title,
  testPrefix,
  poster,
  allowGenerate,
  allowPreview = false,
  allowUpload,
  finalized,
  onGenerate,
  onPreview,
  onDownloadGenerated,
  onDownloadPrinted,
  onUploadPrinted,
}: {
  title: string;
  testPrefix: string;
  poster: PosterRow | undefined;
  allowGenerate: boolean;
  allowPreview?: boolean;
  allowUpload: boolean;
  finalized: boolean;
  onGenerate: () => Promise<void>;
  onPreview?: () => Promise<void>;
  onDownloadGenerated: () => Promise<void>;
  onDownloadPrinted: () => Promise<void>;
  onUploadPrinted: () => Promise<void>;
}) {
  const canGenerate = allowGenerate && !finalized;
  const canUpload = allowUpload && !finalized && poster != null;
  const generateLabel = hasGenerated(poster) ? 'Regenerate' : 'Generate';

  return (
    <View className="border border-gray-100 rounded-lg p-2 gap-2">
      <Text className="text-sm font-semibold text-gray-800">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {allowPreview && (
          <PdfActionButton
            testID={`${testPrefix}-preview`}
            label="Preview"
            onRun={onPreview ?? (async () => undefined)}
          />
        )}
        {allowGenerate && (
          <PdfActionButton
            testID={`${testPrefix}-generate`}
            label={`${generateLabel} PDF`}
            disabled={!canGenerate}
            auditoryFeedback
            onRun={onGenerate}
          />
        )}
        <PdfActionButton
          testID={`${testPrefix}-download`}
          accessibilityLabel="Download generated"
          label="generated"
          startIcon="download"
          variant="positive"
          successHoldMs={DOWNLOAD_SUCCESS_HOLD_MS}
          disabled={!hasGenerated(poster)}
          onRun={onDownloadGenerated}
        />
        <PdfActionButton
          testID={`${testPrefix}-download-printed`}
          accessibilityLabel="Download printed"
          label="printed"
          startIcon="download"
          variant="positive"
          successHoldMs={DOWNLOAD_SUCCESS_HOLD_MS}
          disabled={!hasPrinted(poster)}
          onRun={onDownloadPrinted}
        />
        {allowUpload && (
          <PdfActionButton
            testID={
              poster
                ? `upload-printed-${poster.id_event_division_poster}`
                : `${testPrefix}-upload-printed`
            }
            label="Upload printed"
            disabled={!canUpload}
            auditoryFeedback
            onRun={onUploadPrinted}
          />
        )}
      </View>
    </View>
  );
}

function EdPdfSection({
  eventDivisionId,
  title,
  allowGenerate,
  allowUpload,
  testID,
}: {
  eventDivisionId: number;
  title: string;
  allowGenerate: boolean;
  allowUpload: boolean;
  testID?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courts, setCourts] = useState<EdCourtOption[]>([]);
  const [posters, setPosters] = useState<PosterRow[]>([]);
  const [finalized, setFinalized] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedule, posterRes] = await Promise.all([
        scheduleApi.getSchedule(eventDivisionId),
        postersApi.list(eventDivisionId),
      ]);
      setCourts(extractEdCourts(schedule.data));
      setPosters(posterRes.data || []);
      setFinalized(!!schedule.data?.is_finalized);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PDF data');
    } finally {
      setLoading(false);
    }
  }, [eventDivisionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickPrintedFile = (): Promise<File | null> =>
    new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      // Browsers that support it fire `cancel` when the picker is dismissed,
      // so the button does not stay pending forever.
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });

  const uploadPrinted = async (posterId: number) => {
    if (typeof document === 'undefined') {
      throw new Error('Printed upload is easiest on web (file picker).');
    }
    const file = await pickPrintedFile();
    if (!file) return;
    await postersApi.uploadPrinted(
      eventDivisionId,
      posterId,
      file,
      file.name
    );
    await load();
  };

  const ranking = rankingPoster(posters);

  if (loading && posters.length === 0 && courts.length === 0) {
    return (
      <View className="bg-white border border-gray-200 rounded-lg p-3">
        <Text className="font-semibold text-gray-900 mb-2">{title}</Text>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View
      testID={testID}
      className="bg-white border border-gray-200 rounded-lg p-3 gap-2"
    >
      <Text className="font-semibold text-gray-900">{title}</Text>
      {error && (
        <Text className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</Text>
      )}

      <PosterActions
        title="RANKING"
        testPrefix={`ranking-${eventDivisionId}`}
        poster={ranking}
        allowGenerate={allowGenerate}
        allowUpload={allowUpload}
        finalized={finalized}
        onGenerate={async () => {
          await postersApi.generateRanking(eventDivisionId);
          await load();
        }}
        onDownloadGenerated={async () => {
          requireWebForDownload();
          await postersApi.downloadRankingPdf(
            eventDivisionId,
            `ed-${eventDivisionId}-ranking.pdf`
          );
        }}
        onDownloadPrinted={async () => {
          requireWebForDownload();
          if (ranking == null) return;
          await postersApi.downloadPrinted(
            eventDivisionId,
            ranking.id_event_division_poster
          );
        }}
        onUploadPrinted={async () => {
          if (ranking == null) return;
          await uploadPrinted(ranking.id_event_division_poster);
        }}
      />

      {courts.length === 0 ? (
        <Text className="text-sm text-gray-500">
          No event-division courts yet. Generate a schedule first.
        </Text>
      ) : (
        courts.map(c => {
          const poster = matchesPoster(posters, c.id_event_division_court);
          return (
            <PosterActions
              key={c.id_event_division_court}
              title={`MATCHES · ${c.name} (EDC #${c.id_event_division_court})`}
              testPrefix={`matches-${eventDivisionId}-${c.id_event_division_court}`}
              poster={poster}
              allowGenerate={allowGenerate}
              allowUpload={allowUpload}
              finalized={finalized}
              onGenerate={async () => {
                await postersApi.generateMatches(eventDivisionId, {
                  court: c.id_event_division_court,
                });
                await load();
              }}
              onDownloadGenerated={async () => {
                requireWebForDownload();
                await postersApi.downloadMatchesPdf(
                  eventDivisionId,
                  { court: c.id_event_division_court },
                  `ed-${eventDivisionId}-matches-${c.id_event_division_court}.pdf`
                );
              }}
              onDownloadPrinted={async () => {
                requireWebForDownload();
                if (poster == null) return;
                await postersApi.downloadPrinted(
                  eventDivisionId,
                  poster.id_event_division_poster
                );
              }}
              onUploadPrinted={async () => {
                if (poster == null) return;
                await uploadPrinted(poster.id_event_division_poster);
              }}
            />
          );
        })
      )}
    </View>
  );
}

function attendancePoster(posters: PosterRow[]): PosterRow | undefined {
  return posters.find(
    p => p.poster_kind === 'ATTENDANCE' && p.event_division_id == null
  );
}

function GeneralPdfsView({
  eventId,
  eventFinalized = false,
  divisions,
}: {
  eventId: number;
  eventFinalized?: boolean;
  divisions: ApiEventDivision[];
}) {
  const [eventPosters, setEventPosters] = useState<PosterRow[]>([]);
  const [loadingEventPosters, setLoadingEventPosters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEventPosters = useCallback(async () => {
    if (!Number.isFinite(eventId)) return;
    setLoadingEventPosters(true);
    try {
      const res = await eventPostersApi.listEventPosters(eventId);
      setEventPosters(res.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load event posters');
    } finally {
      setLoadingEventPosters(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadEventPosters();
  }, [loadEventPosters]);

  const requireWebForPreview = (): void => {
    if (Platform.OS !== 'web') {
      throw new Error('Attendance preview is web-only.');
    }
  };

  const attendance = attendancePoster(eventPosters);

  return (
    <View className="gap-3" testID="pdfs-general-view">
      <EventGeneralEditHint />
      <View className="bg-white border border-gray-200 rounded-lg p-3 gap-2">
        <Text className="font-semibold text-gray-900">All division posters</Text>
        <View className="self-start">
          <PdfActionButton
            testID="download-all-pdfs"
            label="Download all PDFs"
            startIcon="download"
            variant="positive"
            successHoldMs={DOWNLOAD_SUCCESS_HOLD_MS}
            onRun={async () => {
              requireWebForDownload();
              await eventPostersApi.downloadMergedPostersPdf(eventId);
            }}
          />
        </View>
      </View>

      <View
        testID="attendance-pdf-section"
        className="bg-white border border-gray-200 rounded-lg p-3 gap-2"
      >
        <Text className="font-semibold text-gray-900">Attendance sheet</Text>
        {loadingEventPosters && eventPosters.length === 0 ? (
          <ActivityIndicator />
        ) : (
          <PosterActions
            title="ATTENDANCE"
            testPrefix={`attendance-${eventId}`}
            poster={attendance}
            allowGenerate
            allowPreview
            allowUpload={false}
            finalized={eventFinalized}
            onPreview={async () => {
              requireWebForPreview();
              await eventPostersApi.openAttendancePreview(eventId);
            }}
            onGenerate={async () => {
              await eventPostersApi.generateAttendance(eventId);
              await loadEventPosters();
            }}
            onDownloadGenerated={async () => {
              requireWebForDownload();
              await eventPostersApi.downloadAttendancePdf(eventId);
            }}
            onDownloadPrinted={async () => undefined}
            onUploadPrinted={async () => undefined}
          />
        )}
      </View>

      {error && (
        <Text className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</Text>
      )}

      {divisions.map(d => (
        <EdPdfSection
          key={d.id_event_division}
          eventDivisionId={d.id_event_division}
          title={divisionTitle(d)}
          allowGenerate={false}
          allowUpload={false}
          testID={`pdfs-general-ed-${d.id_event_division}`}
        />
      ))}
      {divisions.length === 0 && (
        <Text className="text-sm text-gray-500">No event divisions.</Text>
      )}
    </View>
  );
}

/**
 * Poster branding (organizer logo, club host logo) is resolved server-side from
 * the event, so this tab only drives generation and printed uploads.
 */
export default function EventPdfsTab({
  eventId,
  eventFinalized = false,
  eventDivisionId,
  divisions = [],
}: Props) {
  if (eventDivisionId == null) {
    return (
      <GeneralPdfsView
        eventId={eventId}
        eventFinalized={eventFinalized}
        divisions={divisions}
      />
    );
  }

  return (
    <View className="gap-3">
      <EdPdfSection
        eventDivisionId={eventDivisionId}
        title="PDFs"
        allowGenerate
        allowUpload
      />
    </View>
  );
}
