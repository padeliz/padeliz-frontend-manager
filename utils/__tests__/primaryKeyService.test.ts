import { emptyMetadata, nullSwaggerMetadata, playerMetadata } from '@/__tests__/fixtures/playerMetadata';
import { PrimaryKeyService } from '@/utils/primaryKeyService';

describe('PrimaryKeyService', () => {
  describe('detectPrimaryKey', () => {
    it('detects id_user from Player-like metadata', () => {
      expect(PrimaryKeyService.detectPrimaryKey(playerMetadata)).toBe(
        'id_user'
      );
    });

    it('returns null for an empty schema', () => {
      expect(PrimaryKeyService.detectPrimaryKey(emptyMetadata)).toBeNull();
    });

    it('returns null when swagger_schema is null', () => {
      expect(PrimaryKeyService.detectPrimaryKey(nullSwaggerMetadata)).toBeNull();
    });
  });

  describe('extractId', () => {
    it('extracts the numeric primary key value', () => {
      expect(
        PrimaryKeyService.extractId({ id_user: 61, name: 'Mara' }, playerMetadata)
      ).toBe(61);
    });

    it('returns null when the primary key is missing on the item', () => {
      expect(
        PrimaryKeyService.extractId({ name: 'Mara' }, playerMetadata)
      ).toBeNull();
    });
  });
});
