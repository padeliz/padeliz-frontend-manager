import PlayerImportSectionLayout from '@/components/players/PlayerImportSectionLayout';
import React from 'react';

export default function ImportProfileImagesLayout() {
  return (
    <PlayerImportSectionLayout
      sectionSegment="import-profile-images"
      importHref="/players/import-profile-images"
      importsHref="/players/import-profile-images/imports"
    />
  );
}
