/**
 * @jest-environment jsdom
 */
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { EventParticipationsApiService } from '@/services/api/eventParticipationsApi';
import { LevelsApiService } from '@/services/api/levelsApi';
import { PlayerLevelAssessmentsApiService } from '@/services/api/playerLevelAssessmentsApi';
import { PlayerStudentProofsApiService } from '@/services/api/playerStudentProofsApi';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/services/api/baseApi', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    BaseApiService: class {
      get = (...args: unknown[]) => mockGet(...args);
      post = (...args: unknown[]) => mockPost(...args);
      put = (...args: unknown[]) => mockPut(...args);
      patch = (...args: unknown[]) => mockPatch(...args);
      delete = (...args: unknown[]) => mockDelete(...args);
    },
  };
});

describe('player level APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: [], meta: { last_page: 1 } });
    mockPatch.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
  });

  it('lists and shows level assessments', async () => {
    const api = new PlayerLevelAssessmentsApiService();
    await api.getAssessments({
      page: 2,
      filters: { review_status: 'pending', ready_for_review: 1 },
    });
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('/player-level-assessments?');
    expect(url).toContain('page=2');
    expect(url).toContain('filters%5Breview_status%5D=pending');
    expect(url).toContain('filters%5Bready_for_review%5D=1');

    await api.getAssessment(7);
    expect(mockGet).toHaveBeenLastCalledWith('/player-level-assessments/7');
  });

  it('approves with a level and rejects via PATCH', async () => {
    const api = new PlayerLevelAssessmentsApiService();
    await api.approveAssessment(7, { level: '3.50', review_message: 'ok' });
    expect(mockPatch).toHaveBeenLastCalledWith(
      '/player-level-assessments/7/approve',
      { level: '3.50', review_message: 'ok' }
    );
    await api.rejectAssessment(7, { review_message: 'no' });
    expect(mockPatch).toHaveBeenLastCalledWith(
      '/player-level-assessments/7/reject',
      { review_message: 'no' }
    );
  });

  it('exposes no create/update/delete on assessments', () => {
    const api = new PlayerLevelAssessmentsApiService() as any;
    expect(api.createAssessment).toBeUndefined();
    expect(api.updateAssessment).toBeUndefined();
    expect(api.deleteAssessment).toBeUndefined();
    expect(api.bulkDeleteAssessments).toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('reviews student proofs via the separate resource', async () => {
    const api = new PlayerStudentProofsApiService();
    await api.getProofs({ filters: { review_status: 'pending' } });
    expect(mockGet.mock.calls[0][0]).toContain('/player-student-proofs?');
    await api.getProof(3);
    expect(mockGet).toHaveBeenLastCalledWith('/player-student-proofs/3');
    await api.approveProof(3, { student_until: '2027-06-30' });
    expect(mockPatch).toHaveBeenLastCalledWith(
      '/player-student-proofs/3/approve',
      { student_until: '2027-06-30' }
    );
    await api.rejectProof(3, { review_message: 'blurry' });
    expect(mockPatch).toHaveBeenLastCalledWith(
      '/player-student-proofs/3/reject',
      { review_message: 'blurry' }
    );
    expect((api as any).createProof).toBeUndefined();
  });

  it('reads levels read-only and pages through every band', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [{ id_level: 1 }],
        meta: { last_page: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ id_level: 2 }],
        meta: { last_page: 2 },
      });
    const api = new LevelsApiService();
    expect(await api.getAllLevels()).toEqual([
      { id_level: 1 },
      { id_level: 2 },
    ]);
    expect(mockGet.mock.calls[0][0]).toContain('/levels?');
    expect(mockGet.mock.calls[0][0]).toContain('per_page=100');
    await api.getLevel(4);
    expect(mockGet).toHaveBeenLastCalledWith('/levels/4');
    const anyApi = api as any;
    expect(anyApi.createLevel).toBeUndefined();
    expect(anyApi.updateLevel).toBeUndefined();
    expect(anyApi.deleteLevel).toBeUndefined();
  });

  it('upserts a participation level and treats 404 as no level', async () => {
    const api = new EventParticipationsApiService();
    await api.upsertParticipationLevel(100, '3.50');
    expect(mockPut).toHaveBeenCalledWith('/event-participations/100/level', {
      level: '3.50',
    });

    const { ApiError } = require('@/services/api/baseApi');
    mockGet.mockRejectedValueOnce(new ApiError(404, 'none'));
    expect(await api.getParticipationLevel(100)).toEqual({ data: null });

    mockGet.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await expect(api.getParticipationLevel(100)).rejects.toThrow('boom');
  });

  it('syncs division bands without sending level bounds', async () => {
    const api = new DivisionsApiService();
    await api.syncDivisionLevels(5, [1, 2]);
    expect(mockPatch).toHaveBeenCalledWith('/divisions/5', {
      level_ids: [1, 2],
    });
    const body = mockPatch.mock.calls[0][1];
    expect(body).not.toHaveProperty('level_min');
    expect(body).not.toHaveProperty('level_max');
  });
});
