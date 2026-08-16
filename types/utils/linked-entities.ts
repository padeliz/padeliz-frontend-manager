/**
 * Linked Entities Types
 * Types for automatic linked entity detection and configuration
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import { LinkedEntityConfig } from '@/types/ui/pages';

export interface LinkedEntityDetectionResult {
  fieldKey: string;
  fieldDefinition: any;
  linkedResourceName: string;
  foreignKeyField: string;
  apiEndpoint: string;
  selectedColumns: string[];
}

export interface LinkedEntityServiceConfig {
  parentResourceName: string;
  parentResourceId: number;
  metadata: ApiResourceMetadata;
}

export interface LinkedEntityFetchFunction {
  (parentId: number, params: any): Promise<any>;
}

export interface LinkedEntityService {
  detectLinkedEntities(
    config: LinkedEntityServiceConfig,
    getLinkedResourceMetadata: (
      resourceName: string
    ) => Promise<ApiResourceMetadata | null>
  ): Promise<LinkedEntityConfig[]>;
  buildLinkedEntityFetchFunction(
    resourcePath: string,
    foreignKeyField: string
  ): LinkedEntityFetchFunction;
  selectLinkedEntityColumns(metadata: ApiResourceMetadata): string[];
}
