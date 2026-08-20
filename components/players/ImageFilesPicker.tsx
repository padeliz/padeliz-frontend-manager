import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export type PickedImageFile = {
  uri: string;
  name: string;
  mimeType: string;
  file?: File;
};

type Props = {
  onFiles: (files: PickedImageFile[]) => void;
  disabled?: boolean;
  label?: string | null;
};

function fromWebFile(file: File): PickedImageFile {
  return {
    uri: URL.createObjectURL(file),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    file,
  };
}

export default function ImageFilesPicker({
  onFiles,
  disabled = false,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pickWeb = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const pickNative = async () => {
    if (disabled) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const assets = result.assets ?? [];
      if (assets.length === 0) {
        return;
      }

      onFiles(
        assets.map(asset => ({
          uri: asset.uri,
          name: asset.name ?? asset.uri.split('/').pop() ?? 'image.jpg',
          mimeType: asset.mimeType ?? 'image/jpeg',
        }))
      );
    } catch {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const assets = result.assets ?? [];
      onFiles(
        assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName ?? asset.uri.split('/').pop() ?? 'image.jpg',
          mimeType: asset.mimeType ?? 'image/jpeg',
        }))
      );
    }
  };

  const pick = () => {
    if (Platform.OS === 'web') {
      pickWeb();
      return;
    }
    void pickNative();
  };

  return (
    <View testID="image-files-picker" className="flex-row items-center gap-2">
      {Platform.OS === 'web' ? (
        <input
          ref={inputRef as any}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={event => {
            const list = event.target.files;
            if (list && list.length > 0) {
              onFiles(Array.from(list).map(fromWebFile));
            }
            event.target.value = '';
          }}
        />
      ) : null}
      <Pressable
        testID="image-files-picker-button"
        disabled={disabled}
        onPress={pick}
        className={`px-3 py-2 rounded-lg ${disabled ? 'bg-gray-300' : 'bg-blue-600'}`}
      >
        <Text className="text-white text-sm font-medium">Choose images</Text>
      </Pressable>
      <Text testID="image-files-label" className="text-sm text-gray-600">
        {label || 'No files selected'}
      </Text>
    </View>
  );
}
