/**
 * @jest-environment jsdom
 */
import ImageFilesPicker from '@/components/players/ImageFilesPicker';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

const mockGetDocumentAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

describe('ImageFilesPicker', () => {
  beforeEach(() => {
    Platform.OS = 'web';
    mockGetDocumentAsync.mockReset();
    mockLaunchImageLibraryAsync.mockReset();
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  });

  it('places testID on the wrapper view, not the hidden input', () => {
    const { getByTestId } = render(
      <ImageFilesPicker onFiles={jest.fn()} label="2 files" />
    );

    const wrapper = getByTestId('image-files-picker');
    expect(wrapper).toBeTruthy();
    expect(wrapper.props.testID).toBe('image-files-picker');
  });

  it('keeps the button testID on the pressable', () => {
    const { getByTestId } = render(
      <ImageFilesPicker onFiles={jest.fn()} label="2 files" />
    );

    expect(getByTestId('image-files-picker-button')).toBeTruthy();
  });

  it('native document picker path returns picked files', async () => {
    Platform.OS = 'ios';
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }],
    });

    const onFiles = jest.fn();
    const { getByTestId } = render(<ImageFilesPicker onFiles={onFiles} />);

    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() =>
      expect(onFiles).toHaveBeenCalledWith([
        expect.objectContaining({ uri: 'file:///a.jpg', name: 'a.jpg' }),
      ])
    );
  });

  it('native image picker fallback runs when document picker module errors', async () => {
    Platform.OS = 'android';
    mockGetDocumentAsync.mockRejectedValue(new Error('module missing'));
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///b.jpg', fileName: 'b.jpg', mimeType: 'image/jpeg' }],
    });

    const onFiles = jest.fn();
    const { getByTestId } = render(<ImageFilesPicker onFiles={onFiles} />);

    fireEvent.press(getByTestId('image-files-picker-button'));

    await waitFor(() =>
      expect(onFiles).toHaveBeenCalledWith([
        expect.objectContaining({ uri: 'file:///b.jpg', name: 'b.jpg' }),
      ])
    );
  });
});
