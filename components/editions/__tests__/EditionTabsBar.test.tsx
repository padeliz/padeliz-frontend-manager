import EditionTabsBar from '@/components/editions/EditionTabsBar';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Link: ({ children }: any) => children,
  usePathname: () => '/editions/1/details',
  useRouter: () => ({ push: mockPush }),
}));

describe('EditionTabsBar', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders provided tabs', () => {
    const { getByTestId } = render(
      <EditionTabsBar
        tabs={[
          { label: 'Details', href: '/editions/1/details', match: '/details' },
          {
            label: 'Schedule',
            href: '/editions/1/schedule/knobs',
            match: '/schedule',
          },
        ]}
      />
    );
    expect(getByTestId('edition-tab-Details')).toBeTruthy();
    expect(getByTestId('edition-tab-Schedule')).toBeTruthy();
  });

  it('soft-nav skips push when onBeforeNavigate returns false', async () => {
    const onBeforeNavigate = jest.fn(async () => false);
    const { getByTestId } = render(
      <EditionTabsBar
        tabs={[
          { label: 'Details', href: '/editions/1/details', match: '/details' },
          {
            label: 'Participations',
            href: '/editions/1/participations',
            match: '/participations',
          },
        ]}
        onBeforeNavigate={onBeforeNavigate}
      />
    );

    fireEvent.press(getByTestId('edition-tab-Participations'));
    await waitFor(() => {
      expect(onBeforeNavigate).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('soft-nav pushes when onBeforeNavigate returns true', async () => {
    const onBeforeNavigate = jest.fn(async () => true);
    const { getByTestId } = render(
      <EditionTabsBar
        tabs={[
          { label: 'Details', href: '/editions/1/details', match: '/details' },
          {
            label: 'Participations',
            href: '/editions/1/participations',
            match: '/participations',
          },
        ]}
        onBeforeNavigate={onBeforeNavigate}
      />
    );

    fireEvent.press(getByTestId('edition-tab-Participations'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/editions/1/participations');
    });
  });

  it('action tab calls onPress without router.push or onBeforeNavigate', async () => {
    const onBeforeNavigate = jest.fn(async () => false);
    const onPress = jest.fn();
    const { getByTestId } = render(
      <EditionTabsBar
        tabs={[
          { label: 'Prizes', href: '/editions/1/lottery/prizes', match: '/prizes' },
          {
            label: 'Open LIVE lottery',
            href: '/lottery-live/1',
            match: '/lottery-live',
            variant: 'live',
            onPress,
          },
        ]}
        onBeforeNavigate={onBeforeNavigate}
      />
    );

    fireEvent.press(getByTestId('open-live-lottery'));
    await waitFor(() => {
      expect(onPress).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(onBeforeNavigate).not.toHaveBeenCalled();
  });
});
