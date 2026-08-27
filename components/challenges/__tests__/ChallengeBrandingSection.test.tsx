import ChallengeBrandingSection from '@/components/challenges/ChallengeBrandingSection';
import { fitLogoSize } from '@/constants/challengeBranding';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Image } from 'react-native';

describe('ChallengeBrandingSection', () => {
  const getSizeSpy = jest.spyOn(Image, 'getSize');

  beforeEach(() => {
    getSizeSpy.mockImplementation((uri, success) => {
      success(50, 25);
    });
  });

  afterEach(() => {
    getSizeSpy.mockReset();
  });

  afterAll(() => {
    getSizeSpy.mockRestore();
  });

  it('uses default gap-3 between rows and gap-4 between logos', () => {
    const rows = [
      ['http://example.com/a.png', 'http://example.com/b.png'],
      [
        'http://example.com/c.png',
        'http://example.com/d.png',
        'http://example.com/e.png',
        'http://example.com/f.png',
      ],
    ];
    const { getByTestId, getByText } = render(
      <ChallengeBrandingSection
        title="Prize Partners"
        rows={rows}
        logoMaxHeight={40}
        logoAlign="center"
        testID="prize-partners"
      />
    );

    const root = getByTestId('prize-partners');
    expect(root.props.className).toMatch(/bg-transparent/);
    expect(root.props.className).toMatch(/border-gray-200/);

    const title = getByText('Prize Partners');
    expect(title.props.className).toMatch(/text-gray-500/);
    expect(title.props.className).toMatch(/mb-5/);

    expect(getByTestId('prize-partners-rows').props.className).toMatch(/gap-3/);
    const row0 = getByTestId('prize-partners-row-0');
    expect(row0.props.className).toMatch(/gap-4/);
    expect(getByTestId('prize-partners-row-1')).toBeTruthy();

    const cell = getByTestId('prize-partners-cell-0-0');
    expect(cell.props.className).toMatch(/items-center/);

    const logo = getByTestId('prize-partners-logo-0-0');
    expect(logo.props.source).toEqual({ uri: 'http://example.com/a.png' });
    expect(logo.props.resizeMode).toBe('stretch');
  });

  it('applies custom rowsGapClassName and logoGapClassName', () => {
    const { getByTestId } = render(
      <ChallengeBrandingSection
        title="Prize Partners"
        rows={[
          ['http://example.com/a.png', 'http://example.com/b.png'],
          ['http://example.com/c.png', 'http://example.com/d.png'],
        ]}
        logoMaxHeight={48}
        logoAlign="center"
        rowsGapClassName="gap-4"
        logoGapClassName="gap-5"
        testID="pp-gaps"
      />
    );

    expect(getByTestId('pp-gaps-rows').props.className).toMatch(/gap-4/);
    expect(getByTestId('pp-gaps-row-0').props.className).toMatch(/gap-5/);
  });

  it('renders two coordinator logos left-aligned in a single row', () => {
    const { getByTestId, queryByTestId } = render(
      <ChallengeBrandingSection
        title="Coordinators"
        rows={[
          ['http://example.com/c1.png', 'http://example.com/c2.png'],
        ]}
        logoMaxHeight={80}
        logoAlign="start"
        testID="coordinators"
      />
    );

    expect(getByTestId('coordinators-logo-0-0')).toBeTruthy();
    expect(getByTestId('coordinators-logo-0-1')).toBeTruthy();
    expect(queryByTestId('coordinators-row-1')).toBeNull();
    expect(getByTestId('coordinators-rows').props.className).toMatch(/gap-3/);
    expect(getByTestId('coordinators-row-0').props.className).toMatch(/gap-4/);
    expect(getByTestId('coordinators-cell-0-0').props.className).toMatch(
      /items-start/
    );
  });

  it('sizes logo via fitLogoSize after onLayout and Image.getSize success', async () => {
    const { getByTestId } = render(
      <ChallengeBrandingSection
        title="Coordinators"
        rows={[['http://example.com/c1.png']]}
        logoMaxHeight={80}
        logoAlign="start"
        testID="fit"
      />
    );

    const cell = getByTestId('fit-cell-0-0');
    fireEvent(cell, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 80 } },
    });

    const expected = fitLogoSize(50, 25, 200, 80);
    await waitFor(() => {
      expect(getByTestId('fit-logo-0-0').props.style).toEqual(
        expect.objectContaining({
          width: expected.width,
          height: expected.height,
        })
      );
    });
  });

  it('keeps zero fitted size when Image.getSize fails', async () => {
    getSizeSpy.mockImplementation((_uri, _success, failure) => {
      failure?.(new Error('load failed'));
    });

    const { getByTestId } = render(
      <ChallengeBrandingSection
        title="Coordinators"
        rows={[['http://example.com/bad.png']]}
        logoMaxHeight={80}
        logoAlign="start"
        testID="fail"
      />
    );

    fireEvent(getByTestId('fail-cell-0-0'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 80 } },
    });

    await waitFor(() => {
      expect(getByTestId('fail-logo-0-0').props.style).toEqual(
        expect.objectContaining({ width: 0, height: 0 })
      );
    });
  });

  it('ignores stale Image.getSize success after unmount', async () => {
    let delayedSuccess: ((w: number, h: number) => void) | null = null;
    getSizeSpy.mockImplementation((_uri, success) => {
      delayedSuccess = success;
    });

    const { getByTestId, unmount } = render(
      <ChallengeBrandingSection
        title="Coordinators"
        rows={[['http://example.com/c1.png']]}
        logoMaxHeight={80}
        logoAlign="start"
        testID="stale"
      />
    );

    fireEvent(getByTestId('stale-cell-0-0'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 80 } },
    });
    expect(getByTestId('stale-logo-0-0').props.style).toEqual(
      expect.objectContaining({ width: 0, height: 0 })
    );

    unmount();
    expect(delayedSuccess).not.toBeNull();
    expect(() => {
      act(() => {
        delayedSuccess?.(50, 25);
      });
    }).not.toThrow();
  });
});
