import {
  desiredLotteryParam,
  lotteryQueryId,
} from '@/utils/event/lotteryUrlSync';

describe('desiredLotteryParam', () => {
  it('returns undefined while lotteries are loading', () => {
    expect(
      desiredLotteryParam({
        lotteriesLoaded: false,
        lotteries: [{ id_lottery: 3 }],
        lotteryId: null,
        rawLotteryId: null,
      })
    ).toBeUndefined();
  });

  it('auto-selects the only lottery id regardless of raw', () => {
    expect(
      desiredLotteryParam({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }],
        lotteryId: null,
        rawLotteryId: null,
      })
    ).toBe(3);
    expect(
      desiredLotteryParam({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }],
        lotteryId: null,
        rawLotteryId: 99,
      })
    ).toBe(3);
  });

  it('returns validated lotteryId when multiple lotteries', () => {
    expect(
      desiredLotteryParam({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }, { id_lottery: 9 }],
        lotteryId: 3,
        rawLotteryId: 3,
      })
    ).toBe(3);
  });

  it('returns null to clear stale raw when multiple lotteries', () => {
    expect(
      desiredLotteryParam({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }, { id_lottery: 9 }],
        lotteryId: null,
        rawLotteryId: 99,
      })
    ).toBeNull();
  });

  it('returns null when multiple lotteries and nothing selected', () => {
    expect(
      desiredLotteryParam({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }, { id_lottery: 9 }],
        lotteryId: null,
        rawLotteryId: null,
      })
    ).toBeNull();
  });

  it('returns null for empty list with stale raw', () => {
    expect(
      desiredLotteryParam({
        lotteriesLoaded: true,
        lotteries: [],
        lotteryId: null,
        rawLotteryId: 99,
      })
    ).toBeNull();
  });

  it('returns null for empty list with no raw', () => {
    expect(
      desiredLotteryParam({
        lotteriesLoaded: true,
        lotteries: [],
        lotteryId: null,
        rawLotteryId: null,
      })
    ).toBeNull();
  });
});

describe('lotteryQueryId', () => {
  it('returns raw while loading', () => {
    expect(
      lotteryQueryId({
        lotteriesLoaded: false,
        lotteries: [],
        lotteryId: null,
        rawLotteryId: 7,
      })
    ).toBe(7);
    expect(
      lotteryQueryId({
        lotteriesLoaded: false,
        lotteries: [],
        lotteryId: null,
        rawLotteryId: null,
      })
    ).toBeNull();
  });

  it('returns the only lottery id after load', () => {
    expect(
      lotteryQueryId({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }],
        lotteryId: null,
        rawLotteryId: null,
      })
    ).toBe(3);
  });

  it('returns null for multi stale (ignores raw in hrefs)', () => {
    expect(
      lotteryQueryId({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }, { id_lottery: 9 }],
        lotteryId: null,
        rawLotteryId: 99,
      })
    ).toBeNull();
  });

  it('returns validated id for multi valid', () => {
    expect(
      lotteryQueryId({
        lotteriesLoaded: true,
        lotteries: [{ id_lottery: 3 }, { id_lottery: 9 }],
        lotteryId: 3,
        rawLotteryId: 3,
      })
    ).toBe(3);
  });
});
