import { BaseApiService } from './baseApi';

export class TemplatesToolsApiService extends BaseApiService {
  async catalog(params: {
    include_fixed_teams?: boolean;
    templates_version?: number;
  } = {}): Promise<{ data: any }> {
    const query = new URLSearchParams();
    if (params.include_fixed_teams != null) {
      query.append(
        'include_fixed_teams',
        params.include_fixed_teams ? '1' : '0'
      );
    }
    if (params.templates_version != null) {
      query.append('templates_version', String(params.templates_version));
    }
    const qs = query.toString();
    return this.get<{ data: any }>(
      `/tools/templates/catalog${qs ? `?${qs}` : ''}`
    );
  }

  async metrics(params: {
    include_fixed_teams?: boolean;
    templates_version?: number;
  } = {}): Promise<{ data: any }> {
    const query = new URLSearchParams();
    if (params.include_fixed_teams != null) {
      query.append(
        'include_fixed_teams',
        params.include_fixed_teams ? '1' : '0'
      );
    }
    if (params.templates_version != null) {
      query.append('templates_version', String(params.templates_version));
    }
    const qs = query.toString();
    return this.get<{ data: any }>(
      `/tools/templates/metrics${qs ? `?${qs}` : ''}`
    );
  }

  async demo(
    players: number,
    partners: number,
    repeat: number,
    courts: number,
    params: {
      include_fixed_teams?: boolean;
      templates_version?: number;
    } = {}
  ): Promise<{ data: any }> {
    const query = new URLSearchParams();
    if (params.include_fixed_teams != null) {
      query.append(
        'include_fixed_teams',
        params.include_fixed_teams ? '1' : '0'
      );
    }
    if (params.templates_version != null) {
      query.append('templates_version', String(params.templates_version));
    }
    const qs = query.toString();
    return this.get<{ data: any }>(
      `/tools/templates/demo/${players}/${partners}/${repeat}/${courts}${qs ? `?${qs}` : ''}`
    );
  }
}

export const templatesToolsApi = new TemplatesToolsApiService();
