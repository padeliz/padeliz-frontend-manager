import { playerMetadata } from '@/__tests__/fixtures/playerMetadata';
import ResourceFieldEdit from '@/components/pages/ResourceFieldEdit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

describe('ResourceFieldEdit', () => {
  it('calls onChange and onBlur for an editable string field', () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();

    render(
      <ResourceFieldEdit
        fieldKey="name"
        fieldValue="Mara"
        metadata={playerMetadata}
        onChange={onChange}
        onBlur={onBlur}
      />
    );

    expect(screen.getByText('Name')).toBeTruthy();

    const input = screen.getByDisplayValue('Mara');
    fireEvent.changeText(input, 'Mara Lovelace');
    expect(onChange).toHaveBeenCalledWith('name', 'Mara Lovelace');

    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledWith('name');
  });

  it('keeps read-only fields visible without calling onChange', () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();

    render(
      <ResourceFieldEdit
        fieldKey="id_user"
        fieldValue={61}
        metadata={playerMetadata}
        onChange={onChange}
        onBlur={onBlur}
      />
    );

    expect(screen.getByText('ID')).toBeTruthy();
    expect(screen.getByText('61')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not render array relationship fields', () => {
    render(
      <ResourceFieldEdit
        fieldKey="participations"
        fieldValue={[]}
        metadata={playerMetadata}
        onChange={jest.fn()}
        onBlur={jest.fn()}
      />
    );

    expect(screen.queryByText('Participations')).toBeNull();
  });

  it('renders enum string array purposes as a multi-select control', () => {
    const metadata = {
      ...playerMetadata,
      swagger_schema: {
        ...playerMetadata.swagger_schema,
        required: ['purposes'],
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
      <ResourceFieldEdit
        fieldKey="purposes"
        fieldValue={['contact']}
        metadata={metadata}
        onChange={jest.fn()}
        onBlur={jest.fn()}
      />
    );

    expect(screen.getByText('Purposes')).toBeTruthy();
    expect(screen.getByText('contact')).toBeTruthy();
  });

  it('does not render excluded fields', () => {
    render(
      <ResourceFieldEdit
        fieldKey="name"
        fieldValue="Mara"
        metadata={playerMetadata}
        onChange={jest.fn()}
        onBlur={jest.fn()}
        excludeFields={['name']}
      />
    );

    expect(screen.queryByText('Name')).toBeNull();
  });
});
