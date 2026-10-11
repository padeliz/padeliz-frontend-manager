/**
 * @jest-environment jsdom
 */
import ManagerFileUpload from '@/components/ui/ManagerFileUpload';
import { ApiError } from '@/services/api/baseApi';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockRemove = jest.fn();
const mockUpload = jest.fn();

jest.mock('@/services/api/managerUploadApi', () => ({
  managerUploadApi: {
    upload: (...args: unknown[]) => mockUpload(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

const multiCoverConfig = {
  mode: 'multi' as const,
  max_files: 2,
  max_size_kb: 5120,
  accept: ['image/png'],
  form_field: 'file',
  required: true,
  upload: {
    method: 'POST',
    path: '/api/v1/manager/events/{id}/cover-images',
  },
  delete: {
    method: 'DELETE',
    path: '/api/v1/manager/events/{id}/cover-images/{childId}',
  },
};

describe('ManagerFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('surfaces API 422 when deleting the last cover image', async () => {
    mockRemove.mockRejectedValue(
      new ApiError(422, 'An event must keep at least one cover image.')
    );

    const { getByTestId, findByText } = render(
      <ManagerFileUpload
        label="Cover Images"
        config={multiCoverConfig}
        parentId={5}
        value={[{ id: 9, url: 'https://cdn.test/cover.png' }]}
        onChanged={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('manager-file-upload-delete-9'));

    expect(await findByText(/at least one cover/i)).toBeTruthy();
    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
