import Tooltip from '@/components/ui/Tooltip';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, Modal, Text } from 'react-native';

describe('Tooltip (native)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderTooltip(
    props: Partial<React.ComponentProps<typeof Tooltip>> = {}
  ) {
    return render(
      <Tooltip content="Native hint" testID="tooltip-trigger" {...props}>
        <Text>Trigger</Text>
      </Tooltip>
    );
  }

  it('renders children', () => {
    const { getByText } = renderTooltip();
    expect(getByText('Trigger')).toBeTruthy();
  });

  it('exposes testID on the trigger', () => {
    const { getByTestId } = renderTooltip();
    expect(getByTestId('tooltip-trigger')).toBeTruthy();
  });

  it('opens on press with content', async () => {
    const { getByTestId, queryByTestId } = renderTooltip();

    expect(queryByTestId('tooltip-content')).toBeNull();

    fireEvent.press(getByTestId('tooltip-trigger'));

    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toHaveTextContent('Native hint');
    });
  });

  it('closes on second press (toggle)', async () => {
    const { getByTestId, queryByTestId } = renderTooltip();

    fireEvent.press(getByTestId('tooltip-trigger'));
    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toBeTruthy();
    });

    fireEvent.press(getByTestId('tooltip-trigger'));
    await waitFor(() => {
      expect(queryByTestId('tooltip-content')).toBeNull();
    });
  });

  it('closes when backdrop is pressed', async () => {
    const { getByTestId, queryByTestId } = renderTooltip();

    fireEvent.press(getByTestId('tooltip-trigger'));
    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toBeTruthy();
    });

    fireEvent.press(getByTestId('tooltip-backdrop'));
    await waitFor(() => {
      expect(queryByTestId('tooltip-content')).toBeNull();
    });
  });

  it('closes on Modal onRequestClose (Android back)', async () => {
    const { getByTestId, queryByTestId, UNSAFE_getAllByType } = renderTooltip();

    fireEvent.press(getByTestId('tooltip-trigger'));
    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toBeTruthy();
    });

    const modal = UNSAFE_getAllByType(Modal)[0];
    await act(async () => {
      modal.props.onRequestClose?.();
    });

    await waitFor(() => {
      expect(queryByTestId('tooltip-content')).toBeNull();
    });
  });

  it('sets accessibilityHint to content', () => {
    const { getByTestId } = renderTooltip({ content: 'Hint A' });
    expect(getByTestId('tooltip-trigger').props.accessibilityHint).toBe(
      'Hint A'
    );
  });

  it('renders bold title above body when title is set', async () => {
    const { getByTestId } = renderTooltip({
      title: 'Played',
      content: 'Spring: Played Intermediate 3/16',
    });

    fireEvent.press(getByTestId('tooltip-trigger'));

    await waitFor(() => {
      expect(getByTestId('tooltip-title')).toHaveTextContent('Played');
      expect(getByTestId('tooltip-body')).toHaveTextContent(
        'Spring: Played Intermediate 3/16'
      );
    });

    expect(getByTestId('tooltip-title').props.style).toEqual(
      expect.objectContaining({ fontWeight: '700', textAlign: 'left' })
    );
    expect(getByTestId('tooltip-body').props.style).toEqual(
      expect.objectContaining({ textAlign: 'left' })
    );
  });

  it('omits title node when title is absent', async () => {
    const { getByTestId, queryByTestId } = renderTooltip();

    fireEvent.press(getByTestId('tooltip-trigger'));

    await waitFor(() => {
      expect(getByTestId('tooltip-body')).toHaveTextContent('Native hint');
    });
    expect(queryByTestId('tooltip-title')).toBeNull();
  });

  it('preserves newlines in the body', async () => {
    const { getByTestId } = renderTooltip({
      content: 'Line one\nLine two',
    });

    fireEvent.press(getByTestId('tooltip-trigger'));

    await waitFor(() => {
      expect(getByTestId('tooltip-body')).toHaveTextContent('Line one\nLine two');
    });
  });

  it('sets accessibilityHint to title and content when title is set', () => {
    const { getByTestId } = renderTooltip({
      title: 'Banned',
      content: 'Hint A',
    });
    expect(getByTestId('tooltip-trigger').props.accessibilityHint).toBe(
      'Banned\nHint A'
    );
  });

  it('does not open when disabled', () => {
    const { getByTestId, queryByTestId } = renderTooltip({ disabled: true });
    fireEvent.press(getByTestId('tooltip-trigger'));
    expect(queryByTestId('tooltip-content')).toBeNull();
  });

  it('does not open when content is empty and leaves hint unset', () => {
    const { getByTestId, queryByTestId } = renderTooltip({ content: '' });
    expect(getByTestId('tooltip-trigger').props.accessibilityHint).toBeUndefined();
    fireEvent.press(getByTestId('tooltip-trigger'));
    expect(queryByTestId('tooltip-content')).toBeNull();
  });

  it('applies Floating UI positioning styles on the tip', async () => {
    const { getByTestId } = renderTooltip();

    fireEvent.press(getByTestId('tooltip-trigger'));
    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toBeTruthy();
    });

    const style = getByTestId('tooltip-content').props.style;
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style ?? {};
    expect(flat.position).toBe('absolute');
    expect(typeof flat.top === 'number' || flat.top != null).toBe(true);
    expect(typeof flat.left === 'number' || flat.left != null).toBe(true);
  });

  it('sets pointerEvents none on the tip', async () => {
    const { getByTestId } = renderTooltip();

    fireEvent.press(getByTestId('tooltip-trigger'));
    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toBeTruthy();
    });

    expect(getByTestId('tooltip-content').props.pointerEvents).toBe('none');
  });

  it('never calls Alert.alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderTooltip();

    fireEvent.press(getByTestId('tooltip-trigger'));
    await waitFor(() => {
      expect(getByTestId('tooltip-content')).toBeTruthy();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
