import { normalizeSearchText } from '@/utils/textNormalize';

describe('normalizeSearchText', () => {
  it('folds diacritics and lowercases', () => {
    expect(normalizeSearchText('  Ștefan  ')).toBe('stefan');
    expect(normalizeSearchText('București')).toBe('bucuresti');
  });
});
