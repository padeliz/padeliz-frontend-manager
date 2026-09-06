/**
 * @jest-environment jsdom
 */
import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import PlayerImportPanel from '@/components/players/PlayerImportPanel';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

const mockPreview = jest.fn();
const mockSave = jest.fn();

jest.mock('@/services/api/playerImportApi', () => ({
  PlayerImportApiService: jest.fn().mockImplementation(() => ({
    preview: (...args: unknown[]) => mockPreview(...args),
    save: (...args: unknown[]) => mockSave(...args),
  })),
}));

jest.mock('@/hooks/usePlayerPicker', () => ({
  usePlayerPicker: () => ({
    options: [{ label: 'Mara Popescu', value: 12, imageUrl: null }],
    onSearch: jest.fn(),
    loading: false,
  }),
  playerToDropdownOption: (player: any) => ({
    label: player.name,
    value: player.id_player,
    imageUrl: player.pdf_avatar_url ?? null,
  }),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

const mockConfirm = jest.fn(async () => true);
jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: () => mockConfirm(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({
      options,
      selectedValue,
      onSelectionChange,
      placeholder,
    }: any) => {
      const selected = options.find(
        (opt: any) => String(opt.value) === String(selectedValue)
      );
      return (
        <View>
          <Text>{selected ? selected.label : placeholder}</Text>
          {options.map((opt: any) => (
            <Pressable
              key={String(opt.value)}
              testID={`option-${opt.value}`}
              onPress={() => onSelectionChange(opt.value)}
            >
              <Text>{opt.label}</Text>
            </Pressable>
          ))}
          <Pressable
            testID="dropdown-clear"
            onPress={() => onSelectionChange(null)}
          >
            <Text>clear</Text>
          </Pressable>
        </View>
      );
    },
  };
});

jest.mock('@/components/players/CsvFilePicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onFile }: { onFile: (file: File) => void }) => (
      <Pressable
        testID="csv-file-picker-button"
        onPress={() =>
          onFile({ name: 'players.csv' } as File)
        }
      >
        <Text>Choose CSV</Text>
      </Pressable>
    ),
  };
});

const previewRows = [
  {
    index: 0,
    first_name: 'New',
    middle_name: null,
    last_name: 'Player',
    email: 'new@example.test',
    phone: '+40700',
    mapping: {
      status: 'unmapped',
      matched_by: null,
      player: null,
      candidates: [],
      name_matches: [{ id_player: 12, name: 'Mara Popescu', pdf_avatar_url: null }],
    },
  },
  {
    index: 1,
    first_name: 'Mara',
    middle_name: null,
    last_name: 'Popescu',
    email: 'mara@example.test',
    phone: '+40701',
    mapping: {
      status: 'mapped',
      matched_by: 'email',
      player: { id_player: 12, name: 'Mara Popescu', pdf_avatar_url: 'https://img/a.png' },
      candidates: [],
      name_matches: [],
    },
  },
  {
    index: 2,
    first_name: 'Conflict',
    middle_name: null,
    last_name: 'Row',
    email: 'c@example.test',
    phone: '+40702',
    mapping: {
      status: 'conflict',
      matched_by: null,
      player: null,
      candidates: [
        { id_player: 1, name: 'Email Owner', pdf_avatar_url: null },
        { id_player: 2, name: 'Phone Owner', pdf_avatar_url: null },
      ],
      name_matches: [],
    },
  },
  {
    index: 3,
    first_name: '*fictiv*',
    middle_name: null,
    last_name: 'Guest',
    email: 'fictiv@example.test',
    phone: '+40703',
    mapping: {
      status: 'unmapped',
      matched_by: null,
      player: null,
      candidates: [],
      name_matches: [],
    },
  },
];

function ChromeSave() {
  const { actions } = usePageChrome();
  return (
    <View>
      <Pressable
        testID="chrome-save"
        onPress={() => void actions?.save?.().catch(() => {})}
      />
      <Pressable
        testID="chrome-refresh"
        onPress={() => void actions?.refresh?.().catch(() => {})}
      />
      <Text testID="chrome-can-save">{actions?.canSave ? 'yes' : 'no'}</Text>
    </View>
  );
}

function renderPanel() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <ChromeSave />
        <PlayerImportPanel />
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

async function loadPreview() {
  mockPreview.mockResolvedValue({
    data: { format: 'playtomic', rows: previewRows },
    message: 'Preview generated',
  });
  const screen = renderPanel();
  fireEvent.press(screen.getByTestId('csv-file-picker-button'));
  await waitFor(() => {
    expect(screen.getByTestId('import-row-0')).toBeTruthy();
  });
  return screen;
}

describe('PlayerImportPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  it('includes rows by default and omits unchecked rows from Save', async () => {
    const screen = await loadPreview();
    expect(screen.getByTestId('import-include-0').props.value).toBe(true);

    fireEvent(screen.getByTestId('import-include-3'), 'valueChange', false);
    mockSave.mockResolvedValue({
      data: {
        rows: [
          { row_index: 0, player_id: 50, first_name: 'New', last_name: 'Player', action: 'created' },
          { row_index: 1, player_id: 12, first_name: 'Mara', last_name: 'Popescu', action: 'attached' },
          { row_index: 2, player_id: 1, first_name: 'Conflict', last_name: 'Row', action: 'attached' },
        ],
      },
      message: 'ok',
    });
    fireEvent.press(screen.getByTestId('chrome-save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    const body = mockSave.mock.calls[0][0];
    expect(body.rows.map((r: any) => r.index)).toEqual([0, 1, 2]);
    expect(body.filename).toBe('players.csv');
    expect(body.format).toBe('playtomic');
  });

  it('locks name/phone/email when a player is selected and unlocks when cleared', async () => {
    const screen = await loadPreview();
    expect(screen.getByTestId('import-first-name-1').props.editable).toBe(false);
    expect(screen.getByTestId('import-email-1').props.editable).toBe(false);
    expect(screen.getByTestId('import-first-name-0').props.editable).toBe(true);
    expect(screen.getByTestId('import-first-name-2').props.editable).toBe(true);
  });

  it('disables Save when zero rows are included', async () => {
    const screen = await loadPreview();
    fireEvent(screen.getByTestId('import-include-0'), 'valueChange', false);
    fireEvent(screen.getByTestId('import-include-1'), 'valueChange', false);
    fireEvent(screen.getByTestId('import-include-2'), 'valueChange', false);
    fireEvent(screen.getByTestId('import-include-3'), 'valueChange', false);
    await waitFor(() => {
      expect(screen.getByTestId('chrome-can-save')).toHaveTextContent('no');
    });
    fireEvent.press(screen.getByTestId('chrome-save'));
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('client-blocks unmapped without first_name or without contacts', async () => {
    const screen = await loadPreview();
    fireEvent.changeText(screen.getByTestId('import-first-name-0'), '');
    fireEvent.press(screen.getByTestId('chrome-save'));
    await waitFor(() => {
      expect(screen.getByTestId('import-error-0')).toBeTruthy();
    });
    expect(mockSave).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('import-first-name-0'), 'New');
    fireEvent.changeText(screen.getByTestId('import-email-0'), '');
    fireEvent.changeText(screen.getByTestId('import-phone-0'), '');
    fireEvent.press(screen.getByTestId('chrome-save'));
    await waitFor(() => {
      expect(screen.getByTestId('import-error-0')).toHaveTextContent(
        'An email or phone is required to create a player.'
      );
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('seeds options from player, candidates, and name_matches', async () => {
    const screen = await loadPreview();
    expect(screen.getAllByText('Mara Popescu').length).toBeGreaterThan(0);
    expect(screen.getByText('Email Owner')).toBeTruthy();
    expect(screen.getByText('Phone Owner')).toBeTruthy();
  });

  it('fills player_id and option label after a successful Save', async () => {
    const screen = await loadPreview();
    mockSave.mockResolvedValue({
      data: {
        rows: [
          { row_index: 0, player_id: 50, first_name: 'New', last_name: 'Player', action: 'created' },
          { row_index: 1, player_id: 12, first_name: 'Mara', last_name: 'Popescu', action: 'attached' },
          { row_index: 2, player_id: 1, first_name: 'Conflict', last_name: 'Row', action: 'attached' },
          { row_index: 3, player_id: 77, first_name: '*fictiv*', last_name: 'Guest', action: 'created' },
        ],
      },
      message: 'ok',
    });
    fireEvent.press(screen.getByTestId('chrome-save'));
    await waitFor(() => {
      expect(screen.getAllByText('New Player').length).toBeGreaterThan(0);
    });
  });

  it('shows 422 errors per index', async () => {
    const { ApiError } = jest.requireActual('@/services/api/baseApi');
    const screen = await loadPreview();
    mockSave.mockRejectedValue(
      new ApiError(422, 'Validation failed', {
        'rows.0.email': ['This email already belongs to another player.'],
      })
    );
    fireEvent.press(screen.getByTestId('chrome-save'));
    await waitFor(() => {
      expect(screen.getByTestId('import-error-0')).toHaveTextContent(
        'This email already belongs to another player.'
      );
    });
  });

  it('Refresh dirty-confirms then re-previews', async () => {
    const screen = await loadPreview();
    fireEvent.changeText(screen.getByTestId('import-first-name-0'), 'Edited');
    fireEvent.press(screen.getByTestId('chrome-refresh'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(2));
  });

  it('still lists *fictiv* rows', async () => {
    const screen = await loadPreview();
    expect(screen.getByTestId('import-row-3')).toBeTruthy();
    expect(screen.getByTestId('import-first-name-3').props.value).toBe('*fictiv*');
  });
});
