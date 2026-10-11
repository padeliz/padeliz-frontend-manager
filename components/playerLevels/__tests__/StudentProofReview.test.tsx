/**
 * @jest-environment jsdom
 */
import StudentProofReview from '@/components/playerLevels/StudentProofReview';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetProof = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: jest.fn(async () => undefined),
  playError: jest.fn(async () => undefined),
}));

jest.mock('@/services/api/playerStudentProofsApi', () => ({
  PlayerStudentProofsApiService: jest.fn().mockImplementation(() => ({
    getProof: (...args: unknown[]) => mockGetProof(...args),
    approveProof: (...args: unknown[]) => mockApprove(...args),
    rejectProof: (...args: unknown[]) => mockReject(...args),
  })),
}));

function file(id: number, url: string) {
  return {
    id_player_student_proof_file: id,
    student_proof_id: 3,
    sort_order: id,
    url,
    inserted_at: 1,
  };
}

function proof(overrides: Record<string, unknown> = {}) {
  return {
    id_player_student_proof: 3,
    player_user_id: 42,
    student_until: '2027-06-30',
    ready_for_review: true,
    review_status: 'pending',
    submitted_at: 1700000000,
    files: [file(11, 'https://example.com/proof.jpg')],
    inserted_at: 1,
    player: { id_user: 42, name: 'Mara Lovelace' },
    ...overrides,
  };
}

describe('StudentProofReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProof.mockResolvedValue({ data: proof() });
  });

  it('shows the proof image and prefilled student_until', async () => {
    const { findByTestId, getByTestId } = render(
      <StudentProofReview proofId={3} />
    );
    expect((await findByTestId('proof-player')).props.children).toBe(
      'Mara Lovelace'
    );
    expect(mockGetProof).toHaveBeenCalledWith(3);
    expect(getByTestId('proof-image-11').props.source).toEqual({
      uri: 'https://example.com/proof.jpg',
    });
    expect(getByTestId('proof-student-until-input').props.value).toBe(
      '2027-06-30'
    );
  });

  it('approves without a date correction when unchanged', async () => {
    mockApprove.mockResolvedValue({ data: proof({ review_status: 'approved' }) });
    const onReviewed = jest.fn();
    const { findByTestId, getByTestId } = render(
      <StudentProofReview proofId={3} onReviewed={onReviewed} />
    );
    await findByTestId('proof-approve');
    fireEvent.changeText(getByTestId('proof-message-input'), 'Valid');
    fireEvent.press(getByTestId('proof-approve'));

    await waitFor(() =>
      expect(mockApprove).toHaveBeenCalledWith(3, { review_message: 'Valid' })
    );
    await waitFor(() => expect(onReviewed).toHaveBeenCalledTimes(1));
    expect(getByTestId('proof-already-reviewed')).toBeTruthy();
  });

  it('sends a corrected student_until when changed', async () => {
    mockApprove.mockResolvedValue({ data: proof({ review_status: 'approved' }) });
    const { findByTestId, getByTestId } = render(
      <StudentProofReview proofId={3} />
    );
    await findByTestId('proof-approve');
    fireEvent.changeText(getByTestId('proof-student-until-input'), '2028-01-15');
    fireEvent.press(getByTestId('proof-approve'));
    await waitFor(() =>
      expect(mockApprove).toHaveBeenCalledWith(3, {
        review_message: null,
        student_until: '2028-01-15',
      })
    );
  });

  it('rejects an invalid date before calling the API', async () => {
    const { findByTestId, getByTestId } = render(
      <StudentProofReview proofId={3} />
    );
    await findByTestId('proof-approve');
    fireEvent.changeText(getByTestId('proof-student-until-input'), '15/01/2028');
    fireEvent.press(getByTestId('proof-approve'));
    expect((await findByTestId('proof-date-error')).props.children).toMatch(
      /YYYY-MM-DD/
    );
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('rejects with a message', async () => {
    mockReject.mockResolvedValue({
      data: proof({ review_status: 'rejected', review_message: 'Blurry' }),
    });
    const { findByTestId, getByTestId } = render(
      <StudentProofReview proofId={3} />
    );
    await findByTestId('proof-reject');
    fireEvent.changeText(getByTestId('proof-message-input'), 'Blurry');
    fireEvent.press(getByTestId('proof-reject'));
    await waitFor(() =>
      expect(mockReject).toHaveBeenCalledWith(3, { review_message: 'Blurry' })
    );
    expect(mockApprove).not.toHaveBeenCalled();
    await waitFor(() => expect(getByTestId('proof-review-message')).toBeTruthy());
  });

  it('renders every file of a multi-file proof', async () => {
    mockGetProof.mockResolvedValue({
      data: proof({
        files: [
          file(11, 'https://example.com/front.jpg'),
          file(12, 'https://example.com/back.png'),
          file(13, 'https://example.com/letter.pdf'),
        ],
      }),
    });
    const { findByTestId, getByTestId, getByText, queryByTestId } = render(
      <StudentProofReview proofId={3} />
    );

    await findByTestId('proof-files');
    expect(getByText('Proof files (3)')).toBeTruthy();
    expect(getByTestId('proof-image-11').props.source).toEqual({
      uri: 'https://example.com/front.jpg',
    });
    expect(getByTestId('proof-image-12').props.source).toEqual({
      uri: 'https://example.com/back.png',
    });
    expect(getByTestId('proof-open-file-13')).toBeTruthy();
    expect(queryByTestId('proof-image-13')).toBeNull();
    expect(queryByTestId('proof-no-files')).toBeNull();
  });

  it('opens each PDF file with its own url', async () => {
    const openURL = jest
      .spyOn(require('react-native').Linking, 'openURL')
      .mockResolvedValue(true);
    mockGetProof.mockResolvedValue({
      data: proof({
        files: [
          file(21, 'https://example.com/a.pdf'),
          file(22, 'https://example.com/b.pdf'),
        ],
      }),
    });
    const { findByTestId, getByTestId } = render(
      <StudentProofReview proofId={3} />
    );

    await findByTestId('proof-open-file-21');
    fireEvent.press(getByTestId('proof-open-file-22'));
    expect(openURL).toHaveBeenCalledWith('https://example.com/b.pdf');
    openURL.mockRestore();
  });

  it('shows an empty state when the proof has no files', async () => {
    mockGetProof.mockResolvedValue({ data: proof({ files: [] }) });
    const { findByTestId, queryByTestId } = render(
      <StudentProofReview proofId={3} />
    );

    await findByTestId('proof-no-files');
    expect(queryByTestId('proof-files')).toBeNull();
  });

  it('offers a link for PDF proofs and hides the form once reviewed', async () => {
    mockGetProof.mockResolvedValue({
      data: proof({
        files: [file(11, 'https://example.com/proof.pdf')],
        review_status: 'approved',
      }),
    });
    const { findByTestId, getByTestId, queryByTestId } = render(
      <StudentProofReview proofId={3} />
    );
    await findByTestId('proof-open-file-11');
    expect(queryByTestId('proof-image-11')).toBeNull();
    expect(queryByTestId('proof-review-form')).toBeNull();
    expect(getByTestId('proof-already-reviewed')).toBeTruthy();
  });
});
