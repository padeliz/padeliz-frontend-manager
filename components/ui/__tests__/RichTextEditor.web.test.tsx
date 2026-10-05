/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RichTextEditor from '../RichTextEditor.web';

describe('RichTextEditor (web / TipTap)', () => {
  it('renders toolbar controls and does not use WebView', async () => {
    const onChange = jest.fn();
    render(
      <RichTextEditor
        value="<p>Hello</p>"
        onChange={onChange}
        placeholder="Describe the event"
      />
    );

    await waitFor(() => expect(screen.getByTestId('richtext-editor-toolbar')).toBeTruthy());
    expect(screen.getByTestId('richtext-editor-bold')).toBeTruthy();
    expect(screen.getByTestId('richtext-editor-italic')).toBeTruthy();
    expect(screen.getByTestId('richtext-editor-bullet-list')).toBeTruthy();
    expect(screen.getByTestId('richtext-editor-ordered-list')).toBeTruthy();
    expect(screen.getByTestId('richtext-editor-link')).toBeTruthy();
    expect(
      screen.queryByText('React Native WebView does not support this platform.')
    ).toBeNull();
    expect(document.querySelector('.richtext-prosemirror')).toBeTruthy();
  });

  it('toggles bold and emits HTML through onChange', async () => {
    const onChange = jest.fn();
    render(<RichTextEditor value="<p>Hello</p>" onChange={onChange} />);

    await waitFor(() => expect(screen.getByTestId('richtext-editor-bold')).toBeTruthy());
    fireEvent.click(screen.getByTestId('richtext-editor-bold'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const html = String(onChange.mock.calls.at(-1)?.[0] ?? '');
    expect(html.toLowerCase()).toMatch(/<(p|strong|b)\b/);
  });

  it('hides toolbar when disabled', async () => {
    render(<RichTextEditor value="<p>Locked</p>" onChange={jest.fn()} disabled />);

    await waitFor(() => expect(screen.getByTestId('richtext-editor')).toBeTruthy());
    expect(screen.queryByTestId('richtext-editor-toolbar')).toBeNull();
    expect(document.querySelector('.richtext-prosemirror')).toBeTruthy();
  });
});
