import { playerMetadata, emptyMetadata } from '@/__tests__/fixtures/playerMetadata';
import { PrimaryKeyService } from '@/utils/primaryKeyService';

describe('PrimaryKeyService', () => {
  describe('detectPrimaryKey', () => {
    it('detects id_player from Player-like metadata', () => {
      expect(PrimaryKeyService.detectPrimaryKey(playerMetadata)).toBe(
        'id_player'
      );
    });

    it('returns null for an empty schema', () => {
      expect(PrimaryKeyService.detectPrimaryKey(emptyMetadata)).toBeNull();
    });
  });

  describe('extractId', () => {
    it('extracts the numeric primary key value', () => {
      expect(
        PrimaryKeyService.extractId({ id_player: 61, name: 'Ada' }, playerMetadata)
      ).toBe(61);
    });

    it('returns null when the primary key is missing on the item', () => {
      expect(
        PrimaryKeyService.extractId({ name: 'Ada' }, playerMetadata)
      ).toBeNull();
    });
  });
});
