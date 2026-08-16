import { BaseApiService } from './baseApi';

/** Shared multipart client for schema-driven uploads */
export class ManagerUploadApiService extends BaseApiService {
  upload(endpoint: string, formData: FormData) {
    return this.uploadFormData(endpoint, formData);
  }

  remove(endpoint: string) {
    return this.deleteUpload(endpoint);
  }
}

export const managerUploadApi = new ManagerUploadApiService();
