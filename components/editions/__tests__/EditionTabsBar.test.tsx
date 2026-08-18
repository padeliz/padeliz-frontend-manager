import EditionTabsBar from '@/components/editions/EditionTabsBar';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const pathnameState = { value: '/editions/1/details' };

jest.mock('expo-router', () => ({
  Link: ({ children }: any) => children,
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: mockPush }),
}));

describe('EditionTabsBar', () => {
  beforeEach(() => {
    mockPush.mockClear();
    pathnameState.value = '/editions/1/details';
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

  it('marks Import active on /players/import but not on Imports routes', () => {
    pathnameState.value = '/players/import';
    const tabs = [
      { label: 'List', href: '/players/list', match: '/list' },
      { label: 'Import', href: '/players/import', match: '/import' },
      { label: 'Imports', href: '/players/imports', match: '/imports' },
    ];
    const { getByTestId, rerender } = render(<EditionTabsBar tabs={tabs} />);
    expect(getByTestId('edition-tab-Import').props.className).toContain(
      'bg-blue-600'
    );
    expect(getByTestId('edition-tab-Imports').props.className).toContain(
      'bg-gray-100'
    );

    pathnameState.value = '/players/imports';
    rerender(<EditionTabsBar tabs={tabs} />);
    expect(getByTestId('edition-tab-Import').props.className).toContain(
      'bg-gray-100'
    );
    expect(getByTestId('edition-tab-Imports').props.className).toContain(
      'bg-blue-600'
    );

    pathnameState.value = '/players/imports/5';
    rerender(<EditionTabsBar tabs={tabs} />);
    expect(getByTestId('edition-tab-Import').props.className).toContain(
      'bg-gray-100'
    );
    expect(getByTestId('edition-tab-Imports').props.className).toContain(
      'bg-blue-600'
    );
  });

  it('keeps lottery match active on nested /lottery/rules', () => {
    pathnameState.value = '/editions/1/lottery/rules';
    const { getByTestId } = render(
      <EditionTabsBar
        tabs={[
          {
            label: 'Lottery',
            href: '/editions/1/lottery/prizes',
            match: '/lottery',
          },
          {
            label: 'Schedule',
            href: '/editions/1/schedule',
            match: '/schedule',
          },
        ]}
      />
    );
    expect(getByTestId('edition-tab-Lottery').props.className).toContain(
      'bg-blue-600'
    );
    expect(getByTestId('edition-tab-Schedule').props.className).toContain(
      'bg-gray-100'
    );
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
