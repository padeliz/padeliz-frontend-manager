import React from 'react';
import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import EditionPdfsTab from '@/components/editions/EditionPdfsTab';

const mockGetSchedule = jest.fn();
const mockList = jest.fn();
const mockGenerateMatches = jest.fn(async () => ({
  data: { id_edition_division_poster: 42, poster_kind: 'MATCHES' },
}));
const mockGenerateRanking = jest.fn(async () => ({
  data: { id_edition_division_poster: 7, poster_kind: 'RANKING' },
}));
const mockDownloadMatches = jest.fn(async () => undefined);
const mockDownloadRanking = jest.fn(async () => undefined);
const mockDownloadPrinted = jest.fn(async () => undefined);
const mockListEditionPosters = jest.fn();
const mockGenerateAttendance = jest.fn(async () => ({
  data: { id_edition_division_poster: 99, poster_kind: 'ATTENDANCE' },
}));
const mockDownloadAttendancePdf = jest.fn(async () => undefined);
const mockOpenAttendancePreview = jest.fn(async () => undefined);
const mockDownloadMergedPostersPdf = jest.fn(async () => undefined);
const mockPlaySuccess = jest.fn(async () => undefined);
const mockPlayError = jest.fn(async () => undefined);

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
  },
}));

jest.mock('@/services/api/postersApi', () => ({
  postersApi: {
    list: (...args: unknown[]) => mockList(...args),
    generateMatches: (...args: unknown[]) => mockGenerateMatches(...args),
    generateRanking: (...args: unknown[]) => mockGenerateRanking(...args),
    downloadMatchesPdf: (...args: unknown[]) => mockDownloadMatches(...args),
    downloadRankingPdf: (...args: unknown[]) => mockDownloadRanking(...args),
    downloadPrinted: (...args: unknown[]) => mockDownloadPrinted(...args),
    uploadPrinted: jest.fn(),
  },
}));

jest.mock('@/services/api/editionPostersApi', () => ({
  editionPostersApi: {
    listEditionPosters: (...args: unknown[]) => mockListEditionPosters(...args),
    generateAttendance: (...args: unknown[]) => mockGenerateAttendance(...args),
    downloadAttendancePdf: (...args: unknown[]) =>
      mockDownloadAttendancePdf(...args),
    openAttendancePreview: (...args: unknown[]) =>
      mockOpenAttendancePreview(...args),
    downloadMergedPostersPdf: (...args: unknown[]) =>
      mockDownloadMergedPostersPdf(...args),
  },
}));

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: (...args: unknown[]) => mockPlaySuccess(...args),
  playError: (...args: unknown[]) => mockPlayError(...args),
}));

// Keep Tooltip on its native branch so error text is readable via a11y hint.
jest.mock('@/utils/isWebPlatform', () => ({
  isWebPlatform: () => false,
}));

function renderWithClient(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe('EditionPdfsTab', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        courts: [
          {
            id_court: 1,
            name: 'Centre Court',
            pivot: { id_edition_division_court: 77 },
          },
        ],
        matches: [],
        edition_division: {},
      },
    });
    mockList.mockResolvedValue({
      data: [
        {
          id_edition_division_poster: 42,
          poster_kind: 'MATCHES',
          edition_division_court_id: 77,
          generated_path: 'edition-division-posters/42/generated/m.pdf',
          generated_url: 'https://example.com/g.pdf',
          printed_url: null,
        },
        {
          id_edition_division_poster: 7,
          poster_kind: 'RANKING',
          edition_division_court_id: null,
          generated_path: 'edition-division-posters/7/generated/r.pdf',
          generated_url: 'https://example.com/r.pdf',
          printed_path: 'edition-division-posters/7/printed/p.jpg',
          printed_url: 'https://example.com/p.jpg',
        },
      ],
    });
    mockListEditionPosters.mockResolvedValue({
      data: [
        {
          id_edition_division_poster: 99,
          poster_kind: 'ATTENDANCE',
          edition_division_id: null,
          generated_path: 'edition-posters/99/generated/attendance.pdf',
          generated_url: 'https://example.com/a.pdf',
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
  });

  it('shows RANKING once and MATCHES per court, without a court picker', async () => {
    const { findByText, queryByText, getByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    expect(await findByText(/MATCHES · Centre Court \(EDC #77\)/)).toBeTruthy();
    expect(getByTestId('ranking-9-generate')).toBeTruthy();
    expect(getByTestId('matches-9-77-generate')).toBeTruthy();
    expect(queryByText(/Court \(edition_division_court/)).toBeNull();
  }, 15000);

  it('renders poster actions as ActionButtons with mapped variants', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    const generate = await findByTestId('ranking-9-generate');
    expect(generate.props.className).toMatch(/bg-blue-600/);
    expect(generate.props.accessibilityState).toMatchObject({
      disabled: false,
      busy: false,
    });
    expect(getByTestId('ranking-9-download').props.className).toMatch(
      /bg-green-600/
    );
    expect(getByTestId('ranking-9-download-printed').props.className).toMatch(
      /bg-green-600/
    );
    expect(getByTestId('upload-printed-7').props.className).toMatch(
      /bg-blue-600/
    );
  });

  it('generates MATCHES with only the court, no branding ids', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('matches-9-77-generate'));
    await waitFor(() => {
      expect(mockGenerateMatches).toHaveBeenCalledWith(9, { court: 77 });
    });
    expect(mockDownloadMatches).not.toHaveBeenCalled();
  });

  it('generates RANKING without branding ids', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('ranking-9-generate'));
    await waitFor(() => {
      expect(mockGenerateRanking).toHaveBeenCalledWith(9);
    });
  });

  it('downloads generated MATCHES only via GET file', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('matches-9-77-download'));
    await waitFor(() => {
      expect(mockDownloadMatches).toHaveBeenCalledWith(
        9,
        { court: 77 },
        expect.any(String)
      );
    });
    expect(mockGenerateMatches).not.toHaveBeenCalled();
  });

  it('generate reports pending then success on its own button', async () => {
    let resolveGen: (v: unknown) => void = () => undefined;
    mockGenerateRanking.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveGen = resolve;
        })
    );
    const { findByTestId, getByTestId, queryByTestId, queryByText } =
      renderWithClient(<EditionPdfsTab editionId={1} editionDivisionId={9} />);
    const btn = await findByTestId('ranking-9-generate');
    fireEvent.press(btn);
    expect(await findByTestId('ranking-9-generate-pending')).toBeTruthy();
    // Sibling buttons are not held hostage by a shared busy key.
    expect(
      getByTestId('matches-9-77-generate').props.accessibilityState.disabled
    ).toBe(false);

    await act(async () => {
      resolveGen({
        data: { id_edition_division_poster: 7, poster_kind: 'RANKING' },
      });
    });
    expect(await findByTestId('ranking-9-generate-success')).toBeTruthy();
    expect(queryByTestId('ranking-9-generate-pending')).toBeNull();
    // Press-tied banners are gone.
    expect(queryByText('RANKING PDF generated.')).toBeNull();
    expect(queryByText('Generating…')).toBeNull();
  });

  it('generate plays auditory feedback and holds success (sticky)', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    const btn = await findByTestId('ranking-9-generate');

    jest.useFakeTimers();
    fireEvent.press(btn);
    await waitFor(() => {
      expect(getByTestId('ranking-9-generate-success')).toBeTruthy();
    });
    expect(mockPlaySuccess).toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(getByTestId('ranking-9-generate-success')).toBeTruthy();
  });

  it('download success clears after 4000ms and stays silent', async () => {
    const { findByTestId, getByTestId, queryByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    const btn = await findByTestId('matches-9-77-download');

    jest.useFakeTimers();
    fireEvent.press(btn);
    await waitFor(() => {
      expect(getByTestId('matches-9-77-download-success')).toBeTruthy();
    });
    expect(mockPlaySuccess).not.toHaveBeenCalled();
    expect(mockPlayError).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(queryByTestId('matches-9-77-download-success')).toBeNull();
  });

  it('upload printed plays auditory feedback', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    // No file picker in this environment, so the run throws and reports error.
    const upload = await findByTestId('upload-printed-7');
    const originalDocument = (global as any).document;
    (global as any).document = undefined;
    try {
      fireEvent.press(upload);
      await waitFor(() => {
        expect(getByTestId('upload-printed-7-error')).toBeTruthy();
      });
    } finally {
      (global as any).document = originalDocument;
    }
    expect(mockPlayError).toHaveBeenCalled();
    expect(
      getByTestId('upload-printed-7-tooltip').props.accessibilityHint
    ).toBe('Printed upload is easiest on web (file picker).');
  });

  it('General: download only, no branding, generate, or upload', async () => {
    const { findByTestId, queryByTestId, queryByText } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={
          [
            { id_edition_division: 9, division_title: 'A' },
            { id_edition_division: 10, division_title: 'B' },
          ] as any
        }
      />
    );
    expect(await findByTestId('edition-general-edit-hint')).toBeTruthy();
    expect(queryByTestId('pdfs-branding')).toBeNull();
    expect(await findByTestId('pdfs-general-ed-9')).toBeTruthy();
    expect(queryByTestId('ranking-9-generate')).toBeNull();
    expect(queryByTestId('matches-9-77-generate')).toBeNull();
    expect(queryByText('Upload printed')).toBeNull();
    expect(queryByTestId('ranking-9-download')).toBeTruthy();
    expect(queryByTestId('matches-9-77-download')).toBeTruthy();
  });

  it('ED mode still shows Upload printed', async () => {
    const { findByText, getByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    await findByText(/Centre Court/);
    expect(getByTestId('upload-printed-42')).toBeTruthy();
  });

  it('disables generate when finalized but keeps downloads', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: true,
        courts: [
          {
            id_court: 1,
            name: 'Centre Court',
            pivot: { id_edition_division_court: 77 },
          },
        ],
        matches: [],
        edition_division: {},
      },
    });
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    const generate = await findByTestId('matches-9-77-generate');
    expect(generate.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(generate);
    expect(mockGenerateMatches).not.toHaveBeenCalled();
    fireEvent.press(await findByTestId('matches-9-77-download'));
    await waitFor(() => {
      expect(mockDownloadMatches).toHaveBeenCalled();
    });
  });

  it('does not download generated MATCHES when no file exists', async () => {
    mockList.mockResolvedValue({ data: [] });
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    const download = await findByTestId('matches-9-77-download');
    expect(download.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(download);
    expect(mockDownloadMatches).not.toHaveBeenCalled();
  });

  it('enables Download after generate reloads the poster list', async () => {
    mockList
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValue({
        data: [
          {
            id_edition_division_poster: 42,
            poster_kind: 'MATCHES',
            edition_division_court_id: 77,
            generated_path: 'edition-division-posters/42/generated/m.pdf',
            generated_url: 'https://example.com/g.pdf',
          },
        ],
      });
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('matches-9-77-generate'));
    await waitFor(() => {
      expect(mockGenerateMatches).toHaveBeenCalled();
    });
    fireEvent.press(await findByTestId('matches-9-77-download'));
    await waitFor(() => {
      expect(mockDownloadMatches).toHaveBeenCalled();
    });
  });

  it('reports generate failure on the button and re-enables it', async () => {
    mockGenerateRanking.mockRejectedValueOnce(new Error('mPDF failed'));
    const { findByTestId, getByTestId, queryByText } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('ranking-9-generate'));
    expect(await findByTestId('ranking-9-generate-error')).toBeTruthy();
    expect(
      getByTestId('ranking-9-generate-tooltip').props.accessibilityHint
    ).toBe('mPDF failed');
    expect(mockPlayError).toHaveBeenCalled();
    // No press-tied banner text.
    expect(queryByText('mPDF failed')).toBeNull();

    fireEvent.press(getByTestId('ranking-9-generate'));
    await waitFor(() => {
      expect(mockGenerateRanking).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the load error banner when the schedule fails', async () => {
    mockGetSchedule.mockRejectedValueOnce(new Error('schedule unavailable'));
    const { findByText } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    expect(await findByText('schedule unavailable')).toBeTruthy();
  });

  it('keeps the load error banner when edition posters fail', async () => {
    mockListEditionPosters.mockRejectedValueOnce(new Error('posters down'));
    const { findByText } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={null} divisions={[]} />
    );
    expect(await findByText('posters down')).toBeTruthy();
  });

  it('shows generated/printed download labels and no branding block', async () => {
    const { findByTestId, queryByTestId, queryByText, getAllByText } =
      renderWithClient(
        <EditionPdfsTab editionId={1} editionDivisionId={9} />
      );
    const download = await findByTestId('matches-9-77-download');
    const printed = await findByTestId('matches-9-77-download-printed');
    expect(download.props.accessibilityLabel).toBe('Download generated');
    expect(printed.props.accessibilityLabel).toBe('Download printed');
    expect(getAllByText('generated').length).toBeGreaterThan(0);
    expect(getAllByText('printed').length).toBeGreaterThan(0);
    expect(queryByTestId('pdfs-branding')).toBeNull();
    expect(queryByTestId('pdfs-branding-row')).toBeNull();
    expect(queryByText('Organizer')).toBeNull();
    expect(queryByText('Partner')).toBeNull();
  });

  it('General view shows download-all-pdfs when editionId is provided', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    fireEvent.press(await findByTestId('download-all-pdfs'));
    await waitFor(() => {
      expect(mockDownloadMergedPostersPdf).toHaveBeenCalledWith(1);
    });
    expect(mockPlaySuccess).not.toHaveBeenCalled();
  });

  it('single-ED view does not show download-all-pdfs', async () => {
    const { findByTestId, queryByTestId } = renderWithClient(
      <EditionPdfsTab editionId={1} editionDivisionId={9} />
    );
    await findByTestId('matches-9-77-generate');
    expect(queryByTestId('download-all-pdfs')).toBeNull();
    expect(queryByTestId('attendance-pdf-section')).toBeNull();
  });

  it('General view shows ATTENDANCE preview before generate', async () => {
    const { findByTestId, UNSAFE_getAllByType } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    const preview = await findByTestId('attendance-1-preview');
    const generate = await findByTestId('attendance-1-generate');
    expect(preview).toBeTruthy();
    expect(generate).toBeTruthy();

    const { Pressable } = require('react-native');
    const pressables = UNSAFE_getAllByType(Pressable);
    const previewIndex = pressables.findIndex(
      (node: { props: { testID?: string } }) =>
        node.props.testID === 'attendance-1-preview'
    );
    const generateIndex = pressables.findIndex(
      (node: { props: { testID?: string } }) =>
        node.props.testID === 'attendance-1-generate'
    );
    expect(previewIndex).toBeGreaterThanOrEqual(0);
    expect(generateIndex).toBeGreaterThan(previewIndex);

    fireEvent.press(preview);
    await waitFor(() => {
      expect(mockOpenAttendancePreview).toHaveBeenCalledWith(1);
    });
    expect(mockOpenAttendancePreview).toHaveBeenCalledTimes(1);
  });

  it('ATTENDANCE preview succeeds without auditory feedback', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    fireEvent.press(await findByTestId('attendance-1-preview'));
    expect(await findByTestId('attendance-1-preview-success')).toBeTruthy();
    expect(mockPlaySuccess).not.toHaveBeenCalled();
    expect(getByTestId('attendance-1-preview').props.className).toMatch(
      /bg-blue-600/
    );
  });

  it('ATTENDANCE preview works when edition is finalized but generate is blocked', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionFinalized={true}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    fireEvent.press(await findByTestId('attendance-1-preview'));
    await waitFor(() => {
      expect(mockOpenAttendancePreview).toHaveBeenCalledWith(1);
    });
    fireEvent.press(await findByTestId('attendance-1-generate'));
    expect(mockGenerateAttendance).not.toHaveBeenCalled();
  });

  it('preview throws a web-only error on native instead of a banner', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    const { findByTestId, getByTestId, queryByText } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    fireEvent.press(await findByTestId('attendance-1-preview'));
    expect(await findByTestId('attendance-1-preview-error')).toBeTruthy();
    expect(
      getByTestId('attendance-1-preview-tooltip').props.accessibilityHint
    ).toBe('Attendance preview is web-only.');
    expect(mockOpenAttendancePreview).not.toHaveBeenCalled();
    expect(queryByText('Attendance preview is web-only.')).toBeNull();
  });

  it('General view shows ATTENDANCE generate and download actions', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    expect(await findByTestId('attendance-pdf-section')).toBeTruthy();
    fireEvent.press(await findByTestId('attendance-1-generate'));
    await waitFor(() => {
      expect(mockGenerateAttendance).toHaveBeenCalledWith(1);
    });
    fireEvent.press(await findByTestId('attendance-1-download'));
    await waitFor(() => {
      expect(mockDownloadAttendancePdf).toHaveBeenCalledWith(1);
    });
  });

  it('ATTENDANCE section has no upload or printed actions', async () => {
    const { findByTestId, queryByTestId, getByTestId } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    await findByTestId('attendance-pdf-section');
    expect(queryByTestId('attendance-1-upload-printed')).toBeNull();
    expect(queryByTestId(/upload-printed-/)).toBeNull();
    const printed = getByTestId('attendance-1-download-printed');
    expect(printed.props.accessibilityState?.disabled ?? printed.props.disabled).toBe(
      true
    );
    fireEvent.press(printed);
    expect(mockDownloadPrinted).not.toHaveBeenCalled();
  });

  it('downloads throw a web-only error on native instead of a banner', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    const { findByTestId, getByTestId, queryByText } = renderWithClient(
      <EditionPdfsTab
        editionId={1}
        editionDivisionId={null}
        divisions={[{ id_edition_division: 9, division_title: 'A' }] as any}
      />
    );
    fireEvent.press(await findByTestId('download-all-pdfs'));
    expect(await findByTestId('download-all-pdfs-error')).toBeTruthy();
    expect(
      getByTestId('download-all-pdfs-tooltip').props.accessibilityHint
    ).toBe('PDF download is web-only.');
    expect(mockDownloadMergedPostersPdf).not.toHaveBeenCalled();

    fireEvent.press(await findByTestId('attendance-1-download'));
    expect(await findByTestId('attendance-1-download-error')).toBeTruthy();
    expect(mockDownloadAttendancePdf).not.toHaveBeenCalled();
    expect(queryByText('PDF download is web-only.')).toBeNull();
    // Downloads never trigger sound / haptics, not even on failure.
    expect(mockPlayError).not.toHaveBeenCalled();
  });

  it('skips listEditionPosters when editionId is not finite', async () => {
    renderWithClient(
      <EditionPdfsTab
        editionId={NaN}
        editionDivisionId={null}
        divisions={[]}
      />
    );
    await waitFor(() => {
      expect(mockListEditionPosters).not.toHaveBeenCalled();
    });
  });

  it('has no legacy action pill or press-tied banner state', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EditionPdfsTab.tsx'),
      'utf8'
    );
    expect(src).not.toContain('actionPillClass');
    expect(src).not.toContain('setMessage');
    expect(src).not.toContain('busyKey');
    expect(src).toContain('useActionButtonStatus');
    expect(src).toMatch(/DOWNLOAD_SUCCESS_HOLD_MS = 4000/);
  });
});
