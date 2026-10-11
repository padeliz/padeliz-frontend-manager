import { ApiResourceMetadata } from '@/types/api/metadata';

/** Minimal Event metadata for Manager form/timestamp tests. */
export const eventMetadata: ApiResourceMetadata = {
  version: '1.0.0',
  schema_name: 'Event',
  resource_path: 'events',
  display_field: 'name',
  searchable_fields: ['name'],
  filterable_fields: {},
  sortable_fields: ['event_starts_at', 'event_ends_at'],
  request_body: {},
  swagger_schema: {
    required: ['name', 'event_starts_at', 'event_ends_at'],
    properties: {
      id_event: { type: 'integer', format: 'int64', readOnly: true, title: 'ID' },
      name: { type: 'string', title: 'Name' },
      event_starts_at: {
        type: 'integer',
        format: 'timestamp',
        title: 'Event Starts At',
      },
      event_ends_at: {
        type: 'integer',
        format: 'timestamp',
        title: 'Event Ends At',
      },
      cover_images: {
        type: 'array',
        readOnly: true,
        title: 'Cover Images',
        'x-padeliz-upload': {
          mode: 'multi',
          max_files: 2,
          form_field: 'file',
          required: true,
          accept: ['image/jpeg', 'image/png'],
          upload: {
            method: 'POST',
            path: '/api/v1/manager/events/{id}/cover-images',
          },
          delete: {
            method: 'DELETE',
            path: '/api/v1/manager/events/{id}/cover-images/{childId}',
          },
        },
      },
      inserted_at: {
        type: 'integer',
        format: 'timestamp',
        readOnly: true,
        title: 'Created At',
      },
    },
  },
};
