/**
 * Events Management Page
 * Complete events resource management using the reusable system
 */

import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EventsApiService } from '@/services/api/eventsApi';
import { ApiEvent } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const eventsApi = new EventsApiService();

export default function EventsPage() {
  const router = useRouter();

  // Columns will be generated dynamically from metadata

  // Stable fetch functions using useCallback
  const fetchData = useCallback(async (params: any) => {
    const response = await eventsApi.getEvents(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    const response = await eventsApi.bulkDeleteEvents(ids as number[]);
    return response;
  }, []);

  // Action handlers
  const handleAddEvent = useCallback(() => {
    router.push('/events/add');
  }, [router]);

  const handleViewEvent = useCallback(
    (eventId: number) => {
      router.push(`/events/${eventId}`);
    },
    [router]
  );

  const handleExportAll = useCallback((format: string) => {
    // Custom export logic can be implemented here
  }, []);

  // Create resource page configuration using the hook
  const config = useResourcePageConfig<ApiEvent>({
    resourceName: 'Event',
    resourceDisplayName: 'Event',
    sectionLabel: 'Events',
    sectionHref: '/events',
    fetchData,
    bulkDelete,
    title: 'Events',
    description:
      'Manage padel events with advanced search, filters, and bulk operations',
    onAdd: handleAddEvent,
    onView: handleViewEvent,
    onExport: handleExportAll,
    excludeFields: ['entry_fee', 'students_entry_fee'],
    excludeFilterFields: ['entry_fee', 'students_entry_fee'],
    initialPage: 1,
    initialPerPage: 10,
    debounceMs: 300,
    showDebugInfo: false,
    showInstructions: false,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
