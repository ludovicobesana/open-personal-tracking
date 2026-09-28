import type { CreateItemInput } from '../domain/archive.js';
import type {
  ProviderAttribution,
  ProviderDetailsResponse,
  ProviderItemReference,
  ProviderOutcome,
  ProviderRequestOptions,
  ProviderSearchQuery,
  ProviderSearchResponse,
} from '../providers/metadata-provider.js';
import {
  ProviderCatalog,
  createItemDraftFromProviderDetails,
  type ProviderItemDraft,
} from './provider-catalog.js';

export interface ProviderDiscoveryReview {
  input: CreateItemInput;
  reference: ProviderItemReference;
  attributions: Array<ProviderAttribution>;
  imageReference?: ProviderItemDraft['imageReference'];
}

/**
 * Application boundary for optional provider discovery. It deliberately keeps
 * transient provider results separate from archive persistence and React.
 */
export class ProviderDiscovery {
  constructor(
    private readonly catalog: ProviderCatalog,
    private readonly providerId: string,
  ) {}

  search(
    query: ProviderSearchQuery,
  ): Promise<ProviderOutcome<ProviderSearchResponse>> {
    return this.catalog.search(this.providerId, query);
  }

  getDetails(
    reference: ProviderItemReference,
    options?: ProviderRequestOptions,
  ): Promise<ProviderOutcome<ProviderDetailsResponse>> {
    return this.catalog.getDetails(reference, options);
  }

  review(response: ProviderDetailsResponse): ProviderDiscoveryReview {
    return createItemDraftFromProviderDetails(
      response.item,
      response.attributions,
    );
  }
}
