/**
 * Review UI for a single player level assessment: shows the player's
 * submission and lets a manager approve (with a 2-decimal level inside a
 * seeded band) or reject. Assessments are never created here.
 */

import ReviewStatusBadge from '@/components/playerLevels/ReviewStatusBadge';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { LevelsApiService } from '@/services/api/levelsApi';
import { PlayerLevelAssessmentsApiService } from '@/services/api/playerLevelAssessmentsApi';
import {
  ApiLevel,
  ApiPlayerCustomFieldValue,
  ApiPlayerLevelAssessment,
} from '@/types/api/entities';
import { formatJsonFieldValue, isJsonField } from '@/utils/customFieldJson';
import {
  findBandForLevel,
  formatBandRange,
  validatePlayerLevelInput,
} from '@/utils/playerLevel';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

const assessmentsApi = new PlayerLevelAssessmentsApiService();
const levelsApi = new LevelsApiService();

type Props = {
  assessmentId: number;
  /** Called with the updated assessment after approve/reject. */
  onReviewed?: (assessment: ApiPlayerLevelAssessment) => void;
};

function formatTimestamp(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

export function assessmentPlayerLabel(
  assessment: Pick<ApiPlayerLevelAssessment, 'player' | 'player_id'>
): string {
  const p = assessment.player;
  return (
    p?.name ||
    [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
    `Player #${assessment.player_id}`
  );
}

function answerText(value: ApiPlayerCustomFieldValue): string {
  if (isJsonField(value.field)) {
    return formatJsonFieldValue(value.field, value.value_json ?? value.value);
  }
  if (value.selected_options?.length) {
    return value.selected_options
      .map(opt => opt.option_label_snapshot)
      .join(', ');
  }
  if (value.value === null || value.value === undefined || value.value === '') {
    return '—';
  }
  return typeof value.value === 'object'
    ? JSON.stringify(value.value)
    : String(value.value);
}

export default function PlayerLevelAssessmentReview({
  assessmentId,
  onReviewed,
}: Props) {
  const [assessment, setAssessment] = useState<ApiPlayerLevelAssessment | null>(
    null
  );
  const [bands, setBands] = useState<ApiLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [level, setLevel] = useState('');
  const [message, setMessage] = useState('');
  const [levelError, setLevelError] = useState<string | null>(null);
  const approveStatus = useActionButtonStatus({ auditoryFeedback: true });
  const rejectStatus = useActionButtonStatus({ auditoryFeedback: true });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [assessmentRes, levels] = await Promise.all([
        assessmentsApi.getAssessment(assessmentId),
        levelsApi.getAllLevels().catch(() => [] as ApiLevel[]),
      ]);
      setAssessment(assessmentRes.data);
      setBands(levels);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const matchedBand = useMemo(
    () =>
      level.trim() && bands.length > 0
        ? findBandForLevel(bands, level.trim())
        : null,
    [bands, level]
  );

  const applyReviewed = (next: ApiPlayerLevelAssessment) => {
    setAssessment(next);
    onReviewed?.(next);
  };

  const approve = async () => {
    if (!assessment) return;
    const error = validatePlayerLevelInput(level, bands);
    setLevelError(error);
    if (error) throw new Error(error);
    const res = await assessmentsApi.approveAssessment(
      assessment.id_player_level_assessment,
      {
        level: level.trim(),
        review_message: message.trim() || null,
      }
    );
    applyReviewed(res.data);
  };

  const reject = async () => {
    if (!assessment) return;
    setLevelError(null);
    const res = await assessmentsApi.rejectAssessment(
      assessment.id_player_level_assessment,
      { review_message: message.trim() || null }
    );
    applyReviewed(res.data);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <LoadingSpinner text="Loading assessment..." />
      </View>
    );
  }

  if (loadError || !assessment) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text testID="assessment-load-error" className="text-red-800">
          {loadError || 'Assessment not found'}
        </Text>
      </View>
    );
  }

  const pending = assessment.review_status === 'pending';
  const values = assessment.submission?.values ?? [];
  const images = assessment.profile_images ?? [];

  return (
    <ScrollView className="flex-1 p-4" testID="assessment-review">
      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <Text
          testID="assessment-player"
          className="text-lg font-semibold text-gray-900 mb-2"
        >
          {assessmentPlayerLabel(assessment)}
        </Text>
        <ReviewStatusBadge
          testID="assessment-status"
          status={assessment.review_status}
        />
        <Text className="text-sm text-gray-600 mt-2">
          Submitted: {formatTimestamp(assessment.submitted_at)}
          {assessment.resubmitted_at
            ? ` · Resubmitted: ${formatTimestamp(assessment.resubmitted_at)}`
            : ''}
        </Text>
        <Text className="text-sm text-gray-600">
          Ready for review: {assessment.ready_for_review ? 'yes' : 'no'}
        </Text>
        {assessment.reviewed_at ? (
          <Text className="text-sm text-gray-600">
            Reviewed: {formatTimestamp(assessment.reviewed_at)}
          </Text>
        ) : null}
        {assessment.review_message ? (
          <Text
            testID="assessment-review-message"
            className="text-sm text-gray-700 mt-1"
          >
            Message: {assessment.review_message}
          </Text>
        ) : null}
        {assessment.player_level ? (
          <Text
            testID="assessment-player-level"
            className="text-sm text-gray-900 mt-2"
          >
            Approved level: {assessment.player_level.level}
            {assessment.player_level.band_name
              ? ` (${assessment.player_level.band_name})`
              : ''}
          </Text>
        ) : null}
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <Text className="text-base font-medium text-gray-900 mb-2">
          Answers
        </Text>
        {values.length === 0 ? (
          <Text className="text-sm text-gray-500">No answers submitted.</Text>
        ) : (
          values.map(v => (
            <View
              key={v.id_player_custom_field_value}
              testID={'assessment-answer-' + v.id_player_custom_field_value}
              className="mb-2"
            >
              <Text className="text-xs text-gray-500">
                {v.field?.label ?? `Field #${v.player_custom_field_id}`}
              </Text>
              <Text className="text-sm text-gray-900">{answerText(v)}</Text>
            </View>
          ))
        )}
      </View>

      {images.length > 0 ? (
        <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <Text className="text-base font-medium text-gray-900 mb-2">
            Profile images
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {images.map((img, i) =>
              img.url ? (
                <Image
                  key={i}
                  testID={'assessment-image-' + i}
                  source={{ uri: String(img.url) }}
                  style={{ width: 96, height: 96, borderRadius: 8 }}
                />
              ) : null
            )}
          </View>
        </View>
      ) : null}

      {pending ? (
        <View
          testID="assessment-review-form"
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <Text className="text-base font-medium text-gray-900 mb-2">
            Review
          </Text>

          <Text className="text-xs text-gray-500 mb-1">
            Player level (2 decimals, inside a seeded band)
          </Text>
          <AppTextInput
            testID="assessment-level-input"
            value={level}
            onChangeText={v => {
              setLevel(v);
              if (levelError) setLevelError(null);
            }}
            placeholder="e.g. 3.50"
            keyboardType="decimal-pad"
            autoCapitalize="none"
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white mb-1"
          />
          {levelError ? (
            <Text
              testID="assessment-level-error"
              className="text-xs text-red-600 mb-1"
            >
              {levelError}
            </Text>
          ) : matchedBand ? (
            <Text
              testID="assessment-level-band"
              className="text-xs text-gray-600 mb-1"
            >
              Band: {matchedBand.name} ({formatBandRange(matchedBand)})
            </Text>
          ) : null}

          {bands.length > 0 ? (
            <View testID="assessment-bands-hint" className="mb-2">
              <Text className="text-xs text-gray-500">
                Bands:{' '}
                {bands.map(b => `${b.name} ${formatBandRange(b)}`).join(' · ')}
              </Text>
            </View>
          ) : null}

          <Text className="text-xs text-gray-500 mb-1 mt-2">
            Message to player (optional)
          </Text>
          <AppTextInput
            testID="assessment-message-input"
            value={message}
            onChangeText={setMessage}
            placeholder="Review message"
            multiline
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white mb-3"
            style={{ minHeight: 64 }}
          />

          <View className="flex-row gap-2">
            <ActionButton
              testID="assessment-approve"
              label="Approve"
              variant="success"
              status={approveStatus.status}
              errorMessage={approveStatus.errorMessage ?? undefined}
              disabled={rejectStatus.status === 'pending'}
              onPress={() => void approveStatus.run(approve)}
            />
            <ActionButton
              testID="assessment-reject"
              label="Reject"
              variant="danger"
              status={rejectStatus.status}
              errorMessage={rejectStatus.errorMessage ?? undefined}
              disabled={approveStatus.status === 'pending'}
              onPress={() => void rejectStatus.run(reject)}
            />
          </View>
        </View>
      ) : (
        <Text
          testID="assessment-already-reviewed"
          className="text-sm text-gray-600"
        >
          This assessment has already been reviewed.
        </Text>
      )}
    </ScrollView>
  );
}
