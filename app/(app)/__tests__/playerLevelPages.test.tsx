/**
 * @jest-environment jsdom
 */
import LevelsPage from '@/app/(app)/levels/index';
import ViewPlayerLevelAssessmentPage from '@/app/(app)/player-level-assessments/[id]';
import PlayerLevelAssessmentsPage from '@/app/(app)/player-level-assessments/index';
import ViewPlayerStudentProofPage from '@/app/(app)/player-student-proofs/[id]';
import PlayerStudentProofsPage from '@/app/(app)/player-student-proofs/index';
import { render, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import React from 'react';

const mockPush = jest.fn();
let mockConfig: any = null;

const mockGetAssessments = jest.fn();
const mockGetProofs = jest.fn();
const mockGetLevels = jest.fn();

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({ id: '12' }),
  })
);

jest.mock('@/components/pages/ResourceListPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    mockConfig = config;
    return null;
  },
}));

jest.mock('@/components/layout/AppLayout', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@/components/playerLevels/PlayerLevelAssessmentReview', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ assessmentId }: any) => (
      <Text testID="assessment-review-stub">{String(assessmentId)}</Text>
    ),
  };
});

jest.mock('@/components/playerLevels/StudentProofReview', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ proofId }: any) => (
      <Text testID="proof-review-stub">{String(proofId)}</Text>
    ),
  };
});

jest.mock('@/services/api/playerLevelAssessmentsApi', () => ({
  PlayerLevelAssessmentsApiService: jest.fn().mockImplementation(() => ({
    getAssessments: (...args: unknown[]) => mockGetAssessments(...args),
  })),
}));

jest.mock('@/services/api/playerStudentProofsApi', () => ({
  PlayerStudentProofsApiService: jest.fn().mockImplementation(() => ({
    getProofs: (...args: unknown[]) => mockGetProofs(...args),
  })),
}));

jest.mock('@/services/api/levelsApi', () => ({
  LevelsApiService: jest.fn().mockImplementation(() => ({
    getLevels: (...args: unknown[]) => mockGetLevels(...args),
  })),
}));

const APP_DIR = path.join(__dirname, '..');

describe('Level assessments list page (review-only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = null;
  });

  it('lists assessments with view navigation and no add / bulk delete', async () => {
    mockGetAssessments.mockResolvedValue({ data: [{ id: 1 }], meta: {} });
    render(<PlayerLevelAssessmentsPage />);

    expect(mockConfig.resourceName).toBe('PlayerLevelAssessment');
    expect(mockConfig.onAdd).toBeUndefined();
    expect(mockConfig.bulkActions ?? []).toEqual([]);

    const res = await mockConfig.fetchData({ page: 2 });
    expect(mockGetAssessments).toHaveBeenCalledWith({ page: 2 });
    expect(res.data).toEqual([{ id: 1 }]);

    mockConfig.onView(5);
    expect(mockPush).toHaveBeenCalledWith('/player-level-assessments/5');
  });

  it('has no create route', () => {
    const dir = path.join(APP_DIR, 'player-level-assessments');
    expect(fs.existsSync(path.join(dir, 'add.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'index.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '[id].tsx'))).toBe(true);
  });

  it('review page passes the route id to the review panel', async () => {
    const { findByTestId } = render(<ViewPlayerLevelAssessmentPage />);
    expect((await findByTestId('assessment-review-stub')).props.children).toBe(
      '12'
    );
  });
});

describe('Student proofs list page (review-only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = null;
  });

  it('is its own resource with view navigation and no add / bulk delete', async () => {
    mockGetProofs.mockResolvedValue({ data: [{ id: 2 }], meta: {} });
    render(<PlayerStudentProofsPage />);

    expect(mockConfig.resourceName).toBe('PlayerStudentProof');
    expect(mockConfig.onAdd).toBeUndefined();
    expect(mockConfig.bulkActions ?? []).toEqual([]);

    await mockConfig.fetchData({ page: 1 });
    expect(mockGetProofs).toHaveBeenCalledWith({ page: 1 });

    mockConfig.onView(8);
    expect(mockPush).toHaveBeenCalledWith('/player-student-proofs/8');
  });

  it('has no create route', () => {
    const dir = path.join(APP_DIR, 'player-student-proofs');
    expect(fs.existsSync(path.join(dir, 'add.tsx'))).toBe(false);
  });

  it('review page passes the route id to the review panel', async () => {
    const { findByTestId } = render(<ViewPlayerStudentProofPage />);
    expect((await findByTestId('proof-review-stub')).props.children).toBe('12');
  });
});

describe('Levels list page (read-only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = null;
  });

  it('lists seeded bands without add, edit or delete', async () => {
    mockGetLevels.mockResolvedValue({ data: [{ id_level: 1 }], meta: {} });
    render(<LevelsPage />);
    await waitFor(() => expect(mockConfig).not.toBeNull());

    expect(mockConfig.resourceName).toBe('Level');
    expect(mockConfig.onAdd).toBeUndefined();
    expect(mockConfig.onView).toBeUndefined();
    expect(mockConfig.bulkActions ?? []).toEqual([]);
    await mockConfig.fetchData({ page: 1 });
    expect(mockGetLevels).toHaveBeenCalledWith({ page: 1 });

    const dir = path.join(APP_DIR, 'levels');
    expect(fs.existsSync(path.join(dir, 'add.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(dir, '[id].tsx'))).toBe(false);
  });
});
