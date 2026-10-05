/**
 * RichTextEditor (native)
 *
 * iOS/Android HTML editor via pell + react-native-webview.
 * Web uses `RichTextEditor.web.tsx` (TipTap), which Metro resolves automatically
 * so WebView is never loaded in the web bundle.
 */

import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  actions,
  RichEditor,
  RichToolbar,
} from 'react-native-pell-rich-editor';
import type { RichTextEditorProps } from './richTextEditorTypes';

export type { RichTextEditorProps } from './richTextEditorTypes';

export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = 'Enter description',
  error,
  testID = 'richtext-editor',
}: RichTextEditorProps) {
  const editorRef = useRef<RichEditor>(null);

  return (
    <View testID={testID} className="w-full">
      {!disabled ? (
        <RichToolbar
          editor={editorRef}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.insertLink,
          ]}
          style={{
            backgroundColor: '#f3f4f6',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: error ? '#ef4444' : '#d1d5db',
          }}
        />
      ) : null}
      <View
        className={`border rounded-b-lg overflow-hidden ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100' : 'bg-white'}`}
        style={{
          borderTopLeftRadius: disabled ? 8 : 0,
          borderTopRightRadius: disabled ? 8 : 0,
          minHeight: 160,
        }}
      >
        <RichEditor
          ref={editorRef}
          initialContentHTML={value || ''}
          onChange={html => onChange(html ?? '')}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          style={{ minHeight: 160 }}
          editorStyle={{
            backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
            color: '#111827',
            placeholderColor: '#9ca3af',
            contentCSSText: 'font-size:16px;font-family:sans-serif;',
          }}
          useContainer
        />
      </View>
      {disabled ? null : (
        <Pressable
          onPress={() => editorRef.current?.focusContentEditor()}
          accessibilityRole="button"
          className="mt-1"
        >
          <Text className="text-xs text-gray-500">
            Bold, italic, lists, and links
          </Text>
        </Pressable>
      )}
    </View>
  );
}
