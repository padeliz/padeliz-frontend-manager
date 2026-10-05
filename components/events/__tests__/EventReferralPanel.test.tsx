/**
 * @jest-environment jsdom
 */
import EventReferralPanel from '@/components/events/EventReferralPanel';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetSettings = jest.fn();
const mockUpdateSettings = jest.fn();
const mockTouchpoints = jest.fn();
const mockAttributions = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/services/api/referralApi', () => ({
  ReferralApiService: jest.fn().mockImplementation(() => ({
    getEventReferralSettings: (...args: unknown[]) =>
      mockGetSettings(...args),
    updateEventReferralSettings: (...args: unknown[]) =>
      mockUpdateSettings(...args),
    getReferralTouchpoints: (...args: unknown[]) => mockTouchpoints(...args),
    getReferralAttributions: (...args: unknown[]) =>
      mockAttributions(...args),
  })),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
  }),
}));

describe('EventReferralPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      data: { event_id: 5, code_ttl_hours: 48 },
    });
    mockTouchpoints.mockResolvedValue({
      data: [
        {
          id_touchpoint: 1,
          event_id: 5,
          referred_player_id: 2,
          referrer_player_id: 3,
          discount_eligible: true,
          touched_at: 1_700_000_000,
          inserted_at: 1,
        },
      ],
    });
    mockAttributions.mockResolvedValue({ data: [] });
    mockUpdateSettings.mockResolvedValue({
      data: { event_id: 5, code_ttl_hours: 96 },
    });
  });

  it('loads settings and touchpoints then saves TTL', async () => {
    const { getByTestId, findByTestId } = render(
      <EventReferralPanel eventId={5} />
    );
    expect(await findByTestId('referral-touchpoint-1')).toBeTruthy();
    expect(getByTestId('referral-no-attributions')).toBeTruthy();
    fireEvent.changeText(getByTestId('referral-ttl-hours'), '96');
    fireEvent.press(getByTestId('referral-settings-save'));
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(5, {
        code_ttl_hours: 96,
      });
    });
  });
});
