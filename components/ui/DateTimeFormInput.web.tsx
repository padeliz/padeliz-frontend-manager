/**
 * DateTimeFormInput (web)
 *
 * Web variant that renders a native HTML `<input>` (`type="date"`,
 * `datetime-local`, or `time`) so the browser provides its built-in
 * picker. Metro auto-resolves this file in the web bundle, which keeps
 * `@react-native-community/datetimepicker` out of the web build.
 */

import React, { useMemo, useState } from 'react';
import type { DateTimeFormInputProps } from './DateTimeFormInput';

const HTML_INPUT_TYPE: Record<DateTimeFormInputProps['inputType'], string> = {
  date: 'date',
  datetime: 'datetime-local',
  time: 'time',
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Format a Date for an HTML date/time input. We use local-time components
 * (not toISOString) so the picker shows the day/time the user expects in
 * their own time zone.
 */
function formatForInput(
  date: Date,
  inputType: DateTimeFormInputProps['inputType']
): string {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const mo = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const s = pad2(date.getSeconds());
  switch (inputType) {
    case 'date':
      return `${y}-${mo}-${d}`;
    case 'datetime':
      return `${y}-${mo}-${d}T${h}:${mi}`;
    case 'time':
      return `${h}:${mi}:${s}`;
    default:
      return '';
  }
}

function parseInputValue(
  rawValue: string,
  inputType: DateTimeFormInputProps['inputType']
): Date | null {
  if (!rawValue) return null;
  if (inputType === 'time') {
    const [hStr, mStr, sStr] = rawValue.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    const s = sStr ? Number(sStr) : 0;
    if ([h, m, s].some(n => Number.isNaN(n))) return null;
    const d = new Date();
    d.setHours(h, m, s, 0);
    return d;
  }
  // 'date' and 'datetime-local' are parsed as local time by the Date
  // constructor when no timezone suffix is present.
  const d = new Date(rawValue);
  return isNaN(d.getTime()) ? null : d;
}

export default function DateTimeFormInput({
  inputType,
  value,
  onChange,
  placeholder,
  disabled = false,
  hasError = false,
  minDate,
  maxDate,
}: DateTimeFormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const inputValue = useMemo(
    () => (value ? formatForInput(value, inputType) : ''),
    [value, inputType]
  );

  const min = useMemo(
    () => (minDate ? formatForInput(minDate, inputType) : undefined),
    [minDate, inputType]
  );
  const max = useMemo(
    () => (maxDate ? formatForInput(maxDate, inputType) : undefined),
    [maxDate, inputType]
  );

  const borderColor = hasError
    ? '#EF4444' // red-500
    : isFocused
      ? '#3B82F6' // blue-500
      : '#D1D5DB'; // gray-300

  const backgroundColor = disabled ? '#F3F4F6' : '#FFFFFF'; // gray-100 / white
  const color = disabled ? '#6B7280' : '#111827'; // gray-500 / gray-900

  return (
    <input
      type={HTML_INPUT_TYPE[inputType]}
      value={inputValue}
      onChange={event =>
        onChange(parseInputValue(event.target.value, inputType))
      }
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={disabled}
      placeholder={placeholder}
      min={min}
      max={max}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor,
        borderRadius: 8,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 8,
        fontSize: 16,
        lineHeight: '20px',
        backgroundColor,
        color,
        outline: 'none',
        fontFamily: 'inherit',
      }}
    />
  );
}
