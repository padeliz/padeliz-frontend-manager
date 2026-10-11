/**
 * Review UI for a single student proof: shows every uploaded file (up to 3) and lets a
 * manager approve (optionally correcting student_until) or reject. Proofs are
 * uploaded by players and never created here.
 */

import ReviewStatusBadge from '@/components/playerLevels/ReviewStatusBadge';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { PlayerStudentProofsApiService } from '@/services/api/playerStudentProofsApi';
import { ApiPlayerStudentProof } from '@/types/api/entities';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

const proofsApi = new PlayerStudentProofsApiService();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Props = {
  proofId: number;
  onReviewed?: (proof: ApiPlayerStudentProof) => void;
};

function formatTimestamp(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

function isPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

export function proofPlayerLabel(
  proof: Pick<ApiPlayerStudentProof, 'player' | 'player_user_id'>
): string {
  const p = proof.player;
  return (
    p?.name ||
    [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
    `Player #${proof.player_user_id}`
  );
}

export default function StudentProofReview({ proofId, onReviewed }: Props) {
  const [proof, setProof] = useState<ApiPlayerStudentProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studentUntil, setStudentUntil] = useState('');
  const [message, setMessage] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const approveStatus = useActionButtonStatus({ auditoryFeedback: true });
  const rejectStatus = useActionButtonStatus({ auditoryFeedback: true });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await proofsApi.getProof(proofId);
      setProof(res.data);
      setStudentUntil(res.data.student_until ?? '');
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load student proof');
    } finally {
      setLoading(false);
    }
  }, [proofId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyReviewed = (next: ApiPlayerStudentProof) => {
    setProof(next);
    onReviewed?.(next);
  };

  const approve = async () => {
    if (!proof) return;
    const trimmed = studentUntil.trim();
    if (trimmed && !DATE_RE.test(trimmed)) {
      const error = 'Student until must be a date (YYYY-MM-DD).';
      setDateError(error);
      throw new Error(error);
    }
    setDateError(null);
    // Only send a correction when the manager actually changed the date.
    const corrected =
      trimmed && trimmed !== (proof.student_until ?? '') ? trimmed : undefined;
    const res = await proofsApi.approveProof(proof.id_player_student_proof, {
      review_message: message.trim() || null,
      ...(corrected ? { student_until: corrected } : {}),
    });
    applyReviewed(res.data);
  };

  const reject = async () => {
    if (!proof) return;
    setDateError(null);
    const res = await proofsApi.rejectProof(proof.id_player_student_proof, {
      review_message: message.trim() || null,
    });
    applyReviewed(res.data);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <LoadingSpinner text="Loading student proof..." />
      </View>
    );
  }

  if (loadError || !proof) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text testID="proof-load-error" className="text-red-800">
          {loadError || 'Student proof not found'}
        </Text>
      </View>
    );
  }

  const pending = proof.review_status === 'pending';
  const files = proof.files ?? [];

  return (
    <ScrollView className="flex-1 p-4" testID="proof-review">
      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <Text
          testID="proof-player"
          className="text-lg font-semibold text-gray-900 mb-2"
        >
          {proofPlayerLabel(proof)}
        </Text>
        <ReviewStatusBadge testID="proof-status" status={proof.review_status} />
        <Text
          testID="proof-student-until"
          className="text-sm text-gray-700 mt-2"
        >
          Student until: {proof.student_until ?? '—'}
        </Text>
        <Text className="text-sm text-gray-600">
          Submitted: {formatTimestamp(proof.submitted_at)}
        </Text>
        <Text className="text-sm text-gray-600">
          Ready for review: {proof.ready_for_review ? 'yes' : 'no'}
        </Text>
        {proof.reviewed_at ? (
          <Text className="text-sm text-gray-600">
            Reviewed: {formatTimestamp(proof.reviewed_at)}
          </Text>
        ) : null}
        {proof.review_message ? (
          <Text
            testID="proof-review-message"
            className="text-sm text-gray-700 mt-1"
          >
            Message: {proof.review_message}
          </Text>
        ) : null}
      </View>

      <View className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <Text className="text-base font-medium text-gray-900 mb-2">
          Proof files ({files.length})
        </Text>
        {files.length > 0 ? (
          <View testID="proof-files" className="gap-3">
            {files.map((file, index) =>
              isPdf(file.url) ? (
                <Pressable
                  key={file.id_player_student_proof_file}
                  testID={`proof-open-file-${file.id_player_student_proof_file}`}
                  onPress={() => void Linking.openURL(file.url)}
                  className="self-start bg-blue-50 rounded px-3 py-2"
                >
                  <Text className="text-blue-700 text-sm">
                    Open PDF {index + 1}
                  </Text>
                </Pressable>
              ) : (
                <Image
                  key={file.id_player_student_proof_file}
                  testID={`proof-image-${file.id_player_student_proof_file}`}
                  source={{ uri: file.url }}
                  style={{ width: 280, height: 360 }}
                  resizeMode="contain"
                />
              )
            )}
          </View>
        ) : (
          <Text testID="proof-no-files" className="text-sm text-gray-500">
            No file available.
          </Text>
        )}
      </View>

      {pending ? (
        <View
          testID="proof-review-form"
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <Text className="text-base font-medium text-gray-900 mb-2">
            Review
          </Text>
          <Text className="text-xs text-gray-500 mb-1">
            Student until (YYYY-MM-DD, correct if the proof says otherwise)
          </Text>
          <AppTextInput
            testID="proof-student-until-input"
            value={studentUntil}
            onChangeText={v => {
              setStudentUntil(v);
              if (dateError) setDateError(null);
            }}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white mb-1"
          />
          {dateError ? (
            <Text
              testID="proof-date-error"
              className="text-xs text-red-600 mb-1"
            >
              {dateError}
            </Text>
          ) : null}
          <Text className="text-xs text-gray-500 mb-1 mt-2">
            Message to player (optional)
          </Text>
          <AppTextInput
            testID="proof-message-input"
            value={message}
            onChangeText={setMessage}
            placeholder="Review message"
            multiline
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white mb-3"
            style={{ minHeight: 64 }}
          />
          <View className="flex-row gap-2">
            <ActionButton
              testID="proof-approve"
              label="Approve"
              variant="success"
              status={approveStatus.status}
              errorMessage={approveStatus.errorMessage ?? undefined}
              disabled={rejectStatus.status === 'pending'}
              onPress={() => void approveStatus.run(approve)}
            />
            <ActionButton
              testID="proof-reject"
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
        <Text testID="proof-already-reviewed" className="text-sm text-gray-600">
          This proof has already been reviewed.
        </Text>
      )}
    </ScrollView>
  );
}
