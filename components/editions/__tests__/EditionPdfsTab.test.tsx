import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
  });

  it('shows RANKING once and MATCHES per court, without a court picker', async () => {
    const { findByText, queryByText, getByTestId } = renderWithClient(
      <EditionPdfsTab editionDivisionId={9} />
    );
    expect(await findByText(/MATCHES · Centre Court \(EDC #77\)/)).toBeTruthy();
    expect(getByTestId('ranking-9-generate')).toBeTruthy();
    expect(getByTestId('matches-9-77-generate')).toBeTruthy();
    expect(queryByText(/Court \(edition_division_court/)).toBeNull();
  }, 15000);

  it('generates MATCHES with only the court, no branding ids', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('matches-9-77-generate'));
    await waitFor(() => {
      expect(mockGenerateMatches).toHaveBeenCalledWith(9, { court: 77 });
    });
    expect(mockDownloadMatches).not.toHaveBeenCalled();
  });

  it('generates RANKING without branding ids', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('ranking-9-generate'));
    await waitFor(() => {
      expect(mockGenerateRanking).toHaveBeenCalledWith(9);
    });
  });

  it('downloads generated MATCHES only via GET file', async () => {
    const { findByTestId } = renderWithClient(
      <EditionPdfsTab editionDivisionId={9} />
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

  it('shows generating state then a success message', async () => {
    let resolveGen: (v: unknown) => void = () => undefined;
    mockGenerateRanking.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveGen = resolve;
        })
    );
    const { findByTestId, findByText, getByTestId } = renderWithClient(
      <EditionPdfsTab editionDivisionId={9} />
    );
    const btn = await findByTestId('ranking-9-generate');
    fireEvent.press(btn);
    expect(await findByText('Generating…')).toBeTruthy();
    resolveGen({ data: { id_edition_division_poster: 7, poster_kind: 'RANKING' } });
    expect(await findByText('RANKING PDF generated.')).toBeTruthy();
    expect(getByTestId('ranking-9-generate')).toBeTruthy();
  });

  it('General: download only, no branding, generate, or upload', async () => {
    const { findByTestId, queryByTestId, queryByText } = renderWithClient(
      <EditionPdfsTab
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
      <EditionPdfsTab editionDivisionId={9} />
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
      <EditionPdfsTab editionDivisionId={9} />
    );
    const generate = await findByTestId('matches-9-77-generate');
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
      <EditionPdfsTab editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('matches-9-77-download'));
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
      <EditionPdfsTab editionDivisionId={9} />
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

  it('shows an error and re-enables generate after failure', async () => {
    mockGenerateRanking.mockRejectedValueOnce(new Error('mPDF failed'));
    const { findByTestId, findByText } = renderWithClient(
      <EditionPdfsTab editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('ranking-9-generate'));
    expect(await findByText('mPDF failed')).toBeTruthy();
    fireEvent.press(await findByTestId('ranking-9-generate'));
    await waitFor(() => {
      expect(mockGenerateRanking).toHaveBeenCalledTimes(2);
    });
  });

  it('shows generated/printed download labels and no branding block', async () => {
    const { findByTestId, queryByTestId, queryByText, getAllByText } =
      renderWithClient(<EditionPdfsTab editionDivisionId={9} />);
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
});
