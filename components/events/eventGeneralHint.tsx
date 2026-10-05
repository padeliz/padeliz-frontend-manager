import React from 'react';
import { Text } from 'react-native';

export const EDITION_GENERAL_EDIT_HINT =
  'Pick an event division above to edit.';

export function EventGeneralEditHint() {
  return (
    <Text
      testID="event-general-edit-hint"
      className="text-sm text-gray-600 mb-2"
    >
      {EDITION_GENERAL_EDIT_HINT}
    </Text>
  );
}
