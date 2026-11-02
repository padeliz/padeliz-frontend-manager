import { playerMetadata } from '@/__tests__/fixtures/playerMetadata';
import ResourceFieldDisplay from '@/components/pages/ResourceFieldDisplay';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

describe('ResourceFieldDisplay', () => {
  it('renders label and value for an editable string field', () => {
    render(
      <ResourceFieldDisplay
        fieldKey="name"
        fieldValue="Mara Lovelace"
        metadata={playerMetadata}
      />
    );

    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Mara Lovelace')).toBeTruthy();
  });

  it('renders read-only primary key and timestamp fields', () => {
    const { rerender } = render(
      <ResourceFieldDisplay
        fieldKey="id_user"
        fieldValue={61}
        metadata={playerMetadata}
      />
    );

    expect(screen.getByText('ID')).toBeTruthy();
    expect(screen.getByText('61')).toBeTruthy();

    rerender(
      <ResourceFieldDisplay
        fieldKey="inserted_at"
        fieldValue={1_700_000_000}
        metadata={playerMetadata}
      />
    );

    expect(screen.getByText('Created At')).toBeTruthy();
  });

  it('does not render array relationship fields', () => {
    render(
      <ResourceFieldDisplay
        fieldKey="participations"
        fieldValue={[]}
        metadata={playerMetadata}
      />
    );

    expect(screen.queryByText('Participations')).toBeNull();
  });

  it('renders enum string array purposes as joined text', () => {
    const metadata = {
      ...playerMetadata,
      swagger_schema: {
        ...playerMetadata.swagger_schema,
        properties: {
          ...playerMetadata.swagger_schema.properties,
          purposes: {
            title: 'Purposes',
            type: 'array',
            items: { type: 'string', enum: ['contact', 'login'] },
          },
        },
      },
    };

    render(
      <ResourceFieldDisplay
        fieldKey="purposes"
        fieldValue={['contact', 'login']}
        metadata={metadata}
      />
    );

    expect(screen.getByText('Purposes')).toBeTruthy();
    expect(screen.getByText('contact, login')).toBeTruthy();
  });

  it('does not render excluded fields', () => {
    render(
      <ResourceFieldDisplay
        fieldKey="name"
        fieldValue="Mara Lovelace"
        metadata={playerMetadata}
        excludeFields={['name']}
      />
    );

    expect(screen.queryByText('Name')).toBeNull();
    expect(screen.queryByText('Mara Lovelace')).toBeNull();
  });
});
