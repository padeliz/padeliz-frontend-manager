import { ApiResourceMetadata } from '@/types/api/metadata';

/**
 * Minimal Player-like metadata for unit/component tests.
 * Shaped after api-docs-v1.json Player schema (not a full copy).
 */
export const playerMetadata: ApiResourceMetadata = {
  version: '1.0.0',
  schema_name: 'Player',
  display_field: 'name',
  searchable_fields: ['name', 'first_name', 'last_name'],
  filterable_fields: {},
  sortable_fields: ['id_player', 'name'],
  request_body: {},
  swagger_schema: {
    required: ['name', 'first_name', 'last_name'],
    properties: {
      id_player: {
        title: 'ID',
        description: 'Unique Identifier',
        type: 'integer',
        format: 'int64',
        readOnly: true,
      },
      name: {
        title: 'Name',
        description: "Player's full name",
        type: 'string',
        maxLength: 250,
      },
      first_name: {
        title: 'First Name',
        description: "Player's first name",
        type: 'string',
        maxLength: 100,
      },
      being_student: {
        title: 'Student',
        description: 'Whether the player is a student',
        type: 'boolean',
      },
      inserted_at: {
        title: 'Created At',
        description: 'Timestamp when the player was created',
        type: 'integer',
        format: 'timestamp',
        readOnly: true,
      },
      updated_at: {
        title: 'Updated At',
        description: 'Timestamp when the player was last updated',
        type: 'integer',
        format: 'timestamp',
        readOnly: true,
        nullable: true,
      },
      participations: {
        title: 'Participations',
        description: 'Array of edition participations',
        type: 'array',
        items: {
          type: 'object',
        },
      },
    },
  },
};

export const emptyMetadata: ApiResourceMetadata = {
  version: '1.0.0',
  schema_name: 'Empty',
  searchable_fields: [],
  filterable_fields: {},
  sortable_fields: [],
  request_body: {},
  swagger_schema: {
    required: [],
    properties: {},
  },
};

export const nullSwaggerMetadata: ApiResourceMetadata = {
  version: '1.0.0',
  schema_name: 'Broken',
  searchable_fields: [],
  filterable_fields: {},
  sortable_fields: [],
  request_body: {},
  swagger_schema: null as unknown as ApiResourceMetadata['swagger_schema'],
};
