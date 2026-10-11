/**
 * Cross-platform Manager file upload control driven by x-padeliz-upload.
 */

import { managerUploadApi } from '@/services/api/managerUploadApi';
import {
  acceptsOnlyImages,
  acceptsPdf,
  PadelizUploadConfig,
  resolveUploadPath,
  toManagerEndpoint,
} from '@/utils/uploadMetadata';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

export type PendingUploadFile = {
  uri: string;
  name: string;
  mimeType: string;
  /** Web File object when available */
  file?: File;
};

type ExistingItem = { id?: number | string; url?: string | null } | string | null;

type Props = {
  label: string;
  config: PadelizUploadConfig;
  /** Known parent id for live upload/delete; omit for create pending mode */
  parentId?: number | null;
  /** Extra path vars e.g. eventDivision, poster */
  pathVars?: Record<string, string | number>;
  /** Current value: url string, or array of {id,url} */
  value?: ExistingItem | ExistingItem[];
  disabled?: boolean;
  /** Create mode: collect files locally */
  pendingFiles?: PendingUploadFile[];
  onPendingChange?: (files: PendingUploadFile[]) => void;
  /** After live upload/delete succeeds */
  onChanged?: () => void;
  error?: string;
};

function normalizeExisting(
  value: ExistingItem | ExistingItem[] | undefined,
  mode: 'single' | 'multi'
): Array<{ id?: number | string; url: string }> {
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    return value ? [{ url: value }] : [];
  }
  if (Array.isArray(value)) {
    return value
      .map(v => {
        if (typeof v === 'string') return v ? { url: v } : null;
        if (v && typeof v === 'object' && v.url) {
          return { id: v.id, url: String(v.url) };
        }
        return null;
      })
      .filter(Boolean) as Array<{ id?: number | string; url: string }>;
  }
  if (typeof value === 'object' && value.url) {
    return [{ id: value.id, url: String(value.url) }];
  }
  return [];
}

async function pickNativeFiles(
  config: PadelizUploadConfig
): Promise<PendingUploadFile[]> {
  if (acceptsPdf(config) && !acceptsOnlyImages(config)) {
    try {
      // Optional dependency — install expo-document-picker for PDF on native
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: config.accept,
        multiple: config.mode === 'multi',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return [];
      return result.assets.map(a => ({
        uri: a.uri,
        name: a.name || 'document',
        mimeType: a.mimeType || 'application/octet-stream',
      }));
    } catch {
      // Fall through to image picker if document picker missing
    }
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Media library permission is required to pick files.');
  }

  const hasVideo = config.accept.some(a => a.startsWith('video/'));
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: hasVideo
      ? ImagePicker.MediaTypeOptions.All
      : ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: config.mode === 'multi',
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName || `upload-${i}`,
    mimeType: a.mimeType || 'image/jpeg',
  }));
}

export default function ManagerFileUpload({
  label,
  config,
  parentId,
  pathVars = {},
  value,
  disabled = false,
  pendingFiles = [],
  onPendingChange,
  onChanged,
  error,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const existing = useMemo(
    () => normalizeExisting(value, config.mode),
    [value, config.mode]
  );
  const isLive = parentId != null && Number.isFinite(Number(parentId));
  const canAdd =
    !disabled &&
    (config.mode === 'multi'
      ? existing.length + pendingFiles.length < config.max_files
      : existing.length + pendingFiles.length < 1);

  const appendPending = (files: PendingUploadFile[]) => {
    if (!onPendingChange) return;
    if (config.mode === 'single') {
      onPendingChange(files.slice(0, 1));
      return;
    }
    const room = config.max_files - existing.length - pendingFiles.length;
    onPendingChange([...pendingFiles, ...files.slice(0, Math.max(0, room))]);
  };

  const uploadLive = async (files: PendingUploadFile[]) => {
    if (!isLive) {
      appendPending(files);
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      for (const f of files) {
        const form = new FormData();
        if (Platform.OS === 'web' && f.file) {
          form.append(config.form_field, f.file);
        } else {
          form.append(config.form_field, {
            uri: f.uri,
            name: f.name,
            type: f.mimeType,
          } as any);
        }
        const path = resolveUploadPath(config.upload.path, {
          id: parentId!,
          ...pathVars,
        });
        await managerUploadApi.upload(toManagerEndpoint(path), form);
      }
      onChanged?.();
    } catch (e: any) {
      setLocalError(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePick = async () => {
    if (!canAdd || busy) return;
    setLocalError(null);
    try {
      if (Platform.OS === 'web') {
        inputRef.current?.click();
        return;
      }
      const files = await pickNativeFiles(config);
      if (files.length) await uploadLive(files);
    } catch (e: any) {
      setLocalError(e?.message || 'Could not pick file');
    }
  };

  const handleWebChange = async (e: any) => {
    const list: FileList | undefined = e?.target?.files;
    if (!list?.length) return;
    const files: PendingUploadFile[] = Array.from(list).map((file: File) => ({
      uri: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      file,
    }));
    e.target.value = '';
    await uploadLive(files);
  };

  const handleDeleteExisting = async (item: {
    id?: number | string;
    url: string;
  }) => {
    if (!isLive || !config.delete?.path || disabled) return;
    if (item.id == null) return;
    setBusy(true);
    setLocalError(null);
    try {
      const path = resolveUploadPath(config.delete.path, {
        id: parentId!,
        childId: item.id,
        ...pathVars,
      });
      await managerUploadApi.remove(toManagerEndpoint(path));
      onChanged?.();
    } catch (e: any) {
      setLocalError(e?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const acceptAttr = config.accept.join(',');

  return (
    <View className="mb-4" testID="manager-file-upload">
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      <Text className="text-xs text-gray-500 mb-2">
        {config.mode === 'multi'
          ? `Up to ${config.max_files} files`
          : 'Single file'}{' '}
        · max {config.max_size_kb} KB
      </Text>

      {existing.map((item, idx) => (
        <View
          key={`ex-${item.id ?? idx}`}
          className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2"
        >
          <Text className="text-xs text-blue-700 flex-1 mr-2" numberOfLines={1}>
            {item.url}
          </Text>
          {isLive && config.delete?.path && item.id != null && !disabled && (
            <Pressable
              testID={
                item.id != null
                  ? `manager-file-upload-delete-${item.id}`
                  : undefined
              }
              onPress={() => void handleDeleteExisting(item)}
              className="px-2 py-1"
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </Pressable>
          )}
        </View>
      ))}

      {pendingFiles.map((f, idx) => (
        <View
          key={`pend-${idx}`}
          className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2"
        >
          <Text className="text-xs text-amber-900 flex-1" numberOfLines={1}>
            Pending: {f.name}
          </Text>
          {onPendingChange && (
            <Pressable
              onPress={() =>
                onPendingChange(pendingFiles.filter((_, i) => i !== idx))
              }
              className="px-2 py-1"
            >
              <Ionicons name="close" size={18} color="#b45309" />
            </Pressable>
          )}
        </View>
      ))}

      {canAdd && (
        <Pressable
          onPress={() => void handlePick()}
          disabled={busy || disabled}
          className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex-row items-center self-start"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={18} color="#2563eb" />
          )}
          <Text className="text-blue-700 text-sm ml-2">
            {isLive ? 'Upload file' : 'Select file'}
          </Text>
        </Pressable>
      )}

      {Platform.OS === 'web' && (
        // @ts-expect-error web-only input
        <input
          ref={inputRef as any}
          type="file"
          accept={acceptAttr}
          multiple={config.mode === 'multi'}
          style={{ display: 'none' }}
          onChange={handleWebChange}
        />
      )}

      {(error || localError) && (
        <Text className="text-red-600 text-xs mt-1">{error || localError}</Text>
      )}
    </View>
  );
}

/** Upload pending files after parent create (create-then-attach). */
export async function uploadPendingFiles(
  config: PadelizUploadConfig,
  parentId: number,
  files: PendingUploadFile[],
  pathVars: Record<string, string | number> = {}
): Promise<void> {
  for (const f of files) {
    const form = new FormData();
    if (Platform.OS === 'web' && f.file) {
      form.append(config.form_field, f.file);
    } else {
      form.append(config.form_field, {
        uri: f.uri,
        name: f.name,
        type: f.mimeType,
      } as any);
    }
    const path = resolveUploadPath(config.upload.path, {
      id: parentId,
      ...pathVars,
    });
    await managerUploadApi.upload(toManagerEndpoint(path), form);
  }
}
