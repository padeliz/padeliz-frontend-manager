import {
  createSyncStatusController,
  syncBadgeLabel,
} from '../syncStatus';

describe('syncStatus', () => {
  it('maps phases to labels', () => {
    expect(syncBadgeLabel('saving')).toBe('Saving...');
    expect(syncBadgeLabel('retrying')).toBe('Retrying...');
    expect(syncBadgeLabel('saved')).toBe('Saved');
    expect(syncBadgeLabel('failed')).toBe('Failed');
    expect(syncBadgeLabel('hidden')).toBeNull();
  });

  it('Saving → Saved then hides after 3s; Failed hides after 3s; retry cancels hide', () => {
    jest.useFakeTimers();
    const timers: Array<{ fn: () => void; ms: number }> = [];
    const controller = createSyncStatusController(
      () => 0,
      (fn, ms) => {
        timers.push({ fn, ms });
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      () => {
        timers.length = 0;
      }
    );

    controller.beginAttempt(false);
    expect(controller.getState().label).toBe('Saving...');
    controller.markSaved();
    expect(controller.getState().label).toBe('Saved');
    expect(timers[0]?.ms).toBe(3000);
    timers[0].fn();
    expect(controller.getState().phase).toBe('hidden');

    controller.markFailed();
    expect(controller.getState().label).toBe('Failed');
    controller.beginAttempt(true);
    expect(controller.getState().label).toBe('Retrying...');
    expect(timers).toHaveLength(0);

    jest.useRealTimers();
  });
});
