/**
 * Event Details tab
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventsApiService } from '@/services/api/eventsApi';
import { ApiEvent } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

const eventsApi = new EventsApiService();

export default function EventDetailsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = Number(params.id);
  const [chrome, setChrome] = useState<any>(null);

  const fetchResource = useCallback(async (id: string | number) => {
    return eventsApi.getEvent(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEvent>) => {
      return eventsApi.updateEvent(Number(id), data);
    },
    []
  );

  const detailsConfig = useResourceViewPageConfig<ApiEvent>({
    resourceName: 'Event',
    resourceDisplayName: 'Event',
    fetchResource,
    updateResource,
    embedded: true,
    showLinkedEntities: true,
    // Event divisions have their own tab with ordering + schedule links.
    excludeLinkedEntities: ['divisions', 'event_divisions'],
    excludeFields: ['entry_fee', 'students_entry_fee'],
    externalChrome: true,
    showSave: false,
    onChromeStateChange: setChrome,
    resourceIdOverride:
      eventId && !Number.isNaN(eventId) ? eventId : null,
    title: 'Event Details',
  } as any);

  const actions = useMemo(
    () =>
      chrome
        ? {
            save: chrome.save,
            refresh: chrome.refresh,
            edit: chrome.edit,
            cancel: chrome.cancel,
            isEditing: chrome.isEditing,
            isSaving: chrome.isSaving,
            canSave: chrome.canSave,
            isDirty: chrome.isDirty,
            displayTitle: chrome.displayTitle,
          }
        : null,
    [chrome]
  );
  useRegisterPageActions(actions);

  return (
    <View className="p-4">
      <ResourceViewPage config={detailsConfig} />
    </View>
  );
}
