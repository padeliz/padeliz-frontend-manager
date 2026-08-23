/**
 * @jest-environment jsdom
 */

jest.mock('react-dom', () => {
  const actual = jest.requireActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

jest.mock('@/utils/isWebPlatform', () => ({
  isWebPlatform: jest.fn(() => true),
}));

import EllipsisText from '@/components/ui/EllipsisText';
import { isWebPlatform } from '@/utils/isWebPlatform';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockIsWebPlatform = isWebPlatform as jest.MockedFunction<typeof isWebPlatform>;

describe('EllipsisText', () => {
  beforeAll(() => {
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 100,
      toJSON: () => ({}),
    }));
  });

  beforeEach(() => {
    mockIsWebPlatform.mockReturnValue(true);
  });

  it('renders with numberOfLines={1} and truncate class', () => {
    const { getByText } = render(
      <EllipsisText testID="ellipsis">Very long custom field value text</EllipsisText>
    );
    const node = getByText('Very long custom field value text');
    expect(node.props.numberOfLines).toBe(1);
    expect(node.props.className).toContain('truncate');
  });

  it('sets web title to full value when tooltip is not provided', () => {
    const { getByText } = render(
      <EllipsisText>Full tooltip value</EllipsisText>
    );
    const node = getByText('Full tooltip value');
    expect(node.props.title).toBe('Full tooltip value');
  });

  it('uses floating tooltip instead of title when tooltip prop is set', async () => {
    const { getByText, getByTestId } = render(
      <EllipsisText tooltip="Shirt size: XL" testID="cf-value">
        XL
      </EllipsisText>
    );
    const node = getByText('XL');
    expect(node.props.title).toBeUndefined();

    await act(async () => {
      getByTestId('cf-value-tooltip').props.onMouseEnter();
    });

    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toHaveTextContent('Shirt size: XL');
    });
  });

  it('applies maxWidth style when provided', () => {
    const { getByText } = render(
      <EllipsisText maxWidth={128}>Short</EllipsisText>
    );
    const node = getByText('Short');
    expect(node.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ maxWidth: 128 })])
    );
  });
});
