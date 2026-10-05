import { isRichTextField } from '@/utils/richtextMetadata';

describe('isRichTextField', () => {
  it('detects x-padeliz-richtext and nested x.padeliz-richtext', () => {
    expect(isRichTextField({ 'x-padeliz-richtext': true })).toBe(true);
    expect(isRichTextField({ x: { 'padeliz-richtext': true } })).toBe(true);
    expect(isRichTextField({ type: 'string' })).toBe(false);
    expect(isRichTextField(null)).toBe(false);
  });
});
