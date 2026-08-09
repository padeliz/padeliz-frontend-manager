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
        fieldValue="Ada"
        metadata={playerMetadata}
        onChange={onChange}
        onBlur={onBlur}
      />
    );

    expect(screen.getByText('Name')).toBeTruthy();

    const input = screen.getByDisplayValue('Ada');
    fireEvent.changeText(input, 'Ada Lovelace');
    expect(onChange).toHaveBeenCalledWith('name', 'Ada Lovelace');

    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledWith('name');
  });

  it('keeps read-only fields visible without calling onChange', () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();

    render(
      <ResourceFieldEdit
        fieldKey="id_player"
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

  it('does not render excluded fields', () => {
    render(
      <ResourceFieldEdit
        fieldKey="name"
        fieldValue="Ada"
        metadata={playerMetadata}
        onChange={jest.fn()}
        onBlur={jest.fn()}
        excludeFields={['name']}
      />
    );

    expect(screen.queryByText('Name')).toBeNull();
  });
});
