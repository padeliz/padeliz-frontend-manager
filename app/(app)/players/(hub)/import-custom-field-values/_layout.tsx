import PlayerImportSectionLayout from '@/components/players/PlayerImportSectionLayout';
import React from 'react';

export default function ImportCustomFieldValuesLayout() {
  return (
    <PlayerImportSectionLayout
      sectionSegment="import-custom-field-values"
      importHref="/players/import-custom-field-values"
      importsHref="/players/import-custom-field-values/imports"
    />
  );
}
