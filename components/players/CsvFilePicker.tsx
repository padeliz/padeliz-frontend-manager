import React, { useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
  filename?: string | null;
};

export default function CsvFilePicker({
  onFile,
  disabled = false,
  filename,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = () => {
    if (disabled) return;
    if (Platform.OS === 'web') {
      inputRef.current?.click();
      return;
    }
  };

  return (
    <View className="flex-row items-center gap-2">
      {Platform.OS === 'web' ? (
        <input
          ref={inputRef as any}
          testID="csv-file-picker"
          type="file"
          accept=".csv,text/csv"
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
      ) : null}
      <Pressable
        testID="csv-file-picker-button"
        disabled={disabled}
        onPress={pick}
        className={`px-3 py-2 rounded-lg ${disabled ? 'bg-gray-300' : 'bg-blue-600'}`}
      >
        <Text className="text-white text-sm font-medium">Choose CSV</Text>
      </Pressable>
      <Text testID="csv-filename" className="text-sm text-gray-600">
        {filename || 'No file selected'}
      </Text>
    </View>
  );
}
