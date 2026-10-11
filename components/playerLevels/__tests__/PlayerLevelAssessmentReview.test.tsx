/**
 * @jest-environment jsdom
 */
import PlayerLevelAssessmentReview from '@/components/playerLevels/PlayerLevelAssessmentReview';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetAssessment = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();
const mockGetAllLevels = jest.fn();

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: jest.fn(async () => undefined),
  playError: jest.fn(async () => undefined),
}));

jest.mock('@/services/api/playerLevelAssessmentsApi', () => ({
  PlayerLevelAssessmentsApiService: jest.fn().mockImplementation(() => ({
    getAssessment: (...args: unknown[]) => mockGetAssessment(...args),
    approveAssessment: (...args: unknown[]) => mockApprove(...args),
    rejectAssessment: (...args: unknown[]) => mockReject(...args),
  })),
}));

jest.mock('@/services/api/levelsApi', () => ({
  LevelsApiService: jest.fn().mockImplementation(() => ({
    getAllLevels: (...args: unknown[]) => mockGetAllLevels(...args),
  })),
}));

const bands = [
  { id_level: 1, name: 'Div 3 Mid', level_min: '3.66', level_max: '3.34' },
  { id_level: 2, name: 'Div 3 Top', level_min: '3.33', level_max: '3.01' },
];

function assessment(overrides: Record<string, unknown> = {}) {
  return {
    id_player_level_assessment: 7,
    player_user_id: 42,
    player_custom_field_submission_id: 5,
    submitted_at: 1700000000,
    ready_for_review: true,
    review_status: 'pending',
    inserted_at: 1,
    player: { id_user: 42, name: 'Mara Lovelace' },
    submission: {
      id_player_custom_field_submission: 5,
      player_user_id: 42,
      values: [
        {
          id_player_custom_field_value: 11,
          player_user_id: 42,
          player_custom_field_id: 3,
          field: { code: 'racket_experience', label: 'Racket experience', type: 'json' },
          value_json: [
            { sport: 'Padel', level: 'Beginner', years_of_playing: 2 },
          ],
        },
        {
          id_player_custom_field_value: 12,
          player_user_id: 42,
          player_custom_field_id: 4,
          field: { code: 'shirt', label: 'Shirt', type: 'text' },
          value: 'M',
        },
      ],
    },
    ...overrides,
  };
}

describe('PlayerLevelAssessmentReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssessment.mockResolvedValue({ data: assessment() });
    mockGetAllLevels.mockResolvedValue(bands);
  });

  it('shows the submission, including json answers, for review', async () => {
    const { findByTestId, getByTestId, getByText } = render(
      <PlayerLevelAssessmentReview assessmentId={7} />
    );
    expect((await findByTestId('assessment-player')).props.children).toBe(
      'Mara Lovelace'
    );
    expect(mockGetAssessment).toHaveBeenCalledWith(7);
    expect(getByText('Padel · Beginner · 2 years')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
    expect(getByTestId('assessment-review-form')).toBeTruthy();
    expect(getByTestId('assessment-bands-hint')).toBeTruthy();
  });

  it('approves with the entered level and message', async () => {
    mockApprove.mockResolvedValue({
      data: assessment({
        review_status: 'approved',
        player_level: { level: '3.50', band_name: 'Div 3 Mid' },
      }),
    });
    const onReviewed = jest.fn();
    const { findByTestId, getByTestId, queryByTestId } = render(
      <PlayerLevelAssessmentReview assessmentId={7} onReviewed={onReviewed} />
    );
    await findByTestId('assessment-level-input');

    fireEvent.changeText(getByTestId('assessment-level-input'), '3.50');
    expect((await findByTestId('assessment-level-band')).props.children).toEqual([
      'Band: ',
      'Div 3 Mid',
      ' (',
      '3.66 → 3.34',
      ')',
    ]);
    fireEvent.changeText(getByTestId('assessment-message-input'), 'Looks right');
    fireEvent.press(getByTestId('assessment-approve'));

    await waitFor(() =>
      expect(mockApprove).toHaveBeenCalledWith(7, {
        level: '3.50',
        review_message: 'Looks right',
      })
    );
    await waitFor(() => expect(onReviewed).toHaveBeenCalledTimes(1));
    expect(queryByTestId('assessment-review-form')).toBeNull();
    expect(getByTestId('assessment-already-reviewed')).toBeTruthy();
    expect(getByTestId('assessment-player-level')).toBeTruthy();
  });

  it('blocks approve without a 2-decimal level inside a band', async () => {
    const { findByTestId, getByTestId } = render(
      <PlayerLevelAssessmentReview assessmentId={7} />
    );
    await findByTestId('assessment-level-input');

    fireEvent.press(getByTestId('assessment-approve'));
    expect((await findByTestId('assessment-level-error')).props.children).toMatch(
      /Enter a player level/
    );

    fireEvent.changeText(getByTestId('assessment-level-input'), '3.5');
    fireEvent.press(getByTestId('assessment-approve'));
    await waitFor(() =>
      expect(getByTestId('assessment-level-error').props.children).toMatch(
        /2 decimals/
      )
    );

    fireEvent.changeText(getByTestId('assessment-level-input'), '8.00');
    fireEvent.press(getByTestId('assessment-approve'));
    await waitFor(() =>
      expect(getByTestId('assessment-level-error').props.children).toMatch(
        /outside/
      )
    );
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('surfaces API errors from approve on the button', async () => {
    mockApprove.mockRejectedValue(new Error('Not in a band'));
    const { findByTestId, getByTestId } = render(
      <PlayerLevelAssessmentReview assessmentId={7} />
    );
    await findByTestId('assessment-level-input');
    fireEvent.changeText(getByTestId('assessment-level-input'), '3.50');
    fireEvent.press(getByTestId('assessment-approve'));
    expect(await findByTestId('assessment-approve-error')).toBeTruthy();
  });

  it('rejects without needing a level', async () => {
    mockReject.mockResolvedValue({
      data: assessment({ review_status: 'rejected', review_message: 'Redo' }),
    });
    const { findByTestId, getByTestId } = render(
      <PlayerLevelAssessmentReview assessmentId={7} />
    );
    await findByTestId('assessment-level-input');
    fireEvent.changeText(getByTestId('assessment-message-input'), 'Redo');
    fireEvent.press(getByTestId('assessment-reject'));

    await waitFor(() =>
      expect(mockReject).toHaveBeenCalledWith(7, { review_message: 'Redo' })
    );
    expect(mockApprove).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getByTestId('assessment-already-reviewed')).toBeTruthy()
    );
  });

  it('hides the review form for already-reviewed assessments', async () => {
    mockGetAssessment.mockResolvedValue({
      data: assessment({
        review_status: 'approved',
        player_level: { level: '3.50', band_name: 'Div 3 Mid' },
      }),
    });
    const { findByTestId, queryByTestId } = render(
      <PlayerLevelAssessmentReview assessmentId={7} />
    );
    await findByTestId('assessment-already-reviewed');
    expect(queryByTestId('assessment-review-form')).toBeNull();
  });

  it('shows a load error', async () => {
    mockGetAssessment.mockRejectedValue(new Error('Nope'));
    const { findByTestId } = render(
      <PlayerLevelAssessmentReview assessmentId={7} />
    );
    expect((await findByTestId('assessment-load-error')).props.children).toBe(
      'Nope'
    );
  });
});
