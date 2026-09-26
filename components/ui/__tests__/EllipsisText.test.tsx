jest.mock('@/utils/isWebPlatform', () => ({
  isWebPlatform: jest.fn(() => true),
}));

import EllipsisText from '@/components/ui/EllipsisText';
import { isWebPlatform } from '@/utils/isWebPlatform';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockIsWebPlatform = isWebPlatform as jest.MockedFunction<typeof isWebPlatform>;

describe('EllipsisText', () => {
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
    const { getByText, getByTestId, queryByTestId } = render(
      <EllipsisText tooltip="Shirt size: XL" testID="cf-value">
        XL
      </EllipsisText>
    );
    const node = getByText('XL');
    expect(node.props.title).toBeUndefined();
    expect(queryByTestId('tooltip-content')).toBeNull();

    fireEvent.press(getByTestId('cf-value-tooltip'));

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
