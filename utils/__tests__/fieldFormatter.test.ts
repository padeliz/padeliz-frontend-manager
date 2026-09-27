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
      fieldValue: 'Mara Lovelace',
      mode: 'form',
    });

    expect(result.isEditable).toBe(true);
    expect(result.inputValue).toBe('Mara Lovelace');
    expect(result.apiValue).toBe('Mara Lovelace');
    expect(result.inputType).toBe('text');
  });

  it('formats timestamp read-only fields instead of raw unix seconds', () => {
    const result = formatField({
      metadata: playerMetadata,
      fieldKey: 'inserted_at',
      fieldValue: 1_700_000_000,
      mode: 'display',
    });

    expect(result.isEditable).toBe(false);
    expect(result.inputType).toBe('readonly');
    expect(result.label).toBe('Created At');
    expect(result.formattedText).not.toBe('1700000000');
    expect(result.formattedText.length).toBeGreaterThan(0);
  });

  it('maps string enum fields to select with constraints.enum in form mode', () => {
    const metadata = {
      ...playerMetadata,
      swagger_schema: {
        ...playerMetadata.swagger_schema,
        properties: {
          ...playerMetadata.swagger_schema.properties,
          review_status: {
            title: 'Review Status',
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'discarded'],
          },
        },
      },
    };

    const result = formatField({
      metadata,
      fieldKey: 'review_status',
      fieldValue: 'pending',
      mode: 'form',
    });

    expect(result.inputType).toBe('select');
    expect(result.constraints.enum).toEqual([
      'pending',
      'approved',
      'rejected',
      'discarded',
    ]);
    expect(result.inputValue).toBe('pending');
    expect(result.apiValue).toBe('pending');
  });

  it('maps null enum fields to select with constraints.enum in form mode', () => {
    const metadata = {
      ...playerMetadata,
      swagger_schema: {
        ...playerMetadata.swagger_schema,
        properties: {
          ...playerMetadata.swagger_schema.properties,
          gender: {
            title: 'Gender',
            type: 'string',
            nullable: true,
            enum: ['MALE', 'FEMALE'],
          },
        },
      },
    };

    const result = formatField({
      metadata,
      fieldKey: 'gender',
      fieldValue: null,
      mode: 'form',
    });

    expect(result.inputType).toBe('select');
    expect(result.constraints.enum).toEqual(['MALE', 'FEMALE']);
    expect(result.inputValue).toBe('');
    expect(result.apiValue).toBeNull();
  });
});
