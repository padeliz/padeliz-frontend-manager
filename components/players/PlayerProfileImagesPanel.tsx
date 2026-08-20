/**
 * Player profile images gallery with upload, delete, and PDF primary selection.
 */

import ImageFilesPicker from '@/components/players/ImageFilesPicker';
import { useToast } from '@/context/ToastContext';
import { queryKeys } from '@/lib/queryClient';
import { PlayersApiService } from '@/services/api/playersApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

const playersApi = new PlayersApiService();

type Props = {
  playerId: number;
};

export default function PlayerProfileImagesPanel({ playerId }: Props) {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const playerQuery = useQuery({
    queryKey: queryKeys.resourceDetail('Player', playerId),
    queryFn: async () => {
      const res = await playersApi.getPlayer(playerId);
      return res.data;
    },
    enabled: Number.isFinite(playerId),
  });

  const images = playerQuery.data?.uploaded_profile_images ?? [];
  const maxImages = 3;

  const refresh = useCallback(async () => {
    await playerQuery.refetch();
    await queryClient.invalidateQueries({ queryKey: queryKeys.playersPicker() });
  }, [playerQuery, queryClient]);

  const onUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || Platform.OS !== 'web') return;
      if (images.length >= maxImages) {
        showError('Upload failed', `Maximum ${maxImages} profile images allowed.`);
        return;
      }
      setBusy(true);
      try {
        for (const file of files.slice(0, maxImages - images.length)) {
          await playersApi.uploadProfileImage(playerId, file);
        }
        showSuccess('Uploaded', 'Profile image uploaded');
        await refresh();
      } catch (err: any) {
        showError('Upload failed', err?.message || 'Could not upload image');
      } finally {
        setBusy(false);
      }
    },
    [images.length, maxImages, playerId, refresh, showError, showSuccess]
  );

  const onDelete = useCallback(
    async (imageId: number) => {
      setBusy(true);
      try {
        await playersApi.deleteProfileImage(playerId, imageId);
        showSuccess('Deleted', 'Profile image removed');
        await refresh();
      } catch (err: any) {
        showError('Delete failed', err?.message || 'Could not delete image');
      } finally {
        setBusy(false);
      }
    },
    [playerId, refresh, showError, showSuccess]
  );

  const onSetPdfPrimary = useCallback(
    async (imageId: number) => {
      setBusy(true);
      try {
        await playersApi.setProfileImagePdfPrimary(playerId, imageId);
        showSuccess('Updated', 'PDF primary image updated');
        await refresh();
      } catch (err: any) {
        showError('Update failed', err?.message || 'Could not set PDF primary');
      } finally {
        setBusy(false);
      }
    },
    [playerId, refresh, showError, showSuccess]
  );

  if (playerQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8" testID="player-profile-images-loading">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (playerQuery.isError || !playerQuery.data) {
    return (
      <View className="flex-1 p-4" testID="player-profile-images-error">
        <Text className="text-red-600">Could not load player profile images.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-4" testID="player-profile-images-panel">
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 mb-2">
          Profile images ({images.length}/{maxImages})
        </Text>
        <Text className="text-sm text-gray-600 mb-3">
          Choose which image is used in PDF posters, lottery, and schedule board.
        </Text>
        <ImageFilesPicker
          onFiles={onUpload}
          disabled={busy || images.length >= maxImages}
          label={
            images.length >= maxImages
              ? 'Maximum images reached'
              : 'Add profile image'
          }
        />
      </View>

      <View className="flex-row flex-wrap gap-4">
        {images.map(img => (
          <View
            key={img.id}
            testID={`player-profile-image-${img.id}`}
            className="border border-gray-200 rounded-lg p-3 items-center bg-white"
          >
            <Image
              source={{ uri: img.url }}
              style={{ width: 96, height: 96, borderRadius: 8 }}
            />
            <Pressable
              testID={`player-profile-image-pdf-${img.id}`}
              disabled={busy || img.is_pdf_primary}
              onPress={() => void onSetPdfPrimary(img.id)}
              className={`mt-2 px-2 py-1 rounded ${
                img.is_pdf_primary ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  img.is_pdf_primary ? 'text-blue-700' : 'text-gray-700'
                }`}
              >
                {img.is_pdf_primary ? 'PDF source' : 'Use in PDFs'}
              </Text>
            </Pressable>
            <Pressable
              testID={`player-profile-image-delete-${img.id}`}
              disabled={busy}
              onPress={() => void onDelete(img.id)}
              className="mt-2 px-2 py-1 rounded bg-red-50"
            >
              <Text className="text-xs text-red-700">Delete</Text>
            </Pressable>
            {img.original_filename ? (
              <Text className="text-[10px] text-gray-500 mt-1 max-w-[120px] text-center">
                {img.original_filename}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      {images.length === 0 ? (
        <Text className="text-gray-500 mt-4">No profile images yet.</Text>
      ) : null}
    </ScrollView>
  );
}
