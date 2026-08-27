import FullscreenToggleButton from '@/components/chrome/FullscreenToggleButton';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockEnterFullscreen = jest.fn();

jest.mock('@/hooks/useLayoutChrome', () => ({
  useLayoutChrome: jest.fn(),
}));

const { useLayoutChrome } = jest.requireMock('@/hooks/useLayoutChrome');

describe('FullscreenToggleButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLayoutChrome.mockReturnValue({
      isFullscreen: false,
      enterFullscreen: mockEnterFullscreen,
    });
  });

  it('renders when not fullscreen', () => {
    const { getByTestId } = render(<FullscreenToggleButton />);
    expect(getByTestId('fullscreen-toggle').props.accessibilityLabel).toBe(
      'Enter fullscreen'
    );
  });

  it('is hidden when isFullscreen', () => {
    useLayoutChrome.mockReturnValue({
      isFullscreen: true,
      enterFullscreen: mockEnterFullscreen,
    });
    const { queryByTestId } = render(<FullscreenToggleButton />);
    expect(queryByTestId('fullscreen-toggle')).toBeNull();
  });

  it('calls enterFullscreen on press', () => {
    const { getByTestId } = render(<FullscreenToggleButton />);
    fireEvent.press(getByTestId('fullscreen-toggle'));
    expect(mockEnterFullscreen).toHaveBeenCalled();
  });
});
