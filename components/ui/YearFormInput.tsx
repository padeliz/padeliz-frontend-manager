/**
 * Cross-platform year picker — integer year for API.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export type YearFormInputProps = {
  value: number | string | null | undefined;
  onChange: (year: number | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  error?: string | null;
  placeholder?: string;
};

export default function YearFormInput({
  value,
  onChange,
  onBlur,
  disabled = false,
  min = 1900,
  max = 9999,
  error,
  placeholder = 'Select year',
}: YearFormInputProps) {
  const [open, setOpen] = React.useState(false);
  const currentYear = new Date().getFullYear();
  const upper = Math.min(max, currentYear + 1);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = upper; y >= min; y--) list.push(y);
    return list;
  }, [min, upper]);

  const numeric =
    value === null || value === undefined || value === ''
      ? null
      : Number(value);

  return (
    <View>
      <Pressable
        disabled={disabled}
        onPress={() => {
          if (!disabled) setOpen(o => !o);
        }}
        onBlur={onBlur}
        className={`border rounded-lg px-3 py-2 min-h-[44px] justify-center ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100' : 'bg-white'}`}
      >
        <Text
          className={
            numeric != null && !Number.isNaN(numeric)
              ? 'text-gray-900 text-base'
              : 'text-gray-400 text-base'
          }
        >
          {numeric != null && !Number.isNaN(numeric)
            ? String(numeric)
            : placeholder}
        </Text>
      </Pressable>

      {open && !disabled && (
        <View className="mt-1 border border-gray-300 rounded-lg bg-white max-h-48">
          <ScrollView className="max-h-48">
            <Pressable
              onPress={() => {
                onChange(null);
                setOpen(false);
                onBlur?.();
              }}
              className="px-3 py-2 border-b border-gray-100"
            >
              <Text className="text-gray-500">Clear</Text>
            </Pressable>
            {years.map(y => (
              <Pressable
                key={y}
                onPress={() => {
                  onChange(y);
                  setOpen(false);
                  onBlur?.();
                }}
                className={`px-3 py-2 border-b border-gray-100 ${
                  numeric === y ? 'bg-blue-50' : ''
                }`}
              >
                <Text
                  className={
                    numeric === y
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-900'
                  }
                >
                  {y}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {error ? (
        <Text className="text-sm text-red-600 mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
