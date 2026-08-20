import { FormFieldSchema } from '@/types/validation/schemas';
import {
    schemaToValidationRules,
    validateField,
    validateForm,
} from '@/utils/validationRules';

describe('validationRules', () => {
  const nameField: FormFieldSchema = {
    name: 'name',
    type: 'string',
    required: true,
    minLength: 2,
  };

  describe('schemaToValidationRules', () => {
    it('builds required and minLength rules from the field schema', () => {
      const rules = schemaToValidationRules(nameField);

      expect(rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'required' }),
          expect.objectContaining({ type: 'minLength', value: 2 }),
        ])
      );
    });
  });

  describe('validateField', () => {
    it('returns no errors for a valid value', () => {
      const rules = schemaToValidationRules(nameField);
      expect(validateField(nameField, 'Mara', rules)).toEqual([]);
    });

    it('returns required and minLength errors for invalid values', () => {
      const rules = schemaToValidationRules(nameField);

      expect(validateField(nameField, '', rules)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rule: 'required' }),
        ])
      );
      expect(validateField(nameField, 'A', rules)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rule: 'minLength' }),
        ])
      );
    });
  });

  describe('validateForm', () => {
    const schema = {
      properties: {
        name: { ...nameField },
        first_name: {
          name: 'first_name',
          type: 'string' as const,
          required: true,
        },
      },
    };

    it('returns isValid true when all values pass', () => {
      const result = validateForm(schema, {
        name: 'Mara Lovelace',
        first_name: 'Mara',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns field errors when values fail', () => {
      const result = validateForm(schema, {
        name: '',
        first_name: 'Mara',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', rule: 'required' }),
        ])
      );
    });
  });
});
