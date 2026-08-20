import PlayerImportSectionLayout from '@/components/players/PlayerImportSectionLayout';
import React from 'react';

export default function ImportPlayersLayout() {
  return (
    <PlayerImportSectionLayout
      sectionSegment="import-players"
      importHref="/players/import-players"
      importsHref="/players/import-players/imports"
    />
  );
}
