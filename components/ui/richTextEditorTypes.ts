/**
 * Shared props for platform-specific RichTextEditor implementations.
 * Metro resolves `RichTextEditor.web.tsx` on web and `RichTextEditor.tsx` on native.
 */

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string | null;
  testID?: string;
};
