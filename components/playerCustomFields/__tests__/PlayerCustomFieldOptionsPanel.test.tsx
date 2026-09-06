/**
 * @jest-environment jsdom
 */
import PlayerCustomFieldOptionsPanel from '@/components/playerCustomFields/PlayerCustomFieldOptionsPanel';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetOptions = jest.fn();
const mockCreateOption = jest.fn();
const mockUpdateOption = jest.fn();
const mockDeleteOption = jest.fn();

jest.mock('@/services/api/playerCustomFieldsApi', () => ({
  PlayerCustomFieldsApiService: jest.fn().mockImplementation(() => ({
    getOptions: (...args: unknown[]) => mockGetOptions(...args),
    createOption: (...args: unknown[]) => mockCreateOption(...args),
    updateOption: (...args: unknown[]) => mockUpdateOption(...args),
    deleteOption: (...args: unknown[]) => mockDeleteOption(...args),
  })),
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
  }),
}));

describe('PlayerCustomFieldOptionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).confirm = jest.fn(() => true);
    mockGetOptions.mockResolvedValue({
      data: [
        {
          id_player_custom_field_option: 1,
          player_custom_field_id: 5,
          code: 'yes',
          label: 'Yes',
          sort_order: 0,
          is_active: true,
          inserted_at: 1,
        },
      ],
    });
    mockCreateOption.mockResolvedValue({ data: {} });
    mockUpdateOption.mockResolvedValue({ data: {} });
    mockDeleteOption.mockResolvedValue(undefined);
  });

  it('loads and lists options', async () => {
    const { getByTestId, getByText } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    await waitFor(() =>
      expect(getByTestId('custom-field-option-1')).toBeTruthy()
    );
    expect(mockGetOptions).toHaveBeenCalledWith(5);
    expect(getByText('Yes')).toBeTruthy();
  });

  it('creates a new option', async () => {
    const { getByTestId, findByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    await waitFor(() =>
      expect(getByTestId('custom-field-option-add')).toBeTruthy()
    );

    fireEvent.changeText(getByTestId('custom-field-option-new-label'), 'Maybe');
    fireEvent.press(getByTestId('custom-field-option-add'));

    await waitFor(() =>
      expect(mockCreateOption).toHaveBeenCalledWith(5, { label: 'Maybe' })
    );
    expect(await findByTestId('custom-field-option-add-success')).toBeTruthy();
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Option added',
      'Custom field option created'
    );
  });

  it('keeps Add disabled with a reason until a label is typed', async () => {
    const { getByTestId, findByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    const add = await findByTestId('custom-field-option-add');
    expect(add.props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('custom-field-option-add-info')).toBeTruthy();

    fireEvent.changeText(getByTestId('custom-field-option-new-label'), 'Maybe');
    expect(
      getByTestId('custom-field-option-add').props.accessibilityState?.disabled
    ).toBe(false);
  });

  it('reports an add failure on the button and keeps the toast', async () => {
    mockCreateOption.mockRejectedValueOnce(new Error('Duplicate label'));
    const { getByTestId, findByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    await waitFor(() =>
      expect(getByTestId('custom-field-option-add')).toBeTruthy()
    );
    fireEvent.changeText(getByTestId('custom-field-option-new-label'), 'Maybe');
    await act(async () => {
      fireEvent.press(getByTestId('custom-field-option-add'));
    });

    expect(await findByTestId('custom-field-option-add-error')).toBeTruthy();
    expect(mockShowError).toHaveBeenCalledWith('Add failed', 'Duplicate label');
  });

  it('saves an edited label on the row button only', async () => {
    const { getByTestId, findByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    fireEvent.press(await findByTestId('custom-field-option-edit-btn-1'));
    fireEvent.changeText(getByTestId('custom-field-option-edit-1'), 'Yes!');
    fireEvent.press(getByTestId('custom-field-option-save-1'));

    await waitFor(() =>
      expect(mockUpdateOption).toHaveBeenCalledWith(5, 1, {
        label: 'Yes!',
        sort_order: 0,
        is_active: true,
      })
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Updated', 'Option label saved');
  });

  it('confirms before deleting an option', async () => {
    const { findByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    fireEvent.press(await findByTestId('custom-field-option-delete-1'));

    await waitFor(() => expect(mockDeleteOption).toHaveBeenCalledWith(5, 1));
    expect((window as any).confirm).toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Deleted', 'Option removed');
  });

  it('skips the delete request when the confirm is cancelled', async () => {
    (window as any).confirm = jest.fn(() => false);
    const { findByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    fireEvent.press(await findByTestId('custom-field-option-delete-1'));

    expect(mockDeleteOption).not.toHaveBeenCalled();
  });

  it('reports a delete failure on the row button and keeps the toast', async () => {
    mockDeleteOption.mockRejectedValueOnce(new Error('In use'));
    const { findByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    const del = await findByTestId('custom-field-option-delete-1');
    await act(async () => {
      fireEvent.press(del);
    });

    expect(await findByTestId('custom-field-option-delete-1-error')).toBeTruthy();
    expect(mockShowError).toHaveBeenCalledWith('Delete failed', 'In use');
  });

  it('drives Add / Save / Delete through ActionButton with auditory feedback', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'PlayerCustomFieldOptionsPanel.tsx'),
      'utf8'
    );
    expect(src).toContain(
      "import ActionButton from '@/components/ui/ActionButton'"
    );
    expect(src).toContain(
      "import { confirmAction } from '@/utils/confirmAction'"
    );
    expect(src).toContain(
      'const addStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
    expect(src.match(/auditoryFeedback: true/g)).toHaveLength(3);
    expect(src).toContain('function SaveOptionButton(');
    expect(src).toContain('function DeleteOptionButton(');
    expect(src).toMatch(/confirmAction\([\s\S]*?void run\(\(\) => onDelete/);
    expect(src).toContain('showSuccess(');
    expect(src).toContain('showError(');
  });

  it('toggles option active state', async () => {
    const { getByTestId } = render(
      <PlayerCustomFieldOptionsPanel fieldId={5} />
    );

    await waitFor(() =>
      expect(getByTestId('custom-field-option-active-1')).toBeTruthy()
    );

    fireEvent(getByTestId('custom-field-option-active-1'), 'valueChange', false);

    await waitFor(() =>
      expect(mockUpdateOption).toHaveBeenCalledWith(5, 1, {
        label: 'Yes',
        sort_order: 0,
        is_active: false,
      })
    );
  });
});
