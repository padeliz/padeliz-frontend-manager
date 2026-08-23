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

import Tooltip from '@/components/ui/Tooltip';
import { isWebPlatform } from '@/utils/isWebPlatform';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, Text } from 'react-native';

const mockIsWebPlatform = isWebPlatform as jest.MockedFunction<typeof isWebPlatform>;

describe('Tooltip', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children on web', () => {
    const { getByText } = render(
      <Tooltip content="Hint text">
        <Text>Trigger</Text>
      </Tooltip>
    );
    expect(getByText('Trigger')).toBeTruthy();
  });

  it('shows floating tooltip content on web hover', async () => {
    const { getByTestId, queryByTestId } = render(
      <Tooltip content="Shirt size: XL" testID="tooltip-trigger">
        <Text>XL</Text>
      </Tooltip>
    );

    expect(queryByTestId('tooltip-content')).toBeNull();

    await act(async () => {
      getByTestId('tooltip-trigger').props.onMouseEnter();
    });

    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toHaveTextContent('Shirt size: XL');
    });

    await act(async () => {
      getByTestId('tooltip-trigger').props.onMouseLeave();
    });

    await waitFor(() => {
      expect(queryByTestId('tooltip-content')).toBeNull();
    });
  });

  it('does not show tooltip when disabled', async () => {
    const { getByTestId, queryByTestId } = render(
      <Tooltip content="Hidden" disabled testID="tooltip-trigger">
        <Text>Trigger</Text>
      </Tooltip>
    );

    await act(async () => {
      getByTestId('tooltip-trigger').props.onMouseEnter();
    });

    expect(queryByTestId('tooltip-content')).toBeNull();
  });

  it('shows alert on native long press', () => {
    mockIsWebPlatform.mockReturnValue(false);

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = render(
      <Tooltip content="Native hint" testID="tooltip-trigger">
        <Text>Trigger</Text>
      </Tooltip>
    );

    act(() => {
      fireEvent(getByTestId('tooltip-trigger'), 'longPress');
    });

    expect(Alert.alert).toHaveBeenCalledWith('', 'Native hint');
  });
});
