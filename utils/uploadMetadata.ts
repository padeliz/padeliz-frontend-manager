/**
 * Parse and resolve x-padeliz-upload metadata from OpenAPI property definitions.
 */

export type PadelizUploadConfig = {
  mode: 'single' | 'multi';
  max_files: number;
  max_size_kb: number;
  accept: string[];
  form_field: string;
  /** When true, create flow must have a pending file before submit. */
  required: boolean;
  upload: { method: string; path: string };
  delete?: { method: string; path: string } | null;
};

export function getUploadConfig(fieldDefinition: any): PadelizUploadConfig | null {
  if (!fieldDefinition) return null;
  const raw =
    fieldDefinition['x-padeliz-upload'] ||
    fieldDefinition['x']?.['padeliz-upload'];
  if (!raw || typeof raw !== 'object') return null;

  const acceptRaw = raw.accept;
  let accept: string[] = [];
  if (Array.isArray(acceptRaw)) {
    accept = acceptRaw.map(String);
  } else if (acceptRaw && typeof acceptRaw === 'object') {
    accept = Object.values(acceptRaw).map(String);
  }

  if (!raw.upload?.path || !raw.form_field) return null;

  return {
    mode: raw.mode === 'multi' ? 'multi' : 'single',
    max_files: Number(raw.max_files) || 1,
    max_size_kb: Number(raw.max_size_kb) || 5120,
    accept,
    form_field: String(raw.form_field),
    required: raw.required === true || raw.required === 1 || raw.required === 'true',
    upload: {
      method: String(raw.upload.method || 'POST'),
      path: String(raw.upload.path),
    },
    delete: raw.delete?.path
      ? {
          method: String(raw.delete.method || 'DELETE'),
          path: String(raw.delete.path),
        }
      : null,
  };
}

export function acceptsPdf(config: PadelizUploadConfig): boolean {
  return config.accept.some(
    a => a === 'application/pdf' || a.includes('pdf')
  );
}

export function acceptsOnlyImages(config: PadelizUploadConfig): boolean {
  return (
    config.accept.length > 0 &&
    config.accept.every(a => a.startsWith('image/'))
  );
}

export function resolveUploadPath(
  template: string,
  vars: Record<string, string | number>
): string {
  let path = template;
  for (const [key, value] of Object.entries(vars)) {
    path = path.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  // Common aliases
  if (vars.id != null) {
    path = path
      .replace(/\{player\}/g, String(vars.id))
      .replace(/\{prize\}/g, String(vars.id));
  }
  return path;
}

/** Strip /api/v1/manager prefix for BaseApiService endpoints */
export function toManagerEndpoint(fullPath: string): string {
  const prefix = '/api/v1/manager';
  if (fullPath.startsWith(prefix)) {
    return fullPath.slice(prefix.length);
  }
  return fullPath;
}
