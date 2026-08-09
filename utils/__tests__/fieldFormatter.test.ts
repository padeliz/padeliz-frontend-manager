import { playerMetadata } from '@/__tests__/fixtures/playerMetadata';
import { formatField } from '@/utils/fieldFormatter';

describe('formatField', () => {
  it('marks read-only fields as non-editable with readonly input type', () => {
    const result = formatField({
      metadata: playerMetadata,
      fieldKey: 'id_player',
      fieldValue: 61,
      mode: 'form',
    });

    expect(result.isEditable).toBe(false);
    expect(result.inputType).toBe('readonly');
    expect(result.label).toBe('ID');
  });

  it('formats null display values as a dash', () => {
    const result = formatField({
      metadata: playerMetadata,
      fieldKey: 'name',
      fieldValue: null,
      mode: 'display',
    });

    expect(result.formattedText).toBe('-');
  });

  it('formats boolean values as Yes/No', () => {
    const yes = formatField({
      metadata: playerMetadata,
      fieldKey: 'being_student',
      fieldValue: true,
      mode: 'display',
    });
    const no = formatField({
      metadata: playerMetadata,
      fieldKey: 'being_student',
      fieldValue: false,
      mode: 'display',
    });

    expect(yes.formattedText).toBe('Yes');
    expect(no.formattedText).toBe('No');
  });

  it('keeps stable string inputValue and apiValue in form mode', () => {
    const result = formatField({
      metadata: playerMetadata,
      fieldKey: 'name',
      fieldValue: 'Ada Lovelace',
      mode: 'form',
    });

    expect(result.isEditable).toBe(true);
    expect(result.inputValue).toBe('Ada Lovelace');
    expect(result.apiValue).toBe('Ada Lovelace');
    expect(result.inputType).toBe('text');
  });

  it('marks timestamp read-only fields as non-editable without asserting relative prose', () => {
    const result = formatField({
      metadata: playerMetadata,
      fieldKey: 'inserted_at',
      fieldValue: 1_700_000_000,
      mode: 'display',
    });

    expect(result.isEditable).toBe(false);
    expect(result.inputType).toBe('readonly');
    expect(result.label).toBe('Created At');
    expect(typeof result.formattedText).toBe('string');
    expect(result.formattedText.length).toBeGreaterThan(0);
  });
});
