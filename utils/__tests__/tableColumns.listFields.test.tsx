import React from 'react';
import { render } from '@testing-library/react-native';
import { generateColumnsFromMetadata } from '@/utils/tableColumns';

describe('tableColumns list_fields and images', () => {
  const registrationMetadata: any = {
    display_field: null,
    list_fields: [
      'player.profile_image_url',
      'player_user_id',
      'event_division_id',
    ],
    swagger_schema: {
      required: ['event_id', 'player_user_id', 'payment'],
      properties: {
        id_registration: {
          type: 'integer',
          format: 'int64',
          readOnly: true,
          title: 'ID',
        },
        event_id: {
          type: 'integer',
          title: 'Event',
        },
        player_user_id: {
          type: 'integer',
          title: 'Player',
        },
        player: {
          oneOf: [{ $ref: '#/components/schemas/User' }, { type: 'null' }],
        },
        event_division_id: {
          type: 'integer',
          nullable: true,
          title: 'Event Division',
        },
        event_division: {
          oneOf: [
            { $ref: '#/components/schemas/EventDivision' },
            { type: 'null' },
          ],
        },
        is_minor: { type: 'boolean', title: 'Minor' },
        payment: { type: 'integer', title: 'Payment' },
      },
    },
    filterable_fields: {
      player_user_id: {
        type: 'foreign_key',
        related_schema_name: 'User',
      },
      event_division_id: {
        type: 'foreign_key',
        related_schema_name: 'EventDivision',
      },
    },
    sortable_fields: ['id_registration', 'player_user_id', 'payment'],
    searchable_fields: [],
  };

  const playerMetadata: any = {
    display_field: 'name',
    list_fields: [],
    swagger_schema: {
      properties: {
        id_user: { type: 'integer', readOnly: true, title: 'ID' },
        name: { type: 'string', readOnly: true, title: 'Name' },
        profile_image_url: {
          type: 'string',
          format: 'uri',
          readOnly: true,
          title: 'Profile Image',
          'x-padeliz-image': { role: 'list' },
        },
      },
    },
    filterable_fields: {},
    sortable_fields: [],
    searchable_fields: [],
    resource_path: 'players',
  };

  it('orders PK then list_fields then leftovers', () => {
    const columns = generateColumnsFromMetadata(registrationMetadata, {
      excludeFields: ['event_id'],
      linkedResourcesMetadata: {
        User: playerMetadata,
        EventDivision: {
          display_field: 'division_title',
          swagger_schema: {
            properties: {
              id_event_division: { type: 'integer', readOnly: true },
              division_title: { type: 'string' },
            },
          },
          filterable_fields: {},
          sortable_fields: [],
          searchable_fields: [],
          list_fields: [],
        },
      },
    });

    expect(columns.map(c => c.key)).toEqual([
      'id_registration',
      'player.profile_image_url',
      'player',
      'event_division',
      'payment',
      'is_minor',
    ]);
  });

  it('maps player_user_id list_fields entry to linked column key player', () => {
    const columns = generateColumnsFromMetadata(registrationMetadata, {
      linkedResourcesMetadata: { User: playerMetadata },
    });
    expect(columns.find(c => c.key === 'player')).toBeTruthy();
    expect(columns.find(c => c.key === 'player_user_id')).toBeFalsy();
  });

  it('creates dotted image column that renders Image or dash', () => {
    const columns = generateColumnsFromMetadata(registrationMetadata, {
      linkedResourcesMetadata: { User: playerMetadata },
    });
    const imgCol = columns.find(c => c.key === 'player.profile_image_url');
    expect(imgCol?.type).toBe('image');
    expect(imgCol?.render).toBeTruthy();

    const dash = render(
      <>{imgCol!.render!({ player: { profile_image_url: null } }, 0)}</>
    );
    expect(dash.getByText('-')).toBeTruthy();

    const withImage = render(
      <>
        {imgCol!.render!(
          { player: { profile_image_url: 'https://cdn.example/a.png' } },
          0
        )}
      </>
    );
    expect(withImage.getByLabelText('Profile Image')).toBeTruthy();

    const video = render(
      <>
        {imgCol!.render!(
          { player: { profile_image_url: 'https://cdn.example/a.mp4' } },
          0
        )}
      </>
    );
    expect(video.getByText('-')).toBeTruthy();
  });

  it('omits readOnly image unless in list_fields', () => {
    const columns = generateColumnsFromMetadata(
      {
        ...playerMetadata,
        list_fields: [],
      },
      {}
    );
    expect(columns.find(c => c.key === 'profile_image_url')).toBeFalsy();
  });

  it('includes readOnly image when in list_fields', () => {
    const columns = generateColumnsFromMetadata(
      {
        ...playerMetadata,
        list_fields: ['profile_image_url'],
      },
      {}
    );
    expect(columns.find(c => c.key === 'profile_image_url')?.type).toBe(
      'image'
    );
  });

  it('excludeFields drops columns under list_fields ordering', () => {
    const columns = generateColumnsFromMetadata(registrationMetadata, {
      excludeFields: ['event_id', 'player.profile_image_url'],
      linkedResourcesMetadata: { User: playerMetadata },
    });
    expect(columns.map(c => c.key)).not.toContain('player.profile_image_url');
    expect(columns.map(c => c.key)[0]).toBe('id_registration');
  });

  it('uses legacy order when list_fields empty', () => {
    const columns = generateColumnsFromMetadata(
      {
        display_field: 'name',
        list_fields: [],
        swagger_schema: {
          required: ['first_name'],
          properties: {
            id_user: { type: 'integer', readOnly: true, title: 'ID' },
            name: { type: 'string', readOnly: true, title: 'Name' },
            first_name: { type: 'string', title: 'First name' },
            zebra: { type: 'string', title: 'Zebra' },
          },
        },
        filterable_fields: {},
        sortable_fields: [],
        searchable_fields: [],
      },
      {}
    );
    expect(columns.map(c => c.key)).toEqual([
      'id_user',
      'name',
      'first_name',
      'zebra',
    ]);
  });

  it('supports Prize-style own-field url image column', () => {
    const columns = generateColumnsFromMetadata(
      {
        display_field: 'name',
        list_fields: ['url'],
        swagger_schema: {
          properties: {
            id_prize: { type: 'integer', readOnly: true, title: 'ID' },
            name: { type: 'string', title: 'Name' },
            url: {
              type: 'string',
              readOnly: true,
              title: 'Media URL',
              'x-padeliz-image': { role: 'list' },
            },
          },
        },
        filterable_fields: {},
        sortable_fields: [],
        searchable_fields: [],
      },
      {}
    );
    expect(columns.map(c => c.key)).toEqual(['id_prize', 'url', 'name']);
    expect(columns.find(c => c.key === 'url')?.type).toBe('image');
  });
});
