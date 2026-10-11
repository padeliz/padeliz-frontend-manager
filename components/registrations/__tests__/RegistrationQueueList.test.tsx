/**
 * @jest-environment jsdom
 */
import RegistrationQueueList from '@/components/registrations/RegistrationQueueList';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetCheckouts = jest.fn(async () => ({
  data: [
    {
      id_checkout: 42,
      event_id: 1,
      player_user_id: 9,
      status: 'awaiting_proof',
      total_amount: 100,
      items: [
        {
          id_checkout_item: 1,
          registration_id: 2139,
          amount: 50,
          item_status: 'active',
          registration: {
            id_registration: 2139,
            event_division_id: 3,
            payment_status: 'awaiting_proof_review',
            event_division: { division_title: 'Men A' },
          },
        },
        {
          id_checkout_item: 2,
          registration_id: 2140,
          amount: 50,
          item_status: 'active',
          registration: {
            id_registration: 2140,
            event_division_id: 4,
            payment_status: 'awaiting_proof_review',
            event_division: { division_title: 'Mixed' },
          },
        },
      ],
      payment_proofs: [
        { id_payment_proof: 7, url: 'https://x', review_status: 'pending' },
      ],
      latest_attempt: null,
      player: { id_user: 9, name: 'Ada' },
      event: { id_event: 1, name: 'Spring Open' },
    },
  ],
  meta: { total: 1, last_page: 1 },
  links: {},
}));
const mockGetPlayerCheckouts = jest.fn(async (_playerId: number) => ({
  data: [{ id_checkout: 77, event_id: 1, player_user_id: 9, status: 'completed', total_amount: 50, items: [] }],
  meta: { total: 1, last_page: 1 },
}));
const mockPush = jest.fn();
let capturedConfig: any;

jest.mock('@/services/api/registrationCheckoutsApi', () => ({
  RegistrationCheckoutsApiService: jest.fn().mockImplementation(() => ({
    getCheckouts: (...args: unknown[]) => mockGetCheckouts(...args),
    getPlayerCheckouts: (playerId: number) => mockGetPlayerCheckouts(playerId),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ push: mockPush }),
  })
);

jest.mock('@/components/pages/ResourceListPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    capturedConfig = config;
    const { Pressable, Text, View } = require('react-native');
    return (
      <View testID="queue-list">
        <Text testID="queue-title">{config.title}</Text>
        <Text testID="resource-name">{config.resourceName}</Text>
        <Text testID="primary-key">{config.primaryKeyField}</Text>
        <Text testID="exclude-filter-fields">
          {(config.excludeFilterFields || []).join(',')}
        </Text>
        <Text testID="extra-list-params">
          {JSON.stringify(config.extraListParams ?? {})}
        </Text>
        <Text testID="bulk-delete-enabled">
          {config.bulkActions?.some((a: any) => a.action === 'delete')
            ? 'yes'
            : 'no'}
        </Text>
        <Text testID="static-columns">
          {(config.staticColumns || []).map((c: any) => c.key).join(',')}
        </Text>
        <Pressable
          testID="queue-row-view"
          onPress={() => config.onView?.(42)}
        />
      </View>
    );
  },
}));

describe('RegistrationQueueList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
  });

  it('locks awaiting_proof via extraListParams and lists checkouts', async () => {
    render(<RegistrationQueueList queue="awaiting_proof" />);
    await waitFor(() => expect(capturedConfig).toBeTruthy());

    expect(capturedConfig.resourceName).toBe('EventRegistrationCheckout');
    expect(capturedConfig.primaryKeyField).toBe('id_checkout');
    expect(capturedConfig.excludeFilterFields).toEqual(['payment_status']);
    expect(capturedConfig.extraListParams).toEqual({ queue: 'awaiting_proof' });
    expect(capturedConfig.staticColumns?.map((c: any) => c.key)).toEqual(
      expect.arrayContaining(['id_checkout', 'items', 'payment_proofs'])
    );
    expect(
      capturedConfig.bulkActions?.some((a: any) => a.action === 'delete')
    ).toBeFalsy();

    await capturedConfig.fetchData({
      page: 1,
      per_page: 10,
      queue: 'awaiting_proof',
    });
    expect(mockGetCheckouts).toHaveBeenCalledWith(
      expect.objectContaining({ queue: 'awaiting_proof' })
    );
  });

  it('navigates row open to the first registration line', async () => {
    const { getByTestId } = render(
      <RegistrationQueueList queue="refund_pending" />
    );
    await waitFor(() => expect(capturedConfig).toBeTruthy());

    await capturedConfig.fetchData({
      page: 1,
      per_page: 10,
      queue: 'refund_pending',
    });

    fireEvent.press(getByTestId('queue-row-view'));
    expect(mockPush).toHaveBeenCalledWith('/event-registrations/2139');
  });

  it('locks abandoned_netopia via extraListParams', async () => {
    const { getByTestId } = render(
      <RegistrationQueueList queue="abandoned_netopia" />
    );
    await waitFor(() => expect(capturedConfig).toBeTruthy());
    expect(capturedConfig.extraListParams).toEqual({
      queue: 'abandoned_netopia',
    });
    expect(getByTestId('extra-list-params')).toHaveTextContent(
      /abandoned_netopia/
    );
  });

  it('renders division lines as detail in the items column', async () => {
    render(<RegistrationQueueList queue="awaiting_proof" />);
    await waitFor(() => expect(capturedConfig).toBeTruthy());

    const itemsCol = capturedConfig.staticColumns.find(
      (c: any) => c.key === 'items'
    );
    const checkout = (
      await mockGetCheckouts({ queue: 'awaiting_proof' })
    ).data[0];
    const { getByTestId, getByText } = render(itemsCol.render(checkout));

    expect(getByTestId('checkout-divisions-42')).toBeTruthy();
    expect(getByText(/Men A/)).toBeTruthy();
    expect(getByText(/Mixed/)).toBeTruthy();

    fireEvent.press(getByTestId('checkout-line-2'));
    expect(mockPush).toHaveBeenCalledWith('/event-registrations/2140');
  });

  describe('player scope (Player > Checkouts tab)', () => {
    it('lists the player checkouts without any queue and embeds in the chrome', async () => {
      render(<RegistrationQueueList playerId={9} />);
      await waitFor(() => expect(capturedConfig).toBeTruthy());

      expect(capturedConfig.resourceName).toBe('EventRegistrationCheckout');
      expect(capturedConfig.embedded).toBe(true);
      expect(capturedConfig.extraListParams).toEqual({ player_user_id: 9 });
      expect(capturedConfig.extraListParams).not.toHaveProperty('queue');
      expect(capturedConfig.excludeFilterFields).toEqual(
        expect.arrayContaining(['player_user_id'])
      );
      expect(capturedConfig.title).toBe('Checkouts');
      expect(capturedConfig.sectionHref).toBe('/players/9/checkouts');

      const res = await capturedConfig.fetchData({ page: 1, per_page: 10 });
      expect(mockGetPlayerCheckouts).toHaveBeenCalledWith(9);
      expect(mockGetCheckouts).not.toHaveBeenCalled();
      expect(res.data[0].id_checkout).toBe(77);
    });

    it('drops the redundant player column but keeps the rest', async () => {
      render(<RegistrationQueueList playerId={9} />);
      await waitFor(() => expect(capturedConfig).toBeTruthy());

      const keys = capturedConfig.staticColumns.map((c: any) => c.key);
      expect(keys).not.toContain('player');
      expect(keys).toEqual(
        expect.arrayContaining(['id_checkout', 'event', 'status', 'items'])
      );
    });

    it('keeps queue lists global and not embedded', async () => {
      render(<RegistrationQueueList queue="awaiting_proof" />);
      await waitFor(() => expect(capturedConfig).toBeTruthy());

      expect(capturedConfig.embedded).toBe(false);
      expect(capturedConfig.staticColumns.map((c: any) => c.key)).toContain(
        'player'
      );
    });
  });
});
