/**
 * @jest-environment jsdom
 */
import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import PlayerProfileImageImportPanel from '@/components/players/PlayerProfileImageImportPanel';
import {
    createTestQueryClient,
    disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

const mockPreview = jest.fn();
const mockSave = jest.fn();
const mockGetPlayer = jest.fn();

jest.mock('@/services/api/playerProfileImageImportApi', () => ({
  PlayerProfileImageImportApiService: jest.fn().mockImplementation(() => ({
    preview: (...args: unknown[]) => mockPreview(...args),
    save: (...args: unknown[]) => mockSave(...args),
  })),
}));

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayer: (...args: unknown[]) => mockGetPlayer(...args),
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

jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: jest.fn(async () => true),
}));

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
      clearable,
    }: any) => {
      const selected = options.find(
        (opt: any) => String(opt.value) === String(selectedValue)
      );
      return (
        <View>
          <Text>{selected ? selected.label : placeholder}</Text>
          {clearable && selectedValue != null ? (
            <Pressable
              testID="dropdown-clear"
              onPress={() => onSelectionChange(null)}
            >
              <Text>Clear</Text>
            </Pressable>
          ) : null}
          {options.map((opt: any) => (
            <Pressable
              key={String(opt.value)}
              testID={`option-${opt.value}`}
              onPress={() => onSelectionChange(opt.value)}
            >
              <Text>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      );
    },
  };
});

jest.mock('@/components/players/ImageFilesPicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onFiles }: { onFiles: (files: Array<{ name: string; uri: string; mimeType: string; file?: File }>) => void }) => (
      <Pressable
        testID="image-files-picker-button"
        onPress={() =>
          onFiles([
            {
              name: 'mara@example.test.jpg',
              uri: 'blob:test-url',
              mimeType: 'image/jpeg',
              file: { name: 'mara@example.test.jpg' } as File,
            },
          ])
        }
      >
        <Text>Choose images</Text>
      </Pressable>
    ),
  };
});

const previewRows = [
  {
    index: 0,
    filename: 'mara@example.test.jpg',
    mapping: {
      status: 'mapped',
      matched_by: 'email',
      player: {
        id_player: 12,
        name: 'Mara Popescu',
        uploaded_profile_images: [
          { id: 1, url: 'https://example.test/1.jpg', is_pdf_primary: true },
        ],
      },
      candidates: [],
      name_matches: [],
    },
  },
];

function ChromeSaveProbe() {
  const { actions } = usePageChrome();
  return (
    <Pressable testID="probe-save" onPress={() => void actions?.save?.()}>
      <Text>save</Text>
    </Pressable>
  );
}

function renderPanel() {
  const queryClient = createTestQueryClient();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PageChromeProvider>
        <PlayerProfileImageImportPanel />
        <ChromeSaveProbe />
      </PageChromeProvider>
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

describe('PlayerProfileImageImportPanel', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    mockPreview.mockResolvedValue({
      data: { max_images_per_player: 3, rows: previewRows },
    });
    mockSave.mockResolvedValue({ message: 'ok', data: {} });
    mockGetPlayer.mockResolvedValue({
      data: {
        id_player: 12,
        name: 'Mara Popescu',
        uploaded_profile_images: [],
      },
    });
  });

  afterEach(async () => {
    activeUnmount?.();
    activeUnmount = null;
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  function mountPanel() {
    const mounted = renderPanel();
    activeClient = mounted.queryClient;
    activeUnmount = mounted.unmount;
    return mounted;
  }

  it('previews files and renders row layout', async () => {
    const { getByTestId } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() => expect(mockPreview).toHaveBeenCalled());
    expect(getByTestId('profile-image-import-row-0')).toBeTruthy();
    expect(getByTestId('profile-image-filename-0')).toBeTruthy();
    expect(getByTestId('profile-image-pdf-checkbox-0')).toBeTruthy();
    expect(getByTestId('profile-image-pdf-separator-0')).toBeTruthy();
    expect(getByTestId('profile-image-existing-0')).toBeTruthy();
  });

  it('hides the PDF separator when no PDF control is shown', async () => {
    mockPreview.mockResolvedValueOnce({
      data: {
        max_images_per_player: 3,
        rows: [
          {
            index: 0,
            filename: 'unknown.jpg',
            mapping: {
              status: 'unmapped',
              matched_by: null,
              player: null,
              candidates: [],
              name_matches: [],
            },
          },
        ],
      },
    });

    const { getByTestId, queryByTestId } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() =>
      expect(getByTestId('profile-image-import-row-0')).toBeTruthy()
    );
    expect(queryByTestId('profile-image-pdf-separator-0')).toBeNull();
    expect(queryByTestId('profile-image-pdf-checkbox-0')).toBeNull();
  });

  it('locks PDF checkbox when player has zero existing images', async () => {
    mockPreview.mockResolvedValueOnce({
      data: {
        max_images_per_player: 3,
        rows: [
          {
            ...previewRows[0],
            mapping: {
              ...previewRows[0].mapping,
              player: {
                id_player: 12,
                name: 'Mara Popescu',
                uploaded_profile_images: [],
              },
            },
          },
        ],
      },
    });

    const { getByTestId, queryByTestId } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() =>
      expect(getByTestId('profile-image-pdf-locked-0')).toBeTruthy()
    );
    expect(queryByTestId('profile-image-pdf-checkbox-0')).toBeNull();
  });

  it('save sends stable index multipart payload', async () => {
    const { getByTestId } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));
    await waitFor(() => expect(getByTestId('profile-image-import-row-0')).toBeTruthy());

    fireEvent.press(getByTestId('probe-save'));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    const payload = mockSave.mock.calls[0][0];
    expect(payload.rows[0]).toMatchObject({
      index: 0,
      filename: 'mara@example.test.jpg',
      player_id: 12,
      is_pdf_primary: true,
    });
    expect(payload.filesByIndex[0]).toMatchObject({
      name: 'mara@example.test.jpg',
      uri: 'blob:test-url',
    });
  });

  it('shows mapped status after manual player select', async () => {
    mockPreview.mockResolvedValueOnce({
      data: {
        max_images_per_player: 3,
        rows: [
          {
            index: 0,
            filename: 'unknown.jpg',
            mapping: {
              status: 'unmapped',
              matched_by: null,
              player: null,
              candidates: [],
              name_matches: [],
            },
          },
        ],
      },
    });

    const { getByTestId } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() =>
      expect(getByTestId('profile-image-status-0').props.children).toBe('unmapped')
    );

    fireEvent.press(getByTestId('option-12'));

    await waitFor(() =>
      expect(getByTestId('profile-image-status-0').props.children).toBe('mapped')
    );
  });

  it('shows existing images after manual player select', async () => {
    mockPreview.mockResolvedValueOnce({
      data: {
        max_images_per_player: 3,
        rows: [
          {
            index: 0,
            filename: 'unknown.jpg',
            mapping: {
              status: 'unmapped',
              matched_by: null,
              player: null,
              candidates: [],
              name_matches: [],
            },
          },
        ],
      },
    });
    mockGetPlayer.mockResolvedValueOnce({
      data: {
        id_player: 12,
        name: 'Mara Popescu',
        uploaded_profile_images: [
          { id: 9, url: 'https://example.test/existing.jpg', is_pdf_primary: true },
        ],
      },
    });

    const { getByTestId, queryByText } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() => expect(getByTestId('profile-image-import-row-0')).toBeTruthy());
    fireEvent.press(getByTestId('option-12'));

    await waitFor(() => expect(mockGetPlayer).toHaveBeenCalledWith(12));
    await waitFor(() => expect(getByTestId('profile-image-existing-0')).toBeTruthy());
    expect(queryByText('No existing images')).toBeNull();
  });

  it('clears existing images when player selection is cleared', async () => {
    mockPreview.mockResolvedValueOnce({
      data: {
        max_images_per_player: 3,
        rows: [
          {
            index: 0,
            filename: 'unknown.jpg',
            mapping: {
              status: 'unmapped',
              matched_by: null,
              player: null,
              candidates: [],
              name_matches: [],
            },
          },
        ],
      },
    });
    mockGetPlayer.mockResolvedValueOnce({
      data: {
        id_player: 12,
        name: 'Mara Popescu',
        uploaded_profile_images: [
          { id: 9, url: 'https://example.test/existing.jpg', is_pdf_primary: true },
        ],
      },
    });

    const { getByTestId, queryByTestId } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));
    await waitFor(() => expect(getByTestId('profile-image-import-row-0')).toBeTruthy());

    fireEvent.press(getByTestId('option-12'));
    await waitFor(() => expect(getByTestId('profile-image-existing-0')).toBeTruthy());

    fireEvent.press(getByTestId('dropdown-clear'));
    await waitFor(() => expect(queryByTestId('profile-image-existing-0')).toBeNull());
  });

  it('renders one toolbar container per import row', async () => {
    const { getByTestId, queryAllByTestId } = mountPanel();
    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() => expect(getByTestId('profile-image-import-row-0')).toBeTruthy());
    expect(getByTestId('profile-image-row-toolbar-0')).toBeTruthy();
    expect(queryAllByTestId(/^profile-image-row-toolbar-0$/)).toHaveLength(1);
  });
});
