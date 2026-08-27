/**
 * Challenges All tab — embedded ResourceListPage without Add.
 */

import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { challengesApi } from '@/services/api/challengesApi';
import { ApiChallengeSession } from '@/types/api/challenge';
import { UiDataTableColumn } from '@/types/ui/tables';
import {
  challengeLivePath,
  challengeTypeLabel,
  formatChallengeTimestamp,
} from '@/utils/challengeUtils';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Text } from 'react-native';

export default function ChallengesAllTab() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await challengesApi.list({
      page: params.page,
      per_page: params.per_page,
    });
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const handleView = useCallback(
    (sessionId: number) => {
      void challengesApi.show(sessionId).then(res => {
        router.push(
          challengeLivePath(res.data.type, sessionId) as any
        );
      });
    },
    [router]
  );

  const staticColumns: UiDataTableColumn<ApiChallengeSession>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        width: 220,
        render: (item: ApiChallengeSession) => (
          <Text className="text-gray-900">{item.title}</Text>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        width: 160,
        render: (item: ApiChallengeSession) => (
          <Text className="text-gray-700">{challengeTypeLabel(item.type)}</Text>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: 100,
        render: (item: ApiChallengeSession) => (
          <Text className="text-gray-700">{item.status}</Text>
        ),
      },
      {
        key: 'started_at',
        label: 'Started',
        sortable: true,
        width: 160,
        render: (item: ApiChallengeSession) => (
          <Text className="text-gray-600">
            {formatChallengeTimestamp(item.started_at)}
          </Text>
        ),
      },
      {
        key: 'completed_at',
        label: 'Completed',
        sortable: true,
        width: 160,
        render: (item: ApiChallengeSession) => (
          <Text className="text-gray-600">
            {formatChallengeTimestamp(item.completed_at)}
          </Text>
        ),
      },
    ],
    []
  );

  const config = useResourcePageConfig<ApiChallengeSession>({
    resourceName: 'ChallengeSession',
    resourceDisplayName: 'Challenge Session',
    fetchData,
    staticColumns,
    primaryKeyField: 'id_challenge_session',
    title: 'Challenges',
    description: 'All challenge sessions',
    onView: handleView,
    initialPage: 1,
    initialPerPage: 10,
    debounceMs: 300,
    embedded: true,
    enableBulkDelete: false,
    enableBulkExport: false,
  });

  return <ResourceListPage config={config} />;
}
