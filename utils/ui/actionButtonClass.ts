/** Shared classNames for Edition action pills (match chrome Save). */

export function actionPillClass(
  enabled: boolean,
  enabledBg: 'blue' | 'green' | 'red' = 'blue'
): string {
  const bg =
    !enabled
      ? 'bg-gray-300'
      : enabledBg === 'green'
        ? 'bg-green-600'
        : enabledBg === 'red'
          ? 'bg-red-600'
          : 'bg-blue-600';
  return `rounded-lg px-3 py-2 ${bg}`;
}
