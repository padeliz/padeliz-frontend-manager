import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { challengesApi } from '@/services/api/challengesApi';
import { seedLocalFromCreate } from '@/lib/challenges/syncEngine';
import { ApiChallengeSession } from '@/types/api/challenge';
import {
  challengeLivePath,
  challengeTypeLabel,
  formatChallengeTimestamp,
} from '@/utils/challengeUtils';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Props = {
  type?: 'king_of_the_court' | 'smash_contest';
  showCreate?: boolean;
};

export default function ChallengeSessionList({ type, showCreate = false }: Props) {
  const router = useRouter();
  const createStatus = useActionButtonStatus({ auditoryFeedback: true });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['challenge-sessions', type ?? 'all'],
    queryFn: async () => {
      const res = await challengesApi.list(
        type ? { type, per_page: 50 } : { per_page: 50 }
      );
      return res.data;
    },
  });

  const active = data?.find(s => s.status === 'active');
  const refresh = useCallback(async (): Promise<void> => {
    await refetch({ throwOnError: true });
  }, [refetch]);

  useRegisterPageActions({
    refresh,
    isRefreshing: isFetching,
  });

  const handleCreate = useCallback(async () => {
    if (!type || active) return;
    const res = await challengesApi.create(type);
    await seedLocalFromCreate(res.data);
    router.push(challengeLivePath(type, res.data.id_challenge_session) as any);
  }, [active, router, type]);

  const openSession = useCallback(
    (session: ApiChallengeSession) => {
      router.push(
        challengeLivePath(session.type, session.id_challenge_session) as any
      );
    },
    [router]
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="p-6">
        <Text className="text-red-600">Failed to load sessions.</Text>
      </View>
    );
  }

  const sessions = data ?? [];

  return (
    <View className="flex-1 p-4 gap-4" testID="challenge-session-list">
      {showCreate && type ? (
        <View className="bg-white border border-gray-200 rounded-lg p-4">
          <Text className="font-semibold text-gray-900 mb-2">
            {challengeTypeLabel(type)}
          </Text>
          {active ? (
            <Pressable
              testID="challenge-active-session-card"
              onPress={() => openSession(active)}
              className="border border-blue-200 bg-blue-50 rounded-lg p-3"
            >
              <Text className="text-blue-800 font-medium">Active session</Text>
              <Text className="text-gray-700">{active.title}</Text>
            </Pressable>
          ) : (
            <View className="self-start">
              <ActionButton
                testID="challenge-create-button"
                label="Create session"
                variant="primary"
                status={createStatus.status}
                errorMessage={createStatus.errorMessage ?? undefined}
                onPress={() => void createStatus.run(handleCreate)}
              />
            </View>
          )}
        </View>
      ) : null}

      {sessions.map(session => (
        <Pressable
          key={session.id_challenge_session}
          testID={`challenge-session-row-${session.id_challenge_session}`}
          onPress={() => openSession(session)}
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <Text className="font-medium text-gray-900">{session.title}</Text>
          <Text className="text-sm text-gray-600">
            {challengeTypeLabel(session.type)} · {session.status}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            Started {formatChallengeTimestamp(session.started_at)}
            {session.completed_at
              ? ` · Completed ${formatChallengeTimestamp(session.completed_at)}`
              : ''}
          </Text>
        </Pressable>
      ))}

      {sessions.length === 0 ? (
        <Text className="text-gray-500 text-center py-8">No sessions yet.</Text>
      ) : null}
    </View>
  );
}
