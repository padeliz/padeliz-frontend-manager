import ActionButton from '@/components/ui/ActionButton';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/utils/isWebPlatform', () => ({
  isWebPlatform: () => false,
}));

describe('ActionButton', () => {
  it('renders startIcon, label, and endIcon slots', () => {
    const { getByText, getByTestId } = render(
      <ActionButton
        label="Save"
        startIcon="save-outline"
        endIcon="arrow-forward"
        onPress={() => undefined}
        testID="btn"
      />
    );
    expect(getByText('Save')).toBeTruthy();
    expect(getByTestId('btn').props.className).toMatch(/rounded-lg/);
  });

  it('omits missing slots', () => {
    const { getByText, queryByText } = render(
      <ActionButton label="Only" onPress={() => undefined} />
    );
    expect(getByText('Only')).toBeTruthy();
    expect(queryByText('Saving…')).toBeNull();
  });

  it('iconOnly has no label, requires accessibilityLabel, default p-1', () => {
    const { getByTestId, queryByText } = render(
      <ActionButton
        iconOnly
        startIcon="arrow-undo-outline"
        accessibilityLabel="Undo"
        onPress={() => undefined}
        testID="undo"
      />
    );
    expect(getByTestId('undo').props.accessibilityLabel).toBe('Undo');
    expect(getByTestId('undo').props.className).toBe('p-1');
    expect(queryByText('Undo')).toBeNull();
  });

  it('pending shows ActivityIndicator and locks press', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ActionButton
        label="Save"
        status="pending"
        onPress={onPress}
        testID="save"
      />
    );
    expect(getByTestId('save-pending')).toBeTruthy();
    expect(getByTestId('save').props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    fireEvent.press(getByTestId('save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('pendingAppearance spinIcon rotates startIcon without ActivityIndicator', () => {
    const onPress = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <ActionButton
        label="Refresh"
        startIcon="refresh"
        status="pending"
        pendingAppearance="spinIcon"
        onPress={onPress}
        testID="refresh"
      />
    );
    expect(getByTestId('refresh-pending-spin')).toBeTruthy();
    expect(getByTestId('refresh-pending-spin-icon')).toBeTruthy();
    expect(queryByTestId('refresh-pending')).toBeNull();
    fireEvent.press(getByTestId('refresh'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('CheckingIcon uses Platform-aware useNativeDriver', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../ActionButton.tsx'),
      'utf8'
    );
    expect(src).toContain("useNativeDriver: Platform.OS !== 'web'");
    expect(src).toMatch(/positive:\s*\{\s*box:\s*'bg-green-600/);
    expect(src).toMatch(/success:\s*\{\s*box:\s*'bg-green-100/);
  });

  it('positive variant uses solid green-600', () => {
    const { getByTestId } = render(
      <ActionButton
        label="Generate"
        variant="positive"
        onPress={() => undefined}
        testID="gen"
      />
    );
    expect(getByTestId('gen').props.className).toMatch(/bg-green-600/);
  });

  it('soft success variant unchanged', () => {
    const { getByTestId } = render(
      <ActionButton
        label="Export"
        variant="success"
        onPress={() => undefined}
        testID="export"
      />
    );
    expect(getByTestId('export').props.className).toMatch(/bg-green-100/);
  });

  it('spinIcon without idle icon falls back to ActivityIndicator', () => {
    const { getByTestId, queryByTestId } = render(
      <ActionButton
        label="Save"
        status="pending"
        pendingAppearance="spinIcon"
        onPress={() => undefined}
        testID="save"
      />
    );
    expect(getByTestId('save-pending')).toBeTruthy();
    expect(queryByTestId('save-pending-spin')).toBeNull();
  });

  it('checking shows checking icon and locks press', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ActionButton
        label="Map"
        status="checking"
        onPress={onPress}
        testID="map"
      />
    );
    expect(getByTestId('map-checking')).toBeTruthy();
    fireEvent.press(getByTestId('map'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('success and error show status icons', () => {
    const { getByTestId, rerender } = render(
      <ActionButton
        label="Save"
        status="success"
        onPress={() => undefined}
        testID="save"
      />
    );
    expect(getByTestId('save-success')).toBeTruthy();

    rerender(
      <ActionButton
        label="Save"
        status="error"
        errorMessage="Failed"
        onPress={() => undefined}
        testID="save"
      />
    );
    expect(getByTestId('save-error')).toBeTruthy();
  });

  it('does not swap label to Saving… while pending', () => {
    const { getByText, queryByText } = render(
      <ActionButton
        label="Save"
        status="pending"
        onPress={() => undefined}
      />
    );
    expect(getByText('Save')).toBeTruthy();
    expect(queryByText('Saving…')).toBeNull();
  });

  it('disabled idle with disabledReason shows info icon', () => {
    const { getByTestId, queryByTestId } = render(
      <ActionButton
        label="Map"
        disabled
        disabledReason="No divisions"
        onPress={() => undefined}
        testID="map"
      />
    );
    expect(getByTestId('map-info')).toBeTruthy();

    const { queryByTestId: q } = render(
      <ActionButton
        label="Map"
        disabled
        status="pending"
        disabledReason="No divisions"
        onPress={() => undefined}
        testID="map2"
      />
    );
    expect(q('map2-info')).toBeNull();
  });

  it('tooltip precedence: errorMessage over disabledReason', () => {
    const { getByTestId } = render(
      <ActionButton
        label="Save"
        status="error"
        errorMessage="Boom"
        disabled
        disabledReason="Why disabled"
        onPress={() => undefined}
        testID="save"
      />
    );
    // Native tooltip wraps with accessibilityHint
    expect(getByTestId('save-tooltip').props.accessibilityHint).toBe('Boom');
  });

  it('blockPressOnError blocks press; default allows re-press on error', () => {
    const onPress = jest.fn();
    const { getByTestId, rerender } = render(
      <ActionButton
        label="Save"
        status="error"
        onPress={onPress}
        testID="save"
      />
    );
    fireEvent.press(getByTestId('save'));
    expect(onPress).toHaveBeenCalledTimes(1);

    onPress.mockClear();
    rerender(
      <ActionButton
        label="Save"
        status="error"
        blockPressOnError
        onPress={onPress}
        testID="save"
      />
    );
    expect(getByTestId('save').props.accessibilityState.disabled).toBe(true);
    expect(getByTestId('save').props.onPress).toBeUndefined();
    fireEvent.press(getByTestId('save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('statusRecolor false keeps variant classes; true applies recolor', () => {
    const { getByTestId, rerender } = render(
      <ActionButton
        label="Save"
        variant="primary"
        status="success"
        onPress={() => undefined}
        testID="save"
      />
    );
    expect(getByTestId('save').props.className).toMatch(/bg-blue-600/);

    rerender(
      <ActionButton
        label="Save"
        variant="primary"
        status="success"
        statusRecolor
        onPress={() => undefined}
        testID="save"
      />
    );
    expect(getByTestId('save').props.className).toMatch(/bg-green-100/);
  });

  it('disabledStyle mute vs opacity for iconOnly', () => {
    const { getByTestId, rerender } = render(
      <ActionButton
        iconOnly
        startIcon="trash"
        accessibilityLabel="Remove"
        disabled
        disabledStyle="mute"
        onPress={() => undefined}
        testID="icon"
      />
    );
    expect(getByTestId('icon').props.style).toBeUndefined();

    rerender(
      <ActionButton
        iconOnly
        startIcon="trash"
        accessibilityLabel="Remove"
        disabled
        disabledStyle="opacity"
        onPress={() => undefined}
        testID="icon"
      />
    );
    expect(getByTestId('icon').props.style).toMatchObject({ opacity: 0.4 });
  });

  it('size sm uses text-sm; md uses text-base', () => {
    const { getByText, rerender } = render(
      <ActionButton label="Go" size="sm" onPress={() => undefined} />
    );
    expect(getByText('Go').props.className).toMatch(/text-sm/);

    rerender(
      <ActionButton label="Go" size="md" onPress={() => undefined} />
    );
    expect(getByText('Go').props.className).toMatch(/text-base/);
  });

  it('calls onPress when idle', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ActionButton label="Go" onPress={onPress} testID="go" />
    );
    fireEvent.press(getByTestId('go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('statusSlot end places pending indicator at end', () => {
    const { getByTestId, getByText } = render(
      <ActionButton
        label="Save"
        startIcon="save-outline"
        status="pending"
        statusSlot="end"
        onPress={() => undefined}
        testID="save"
      />
    );
    expect(getByText('Save')).toBeTruthy();
    expect(getByTestId('save-pending')).toBeTruthy();
  });
});
