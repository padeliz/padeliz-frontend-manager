/**
 * Derived lottery selection for edition lottery UI.
 * undefined = still loading; null = no selection; number = active id.
 * Does not write the URL — consumers derive; user navigation writes.
 */

export type LotterySelectionArgs = {
  lotteriesLoaded: boolean;
  lotteries: { id_lottery: number }[];
  lotteryId: number | null;
  rawLotteryId: number | null;
};

export function desiredLotteryParam(
  args: LotterySelectionArgs
): number | null | undefined {
  if (!args.lotteriesLoaded) return undefined;
  if (args.lotteries.length === 1) {
    const id = Number(args.lotteries[0].id_lottery);
    return Number.isFinite(id) ? id : null;
  }
  return args.lotteryId;
}

/** Href / display id: URL-optimistic while loading, derived after load. */
export function lotteryQueryId(args: LotterySelectionArgs): number | null {
  const desired = desiredLotteryParam(args);
  return desired === undefined ? args.rawLotteryId : desired;
}
