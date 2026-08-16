import { brandingApi, BrandingOption } from '@/services/api/brandingApi';
import { postersApi } from '@/services/api/postersApi';
import { scheduleApi } from '@/services/api/scheduleApi';
import { PosterRow } from '@/types/api/edition';
import { ApiEditionDivision } from '@/types/api/entities';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { EditionGeneralEditHint } from '@/components/editions/editionGeneralHint';
import { actionPillClass } from '@/utils/ui/actionButtonClass';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

type Props = {
  editionDivisionId: number | null;
  divisions?: ApiEditionDivision[];
};

type EdCourtOption = {
  id_edition_division_court: number;
  name: string;
};

function extractEdCourts(scheduleData: any): EdCourtOption[] {
  const byId = new Map<number, EdCourtOption>();

  const push = (id: number | null | undefined, name: string) => {
    if (id == null || !Number.isFinite(Number(id))) return;
    const n = Number(id);
    if (!byId.has(n)) byId.set(n, { id_edition_division_court: n, name });
  };

  const courts = scheduleData?.courts || [];
  for (const c of courts) {
    const id =
      c?.pivot?.id_edition_division_court ??
      c?.id_edition_division_court ??
      null;
    push(id, c?.name || c?.court?.name || `Court #${id}`);
  }

  const edCourts =
    scheduleData?.edition_division?.edition_division_courts || [];
  for (const c of edCourts) {
    push(
      c?.id_edition_division_court,
      c?.court?.name || c?.name || `Court #${c?.id_edition_division_court}`
    );
  }

  for (const m of scheduleData?.matches || []) {
    const edc = m?.edition_division_court;
    push(
      edc?.id_edition_division_court ?? m?.edition_division_court_id,
      edc?.court?.name || `Court #${edc?.id_edition_division_court ?? '?'}`
    );
  }

  return Array.from(byId.values());
}

function divisionTitle(d: ApiEditionDivision): string {
  return d.division_title || `ED #${d.id_edition_division}`;
}

function hasGenerated(poster: PosterRow | undefined): boolean {
  return !!(poster?.generated_path || poster?.generated_url);
}

function hasPrinted(poster: PosterRow | undefined): boolean {
  return !!(poster?.printed_path || poster?.printed_url);
}

function rankingPoster(posters: PosterRow[]): PosterRow | undefined {
  return posters.find(
    p => p.poster_kind === 'RANKING' && p.edition_division_court_id == null
  );
}

function matchesPoster(
  posters: PosterRow[],
  courtId: number
): PosterRow | undefined {
  return posters.find(
    p =>
      p.poster_kind === 'MATCHES' && p.edition_division_court_id === courtId
  );
}

function BrandingBlock({
  organizerOptions,
  partnerOptions,
  organizerId,
  partnerId,
  setOrganizerId,
  setPartnerId,
}: {
  organizerOptions: { label: string; value: number }[];
  partnerOptions: { label: string; value: number }[];
  organizerId: number;
  partnerId: number;
  setOrganizerId: (n: number) => void;
  setPartnerId: (n: number) => void;
}) {
  return (
    <View
      testID="pdfs-branding"
      className="bg-white border border-gray-200 rounded-lg p-3 gap-2"
    >
      <Text className="font-semibold text-gray-900">Branding</Text>
      <View
        testID="pdfs-branding-row"
        className="flex-row flex-wrap items-end gap-2"
      >
        <View className="flex-1" style={{ minWidth: 160 }}>
          <Text className="text-xs text-gray-500 mb-1">Organizer</Text>
          <SingleSelectDropdown
            options={organizerOptions}
            selectedValue={organizerId}
            onSelectionChange={v => setOrganizerId(Number(v))}
            placeholder="Organizer"
            title="Organizer"
            minWidth={160}
          />
        </View>
        <View className="flex-1" style={{ minWidth: 160 }}>
          <Text className="text-xs text-gray-500 mb-1">Partner</Text>
          <SingleSelectDropdown
            options={partnerOptions}
            selectedValue={partnerId}
            onSelectionChange={v => setPartnerId(Number(v))}
            placeholder="Partner"
            title="Partner"
            minWidth={160}
          />
        </View>
      </View>
    </View>
  );
}

function PosterActions({
  title,
  testPrefix,
  poster,
  allowGenerate,
  allowUpload,
  finalized,
  busy,
  onGenerate,
  onDownloadGenerated,
  onDownloadPrinted,
  onUploadPrinted,
}: {
  title: string;
  testPrefix: string;
  poster: PosterRow | undefined;
  allowGenerate: boolean;
  allowUpload: boolean;
  finalized: boolean;
  busy: boolean;
  onGenerate: () => void;
  onDownloadGenerated: () => void;
  onDownloadPrinted: () => void;
  onUploadPrinted: () => void;
}) {
  const canGenerate = allowGenerate && !finalized && !busy;
  const canUpload = allowUpload && !finalized && poster != null && !busy;
  const canDownloadGenerated = hasGenerated(poster) && !busy;
  const canDownloadPrinted = hasPrinted(poster) && !busy;
  const generateLabel = hasGenerated(poster)
    ? 'Regenerate'
    : 'Generate';

  return (
    <View className="border border-gray-100 rounded-lg p-2 gap-2">
      <Text className="text-sm font-semibold text-gray-800">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {allowGenerate && (
          <Pressable
            testID={`${testPrefix}-generate`}
            onPress={() => {
              if (!canGenerate) return;
              onGenerate();
            }}
            disabled={!canGenerate}
            className={actionPillClass(canGenerate, 'blue')}
          >
            <Text className="text-white text-sm">
              {busy ? 'Generating…' : `${generateLabel} PDF`}
            </Text>
          </Pressable>
        )}
        <Pressable
          testID={`${testPrefix}-download`}
          accessibilityLabel="Download generated"
          onPress={() => {
            if (!canDownloadGenerated) return;
            onDownloadGenerated();
          }}
          disabled={!canDownloadGenerated}
          className={`${actionPillClass(canDownloadGenerated, 'green')} flex-row items-center gap-1`}
        >
          <Ionicons name="download" size={18} color="#ffffff" />
          <Text className="text-white text-sm">generated</Text>
        </Pressable>
        <Pressable
          testID={`${testPrefix}-download-printed`}
          accessibilityLabel="Download printed"
          onPress={() => {
            if (!canDownloadPrinted) return;
            onDownloadPrinted();
          }}
          disabled={!canDownloadPrinted}
          className={`${actionPillClass(canDownloadPrinted, 'green')} flex-row items-center gap-1`}
        >
          <Ionicons name="download" size={18} color="#ffffff" />
          <Text className="text-white text-sm">printed</Text>
        </Pressable>
        {allowUpload && (
          <Pressable
            testID={
              poster
                ? `upload-printed-${poster.id_edition_division_poster}`
                : `${testPrefix}-upload-printed`
            }
            onPress={() => {
              if (!canUpload) return;
              onUploadPrinted();
            }}
            disabled={!canUpload}
            className={actionPillClass(canUpload, 'blue')}
          >
            <Text className="text-white text-sm">Upload printed</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function EdPdfSection({
  editionDivisionId,
  title,
  branding,
  allowGenerate,
  allowUpload,
  testID,
}: {
  editionDivisionId: number;
  title: string;
  branding: { organizer: number; partner: number };
  allowGenerate: boolean;
  allowUpload: boolean;
  testID?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courts, setCourts] = useState<EdCourtOption[]>([]);
  const [posters, setPosters] = useState<PosterRow[]>([]);
  const [finalized, setFinalized] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedule, posterRes] = await Promise.all([
        scheduleApi.getSchedule(editionDivisionId),
        postersApi.list(editionDivisionId),
      ]);
      setCourts(extractEdCourts(schedule.data));
      setPosters(posterRes.data || []);
      setFinalized(!!schedule.data?.is_finalized);
    } catch (e: any) {
      setError(e?.message || 'Failed to load PDF data');
    } finally {
      setLoading(false);
    }
  }, [editionDivisionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const requireWeb = (): boolean => {
    if (Platform.OS !== 'web') {
      setMessage('PDF download is web-only.');
      return false;
    }
    return true;
  };

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setError(null);
    setMessage(null);
    setBusyKey(key);
    try {
      await fn();
      setMessage(ok);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setBusyKey(null);
    }
  };

  const uploadPrinted = (posterId: number) => {
    if (!allowUpload) return;
    if (typeof document === 'undefined') {
      setMessage('Printed upload is easiest on web (file picker).');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await run(
        `upload-${posterId}`,
        async () => {
          await postersApi.uploadPrinted(
            editionDivisionId,
            posterId,
            file,
            file.name
          );
        },
        'Printed image uploaded.'
      );
    };
    input.click();
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
      {message && (
        <Text className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
          {message}
        </Text>
      )}

      <PosterActions
        title="RANKING"
        testPrefix={`ranking-${editionDivisionId}`}
        poster={ranking}
        allowGenerate={allowGenerate}
        allowUpload={allowUpload}
        finalized={finalized}
        busy={busyKey === 'ranking'}
        onGenerate={() =>
          void run(
            'ranking',
            async () => {
              await postersApi.generateRanking(editionDivisionId, branding);
            },
            'RANKING PDF generated.'
          )
        }
        onDownloadGenerated={() => {
          if (!requireWeb() || !hasGenerated(ranking)) return;
          void run(
            'dl-ranking',
            async () => {
              await postersApi.downloadRankingPdf(
                editionDivisionId,
                `ed-${editionDivisionId}-ranking.pdf`
              );
            },
            'RANKING PDF downloaded.'
          );
        }}
        onDownloadPrinted={() => {
          if (!requireWeb() || ranking == null || !hasPrinted(ranking)) return;
          void run(
            'dl-ranking-printed',
            async () => {
              await postersApi.downloadPrinted(
                editionDivisionId,
                ranking.id_edition_division_poster
              );
            },
            'Printed RANKING downloaded.'
          );
        }}
        onUploadPrinted={() => {
          if (ranking) uploadPrinted(ranking.id_edition_division_poster);
        }}
      />

      {courts.length === 0 ? (
        <Text className="text-sm text-gray-500">
          No edition-division courts yet. Generate a schedule first.
        </Text>
      ) : (
        courts.map(c => {
          const poster = matchesPoster(posters, c.id_edition_division_court);
          const key = `matches-${c.id_edition_division_court}`;
          return (
            <PosterActions
              key={c.id_edition_division_court}
              title={`MATCHES · ${c.name} (EDC #${c.id_edition_division_court})`}
              testPrefix={`matches-${editionDivisionId}-${c.id_edition_division_court}`}
              poster={poster}
              allowGenerate={allowGenerate}
              allowUpload={allowUpload}
              finalized={finalized}
              busy={busyKey === key}
              onGenerate={() =>
                void run(
                  key,
                  async () => {
                    await postersApi.generateMatches(editionDivisionId, {
                      court: c.id_edition_division_court,
                      ...branding,
                    });
                  },
                  'MATCHES PDF generated.'
                )
              }
              onDownloadGenerated={() => {
                if (!requireWeb() || !hasGenerated(poster)) return;
                void run(
                  `dl-${key}`,
                  async () => {
                    await postersApi.downloadMatchesPdf(
                      editionDivisionId,
                      { court: c.id_edition_division_court },
                      `ed-${editionDivisionId}-matches-${c.id_edition_division_court}.pdf`
                    );
                  },
                  'MATCHES PDF downloaded.'
                );
              }}
              onDownloadPrinted={() => {
                if (!requireWeb() || poster == null || !hasPrinted(poster))
                  return;
                void run(
                  `dlp-${key}`,
                  async () => {
                    await postersApi.downloadPrinted(
                      editionDivisionId,
                      poster.id_edition_division_poster
                    );
                  },
                  'Printed MATCHES downloaded.'
                );
              }}
              onUploadPrinted={() => {
                if (poster) uploadPrinted(poster.id_edition_division_poster);
              }}
            />
          );
        })
      )}
    </View>
  );
}

export default function EditionPdfsTab({
  editionDivisionId,
  divisions = [],
}: Props) {
  const [organizerId, setOrganizerId] = useState<number>(1);
  const [partnerId, setPartnerId] = useState<number>(1);

  const brandingQuery = useQuery({
    queryKey: queryKeys.branding(),
    queryFn: async () => {
      const res = await brandingApi.getBranding();
      return res.data;
    },
    enabled: editionDivisionId != null,
  });

  const organizers = brandingQuery.data?.organizers || [];
  const partners = brandingQuery.data?.partners || [];

  const organizerOptions = useMemo(
    () => organizers.map((o: BrandingOption) => ({ label: o.name, value: o.id })),
    [organizers]
  );
  const partnerOptions = useMemo(
    () => partners.map((p: BrandingOption) => ({ label: p.name, value: p.id })),
    [partners]
  );

  const branding = {
    organizer: organizerId,
    partner: partnerId,
  };

  if (editionDivisionId == null) {
    return (
      <View className="gap-3" testID="pdfs-general-view">
        <EditionGeneralEditHint />
        {divisions.map(d => (
          <EdPdfSection
            key={d.id_edition_division}
            editionDivisionId={d.id_edition_division}
            title={divisionTitle(d)}
            branding={branding}
            allowGenerate={false}
            allowUpload={false}
            testID={`pdfs-general-ed-${d.id_edition_division}`}
          />
        ))}
        {divisions.length === 0 && (
          <Text className="text-sm text-gray-500">No edition divisions.</Text>
        )}
      </View>
    );
  }

  return (
    <View className="gap-3">
      <BrandingBlock
        organizerOptions={organizerOptions}
        partnerOptions={partnerOptions}
        organizerId={organizerId}
        partnerId={partnerId}
        setOrganizerId={setOrganizerId}
        setPartnerId={setPartnerId}
      />
      <EdPdfSection
        editionDivisionId={editionDivisionId}
        title="PDFs"
        branding={branding}
        allowGenerate
        allowUpload
      />
    </View>
  );
}
