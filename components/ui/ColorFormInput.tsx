/**
 * Cross-platform color form input (web / iOS / Android).
 * Swatch + hex field + hue/saturation panel. Emits uppercase #RRGGBB.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

const HUE_STOPS = [
  '#FF0000',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#0000FF',
  '#FF00FF',
  '#FF0000',
];

export type ColorFormInputProps = {
  value: string;
  onChange: (hex: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string | null;
};

export default function ColorFormInput({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = '#RRGGBB',
  error,
}: ColorFormInputProps) {
  const [open, setOpen] = useState(false);
  const normalized = useMemo(() => {
    const rgb = hexToRgb(value || '');
    return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : '';
  }, [value]);

  const hsv = useMemo(() => {
    const rgb = hexToRgb(normalized || '#FF0000');
    if (!rgb) return { h: 0, s: 1, v: 1 };
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  }, [normalized]);

  const emit = useCallback(
    (hex: string) => {
      const rgb = hexToRgb(hex);
      if (rgb) onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    },
    [onChange]
  );

  const setFromHsv = useCallback(
    (h: number, s: number, v: number) => {
      const rgb = hsvToRgb(h, s, v);
      onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    },
    [onChange]
  );

  return (
    <View>
      <View className="flex-row items-center gap-2">
        <Pressable
          disabled={disabled}
          onPress={() => setOpen(o => !o)}
          className="w-10 h-10 rounded border border-gray-300"
          style={{ backgroundColor: normalized || '#FFFFFF' }}
        />
        <TextInput
          value={normalized || value || ''}
          onChangeText={text => {
            const t = text.startsWith('#') ? text : `#${text}`;
            onChange(t.toUpperCase());
          }}
          onBlur={onBlur}
          editable={!disabled}
          placeholder={placeholder}
          autoCapitalize="characters"
          className={`flex-1 border rounded-lg px-3 py-2 text-base ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}`}
        />
      </View>

      {open && !disabled && (
        <View className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <Text className="text-xs text-gray-600 mb-2">Hue</Text>
          <View className="flex-row h-8 rounded overflow-hidden mb-3">
            {HUE_STOPS.slice(0, -1).map((color, i) => (
              <Pressable
                key={color + i}
                className="flex-1"
                style={{ backgroundColor: color }}
                onPress={() => setFromHsv((i / 6) * 360, hsv.s || 1, hsv.v || 1)}
              />
            ))}
          </View>
          <Text className="text-xs text-gray-600 mb-2">Saturation / Brightness</Text>
          <View className="flex-row flex-wrap gap-1">
            {[1, 0.75, 0.5, 0.25].map(s =>
              [1, 0.75, 0.5, 0.25].map(v => {
                const rgb = hsvToRgb(hsv.h, s, v);
                const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                return (
                  <Pressable
                    key={`${s}-${v}`}
                    onPress={() => setFromHsv(hsv.h, s, v)}
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: hex }}
                  />
                );
              })
            )}
          </View>
          <Pressable onPress={() => setOpen(false)} className="mt-3">
            <Text className="text-blue-600 text-sm text-center">Done</Text>
          </Pressable>
        </View>
      )}

      {error ? (
        <Text className="text-sm text-red-600 mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
