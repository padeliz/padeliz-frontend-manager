/**
 * @jest-environment jsdom
 */
import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import EditionRegistrationImportPanel from '@/components/editions/EditionRegistrationImportPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

const mockPreview = jest.fn();
const mockSave = jest.fn();

jest.mock('@/services/api/editionRegistrationImportApi', () => ({
  EditionRegistrationImportApiService: jest.fn().mockImplementation(() => ({
    preview: (...args: unknown[]) => mockPreview(...args),
    save: (...args: unknown[]) => mockSave(...args),
  })),
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

jest.mock('@/components/players/CsvFilePicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      onFile,
      disabled,
    }: {
      onFile: (file: File) => void;
      disabled?: boolean;
    }) => (
      <Pressable
        testID="csv-file-picker-button"
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          onFile({ name: 'regs.csv' } as File);
        }}
      >
        <Text>Choose CSV</Text>
      </Pressable>
    ),
  };
});

const previewRows = [
  {
    index: 0,
    first_name: 'Unmapped',
    middle_name: null,
    last_name: 'Row',
    email: 'u@example.test',
    phone: '+40700',
    already_registered: false,
    mapping: {
      status: 'unmapped',
      matched_by: null,
      player: null,
      candidates: [],
      name_matches: [],
    },
  },
  {
    index: 1,
    first_name: 'Mara',
    middle_name: null,
    last_name: 'Popescu',
    email: 'mara@example.test',
    phone: '+40701',
    already_registered: false,
    mapping: {
      status: 'mapped',
      matched_by: 'email',
      player: {
        id_player: 12,
        name: 'Mara Popescu',
        pdf_avatar_url: null,
        profile_image_url: 'https://cdn.example/mara.png',
      },
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
    already_registered: false,
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
    first_name: 'Already',
    middle_name: null,
    last_name: 'In',
    email: 'a@example.test',
    phone: '+40703',
    already_registered: true,
    mapping: {
      status: 'mapped',
      matched_by: 'email',
      player: {
        id_player: 99,
        name: 'Already In',
        pdf_avatar_url: null,
        profile_image_url: null,
      },
      candidates: [],
      name_matches: [],
    },
  },
];

function ChromeSave() {
  const { actions } = usePageChrome();
  return (
    <View>
      <Pressable testID="chrome-save" onPress={() => void actions?.save?.()} />
      <Pressable
        testID="chrome-refresh"
        onPress={() => void actions?.refresh?.()}
      />
      <Text testID="chrome-can-save">{actions?.canSave ? 'yes' : 'no'}</Text>
      <Text testID="chrome-is-dirty">{actions?.isDirty ? 'yes' : 'no'}</Text>
    </View>
  );
}

function renderPanel(finalized = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <ChromeSave />
        <EditionRegistrationImportPanel
          editionId={7}
          finalized={finalized}
        />
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

async function loadPreview(finalized = false) {
  mockPreview.mockResolvedValue({
    data: { format: 'playtomic', rows: previewRows },
    message: 'Preview generated',
  });
  const screen = renderPanel(finalized);
  if (!finalized) {
    fireEvent.press(screen.getByTestId('csv-file-picker-button'));
    await waitFor(() => {
      expect(screen.getByTestId('import-row-1')).toBeTruthy();
    });
  }
  return screen;
}

describe('EditionRegistrationImportPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  it('shows already-registered flag, profile image before name, and no remap dropdown', async () => {
    const screen = await loadPreview();
    expect(screen.getByTestId('import-already-registered-3')).toBeTruthy();
    expect(screen.queryByTestId('import-player-remap-0')).toBeNull();
    expect(screen.getByTestId('import-player-label-1')).toHaveTextContent(
      'Mara Popescu'
    );
    expect(screen.getByTestId('import-player-image-1')).toBeTruthy();
    expect(screen.queryByTestId('import-player-image-3')).toBeNull();
  });

  it('enables save after preview when eligible rows are included', async () => {
    const screen = await loadPreview();
    await waitFor(() => {
      expect(screen.getByTestId('chrome-can-save')).toHaveTextContent('yes');
      expect(screen.getByTestId('chrome-is-dirty')).toHaveTextContent('yes');
    });
  });

  it('submit excludes unmapped, conflict, and already_registered rows', async () => {
    const screen = await loadPreview();
    mockSave.mockResolvedValue({
      data: {
        registered: 1,
        skipped_already_registered: 0,
        skipped_unmapped: 0,
        skipped_conflict: 0,
        rows: [
          {
            index: 1,
            player_id: 12,
            action: 'registered',
            registration_id: 50,
          },
        ],
      },
      message: 'ok',
    });
    fireEvent.press(screen.getByTestId('chrome-save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    const [editionId, body] = mockSave.mock.calls[0];
    expect(editionId).toBe(7);
    expect(body.format).toBe('playtomic');
    expect(body.rows.map((r: any) => r.index)).toEqual([1]);
    expect(body.rows[0]).toMatchObject({
      player_id: 12,
      status: 'mapped',
    });
  });

  it('finalized disables preview and save', async () => {
    const screen = await loadPreview(true);
    expect(screen.getByTestId('registrations-finalized-hint')).toBeTruthy();
    fireEvent.press(screen.getByTestId('csv-file-picker-button'));
    expect(mockPreview).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('chrome-can-save')).toHaveTextContent('no');
    });
    fireEvent.press(screen.getByTestId('chrome-save'));
    expect(mockSave).not.toHaveBeenCalled();
  });
});
