import { BaseApiService } from './baseApi';

export type BrandingOption = {
  id: number;
  name: string;
  image: string;
};

export class BrandingApiService extends BaseApiService {
  async getBranding(): Promise<{
    data: { organizers: BrandingOption[]; partners: BrandingOption[] };
  }> {
    return this.get('/branding');
  }
}

export const brandingApi = new BrandingApiService();
