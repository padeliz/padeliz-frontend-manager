/**
 * @jest-environment jsdom
 */
import ManagerFileUpload from '@/components/ui/ManagerFileUpload';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({
    granted: true,
  })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images', All: 'All' },
}));

jest.mock('@/services/api/managerUploadApi', () => ({
  managerUploadApi: {
    upload: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('ManagerFileUpload', () => {
  it('renders upload control for web-style pending mode', () => {
    render(
      <ManagerFileUpload
        label="Proofs"
        config={{
          mode: 'multi',
          max_files: 3,
          max_size_kb: 30720,
          accept: ['image/jpeg', 'application/pdf'],
          form_field: 'file',
          upload: {
            method: 'POST',
            path: '/api/v1/manager/players/{id}/profile-images',
          },
          delete: {
            method: 'DELETE',
            path: '/api/v1/manager/players/{id}/profile-images/{childId}',
          },
        }}
        pendingFiles={[]}
        onPendingChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('manager-file-upload')).toBeTruthy();
    expect(screen.getByText('Select file')).toBeTruthy();
  });
});
