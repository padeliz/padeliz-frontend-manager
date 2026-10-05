/**
 * RichTextEditor (web)
 *
 * TipTap / ProseMirror editor for the browser. Metro resolves this file on web
 * so `react-native-webview` / pell are not part of the web bundle.
 *
 * Allowed markup matches the backend sanitizer allowlist:
 * p, br, strong/b, em/i, ul, ol, li, a[href].
 */

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { Fragment, useEffect } from 'react';
import type { RichTextEditorProps } from './richTextEditorTypes';

export type { RichTextEditorProps } from './richTextEditorTypes';

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

function ToolbarButton({ label, active, disabled, onPress, testID }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      data-testid={testID}
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: active ? '#d1d5db' : 'transparent',
        opacity: disabled ? 0.4 : 1,
        fontSize: 14,
        fontWeight: 600,
        color: '#1f2937',
      }}
    >
      {label}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = 'Enter description',
  error,
  testID = 'richtext-editor',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'richtext-prosemirror',
        'data-testid': `${testID}-content`,
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current) {
      editor.commands.setContent(next, false);
    }
  }, [value, editor]);

  const insertLink = () => {
    if (!editor || disabled) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter link URL', previous ?? 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  const borderColor = error ? '#ef4444' : '#d1d5db';

  return (
    <Fragment>
      <style>{`
        .richtext-prosemirror {
          min-height: 160px;
          padding: 12px;
          outline: none;
          font-size: 16px;
          font-family: system-ui, sans-serif;
          color: #111827;
        }
        .richtext-prosemirror p { margin: 0 0 0.5em; }
        .richtext-prosemirror ul,
        .richtext-prosemirror ol {
          margin: 0 0 0.5em;
          padding-left: 1.25rem;
        }
        .richtext-prosemirror a {
          color: #2563eb;
          text-decoration: underline;
        }
        .richtext-prosemirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
      `}</style>

      <div data-testid={testID} style={{ width: '100%' }}>
        {!disabled && editor ? (
          <div
            data-testid={`${testID}-toolbar`}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 4,
              borderWidth: 1,
              borderStyle: 'solid',
              borderBottomWidth: 0,
              borderColor,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
            }}
          >
            <ToolbarButton
              label="B"
              testID={`${testID}-bold`}
              active={editor.isActive('bold')}
              onPress={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              label="I"
              testID={`${testID}-italic`}
              active={editor.isActive('italic')}
              onPress={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              label="• List"
              testID={`${testID}-bullet-list`}
              active={editor.isActive('bulletList')}
              onPress={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              label="1. List"
              testID={`${testID}-ordered-list`}
              active={editor.isActive('orderedList')}
              onPress={() => editor.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarButton
              label="Link"
              testID={`${testID}-link`}
              active={editor.isActive('link')}
              onPress={insertLink}
            />
          </div>
        ) : null}

        <div
          style={{
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            borderTopLeftRadius: disabled ? 8 : 0,
            borderTopRightRadius: disabled ? 8 : 0,
            minHeight: 160,
            overflow: 'hidden',
            backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {disabled ? null : (
          <p style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
            Bold, italic, lists, and links
          </p>
        )}
      </div>
    </Fragment>
  );
}
