/**
 * Global payment-ops queue list (proofs / refunds / abandoned Netopia).
 * Locked `queue=` triage — one row per checkout; mutations live on
 * RegistrationPaymentPanel (per registration line / proof).
 */

import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { RegistrationOpsQueue } from '@/services/api/eventRegistrationsApi';
import { RegistrationCheckoutsApiService } from '@/services/api/registrationCheckoutsApi';
import {
  ApiEventRegistrationCheckout,
  ApiEventRegistrationCheckoutItem,
} from '@/types/api/entities';
import { UiDataTableColumn } from '@/types/ui/tables';
import { formatPlayerDisplayName } from '@/utils/event/matchPlayerLabels';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

const checkoutsApi = new RegistrationCheckoutsApiService();

const QUEUE_COPY: Record<
  RegistrationOpsQueue,
  { title: string; description: string; sectionHref: string }
> = {
  awaiting_proof: {
    title: 'Payment proofs',
    description: 'Checkouts awaiting bank-transfer proof review',
    sectionHref: '/payment-proofs',
  },
  refund_pending: {
    title: 'Refunds',
    description: 'Checkouts with registration lines pending a manual refund',
    sectionHref: '/refunds',
  },
  abandoned_netopia: {
    title: 'Abandoned checkouts',
    description:
      'Open checkouts with a pending or failed Netopia payment attempt',
    sectionHref: '/abandoned-checkouts',
  },
};

function divisionLineLabel(item: ApiEventRegistrationCheckoutItem): string {
  const reg = item.registration;
  const division =
    reg?.event_division?.division_title ||
    (reg?.event_division_id != null
      ? `Division #${reg.event_division_id}`
      : 'No division');
  const payment = reg?.payment_status
    ? ` · ${reg.payment_status.replace(/_/g, ' ')}`
    : '';
  const amount =
    item.amount != null ? ` · ${item.amount} RON` : '';
  return `#${item.registration_id} ${division}${amount}${payment}`;
}

function firstRegistrationId(
  checkout: ApiEventRegistrationCheckout
): number | null {
  const items = checkout.items ?? [];
  const withId = items.find(i => i.registration_id != null);
  return withId?.registration_id ?? null;
}

type Props = {
  queue: RegistrationOpsQueue;
};

export default function RegistrationQueueList({ queue }: Props) {
  const router = useRouter();
  const copy = QUEUE_COPY[queue];
  /** Checkout PK → first registration line (for metadata-style onView). */
  const registrationByCheckoutRef = useRef<Map<number, number>>(new Map());

  const extraListParams = useMemo(() => ({ queue }), [queue]);

  const openRegistration = useCallback(
    (registrationId: number) => {
      router.push(`/event-registrations/${registrationId}` as any);
    },
    [router]
  );

  const fetchData = useCallback(async (params: any) => {
    const response = await checkoutsApi.getCheckouts({
      queue: params.queue,
      page: params.page,
      per_page: params.per_page,
      q: params.q,
    });
    const next = new Map<number, number>();
    for (const checkout of response.data) {
      const registrationId = firstRegistrationId(checkout);
      if (registrationId != null) {
        next.set(checkout.id_checkout, registrationId);
      }
    }
    registrationByCheckoutRef.current = next;
    return {
      data: response.data,
      meta: response.meta,
      links: {},
    };
  }, []);

  const handleView = useCallback(
    (checkoutId: number) => {
      const registrationId = registrationByCheckoutRef.current.get(checkoutId);
      if (registrationId != null) {
        openRegistration(registrationId);
      }
    },
    [openRegistration]
  );

  const staticColumns: UiDataTableColumn<ApiEventRegistrationCheckout>[] =
    useMemo(
      () => [
        {
          key: 'id_checkout',
          label: 'Checkout',
          sortable: false,
          width: 100,
          render: (item: ApiEventRegistrationCheckout) => {
            const registrationId = firstRegistrationId(item);
            const label = `#${item.id_checkout}`;
            if (registrationId == null) {
              return <Text className="text-gray-900 text-sm">{label}</Text>;
            }
            return (
              <Pressable
                testID={`checkout-open-${item.id_checkout}`}
                onPress={() => openRegistration(registrationId)}
              >
                <Text className="text-blue-600 text-sm underline">{label}</Text>
              </Pressable>
            );
          },
        },
        {
          key: 'player',
          label: 'Player',
          sortable: false,
          width: 180,
          render: (item: ApiEventRegistrationCheckout) => (
            <Text className="text-gray-900 text-sm">
              {formatPlayerDisplayName(item.player) ||
                `Player #${item.player_id}`}
            </Text>
          ),
        },
        {
          key: 'event',
          label: 'Event',
          sortable: false,
          width: 160,
          render: (item: ApiEventRegistrationCheckout) => (
            <Text className="text-gray-700 text-sm">
              {item.event?.name || `Event #${item.event_id}`}
            </Text>
          ),
        },
        {
          key: 'status',
          label: 'Status',
          sortable: false,
          width: 120,
          render: (item: ApiEventRegistrationCheckout) => (
            <Text className="text-gray-700 text-sm">
              {String(item.status || '—').replace(/_/g, ' ')}
            </Text>
          ),
        },
        {
          key: 'total_amount',
          label: 'Total',
          sortable: false,
          width: 90,
          render: (item: ApiEventRegistrationCheckout) => (
            <Text className="text-gray-700 text-sm">
              {item.total_amount != null ? `${item.total_amount} RON` : '—'}
            </Text>
          ),
        },
        {
          key: 'items',
          label: 'Divisions',
          sortable: false,
          width: 280,
          render: (item: ApiEventRegistrationCheckout) => {
            const items = item.items ?? [];
            if (items.length === 0) {
              return <Text className="text-gray-500 text-sm">No lines</Text>;
            }
            return (
              <View testID={`checkout-divisions-${item.id_checkout}`}>
                {items.map(line => (
                  <Pressable
                    key={line.id_checkout_item}
                    testID={`checkout-line-${line.id_checkout_item}`}
                    onPress={() => openRegistration(line.registration_id)}
                    className="mb-0.5"
                  >
                    <Text className="text-blue-600 text-xs underline">
                      {divisionLineLabel(line)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            );
          },
        },
        {
          key: 'payment_proofs',
          label: 'Proofs',
          sortable: false,
          width: 120,
          render: (item: ApiEventRegistrationCheckout) => {
            const proofs = item.payment_proofs ?? [];
            if (proofs.length === 0) {
              return <Text className="text-gray-500 text-sm">—</Text>;
            }
            return (
              <Text className="text-gray-700 text-sm">
                {proofs
                  .map(
                    p =>
                      `#${p.id_payment_proof} ${String(p.review_status).replace(/_/g, ' ')}`
                  )
                  .join(', ')}
              </Text>
            );
          },
        },
        {
          key: 'latest_attempt',
          label: 'Latest attempt',
          sortable: false,
          width: 160,
          render: (item: ApiEventRegistrationCheckout) => {
            const attempt = item.latest_attempt;
            if (!attempt) {
              return <Text className="text-gray-500 text-sm">—</Text>;
            }
            return (
              <Text className="text-gray-700 text-sm">
                #{attempt.id_payment_attempt}{' '}
                {String(attempt.status).replace(/_/g, ' ')}
                {attempt.order_id ? ` · ${attempt.order_id}` : ''}
              </Text>
            );
          },
        },
      ],
      [openRegistration]
    );

  const config = useResourcePageConfig<ApiEventRegistrationCheckout>({
    resourceName: 'EventRegistrationCheckout',
    resourceDisplayName: 'Checkout',
    sectionLabel: copy.title,
    sectionHref: copy.sectionHref,
    fetchData,
    title: copy.title,
    description: copy.description,
    onView: handleView,
    staticColumns,
    primaryKeyField: 'id_checkout',
    // Queue triage only — no create/delete from these lists.
    enableBulkDelete: false,
    enableBulkExport: true,
    excludeFilterFields: ['payment_status'],
    extraListParams,
  });

  return <ResourceListPage config={config} />;
}
