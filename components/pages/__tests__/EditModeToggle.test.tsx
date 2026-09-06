import EditModeToggle from '@/components/pages/EditModeToggle';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/utils/isWebPlatform', () => ({
  isWebPlatform: () => false,
}));

const mockPlaySuccess = jest.fn(async () => undefined);
const mockPlayError = jest.fn(async () => undefined);

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: (...args: unknown[]) => mockPlaySuccess(...args),
  playError: (...args: unknown[]) => mockPlayError(...args),
}));

describe('EditModeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Edit when not editing', () => {
    const onEdit = jest.fn();
    const { getByTestId } = render(
      <EditModeToggle
        isEditing={false}
        onEdit={onEdit}
        onSave={async () => undefined}
        onCancel={() => undefined}
      />
    );
    fireEvent.press(getByTestId('edit-mode-edit'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('Save runs status loop: pending then success then idle after hold', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => {
      release = r;
    });
    const onSave = jest.fn(async () => gate);

    const { getByTestId, queryByTestId } = render(
      <EditModeToggle
        isEditing
        onEdit={() => undefined}
        onSave={onSave}
        onCancel={() => undefined}
      />
    );

    fireEvent.press(getByTestId('edit-mode-save'));
    await waitFor(() => {
      expect(getByTestId('edit-mode-save-pending')).toBeTruthy();
    });

    // Schedule hold with fake timers so we can advance the 4s window.
    jest.useFakeTimers();
    try {
      await act(async () => {
        release();
      });
      await waitFor(() => {
        expect(getByTestId('edit-mode-save-success')).toBeTruthy();
      });
      expect(onSave).toHaveBeenCalled();
      expect(mockPlaySuccess).toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
      expect(queryByTestId('edit-mode-save-success')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('Save shows error when onSave throws', async () => {
    const onSave = jest.fn(async () => {
      throw new Error('Nope');
    });

    const { getByTestId } = render(
      <EditModeToggle
        isEditing
        onEdit={() => undefined}
        onSave={onSave}
        onCancel={() => undefined}
      />
    );

    fireEvent.press(getByTestId('edit-mode-save'));
    await waitFor(() => {
      expect(getByTestId('edit-mode-save-error')).toBeTruthy();
    });
    expect(getByTestId('edit-mode-save-tooltip').props.accessibilityHint).toBe(
      'Nope'
    );
    expect(mockPlayError).toHaveBeenCalled();
  });

  it('Cancel is idle ActionButton', () => {
    const onCancel = jest.fn();
    const { getByTestId, getByText } = render(
      <EditModeToggle
        isEditing
        onEdit={() => undefined}
        onSave={async () => undefined}
        onCancel={onCancel}
      />
    );
    expect(getByText('Cancel')).toBeTruthy();
    fireEvent.press(getByTestId('edit-mode-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('showSave false hides Save', () => {
    const { queryByTestId } = render(
      <EditModeToggle
        isEditing
        showSave={false}
        onEdit={() => undefined}
        onSave={async () => undefined}
        onCancel={() => undefined}
      />
    );
    expect(queryByTestId('edit-mode-save')).toBeNull();
  });
});
