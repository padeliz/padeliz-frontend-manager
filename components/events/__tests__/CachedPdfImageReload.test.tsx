import CachedPdfImageReload from '@/components/events/CachedPdfImageReload';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

describe('CachedPdfImageReload', () => {
  it('renders the cached image and no reload control when the URL is present', () => {
    const onReload = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CachedPdfImageReload
        testIdPrefix="slot-1"
        imageUrl="https://example.com/a.png"
        onReload={onReload}
      />
    );
    expect(getByTestId('slot-1-present').props.style).toEqual(
      expect.objectContaining({ width: 36, height: 36, borderRadius: 18 })
    );
    expect(queryByTestId('slot-1-reload')).toBeNull();
  });

  it('honours size and borderRadius overrides', () => {
    const { getByTestId } = render(
      <CachedPdfImageReload
        testIdPrefix="slot-2"
        imageUrl="https://example.com/couple.png"
        size={48}
        borderRadius={4}
        onReload={jest.fn()}
      />
    );
    expect(getByTestId('slot-2-present').props.style).toEqual(
      expect.objectContaining({ width: 48, height: 48, borderRadius: 4 })
    );
  });

  it('shows a reload control with the error text when the URL is missing', () => {
    const onReload = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CachedPdfImageReload
        testIdPrefix="slot-3"
        imageUrl={null}
        errorReason="Generation failed."
        onReload={onReload}
      />
    );
    expect(queryByTestId('slot-3-present')).toBeNull();
    expect(getByTestId('slot-3-error')).toHaveTextContent('Generation failed.');
    fireEvent.press(getByTestId('slot-3-reload'));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('disables the control while spinning or explicitly disabled', () => {
    const onReload = jest.fn();
    const { getByTestId, rerender } = render(
      <CachedPdfImageReload
        testIdPrefix="slot-4"
        imageUrl={null}
        spinning
        onReload={onReload}
      />
    );
    expect(
      getByTestId('slot-4-reload').props.accessibilityState?.disabled
    ).toBe(true);

    rerender(
      <CachedPdfImageReload
        testIdPrefix="slot-4"
        imageUrl={null}
        disabled
        onReload={onReload}
      />
    );
    expect(
      getByTestId('slot-4-reload').props.accessibilityState?.disabled
    ).toBe(true);
    expect(getByTestId('slot-4-reload').props.style).toEqual(
      expect.objectContaining({ opacity: 0.4 })
    );
  });
});
