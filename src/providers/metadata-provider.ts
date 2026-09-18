import { z } from 'zod';

export type ProviderId = string;

export type ProviderCapability = 'search' | 'details' | 'images';

export type ProviderOperation = 'search' | 'details';

export type ProviderFailureKind =
  | 'unavailable'
  | 'timeout'
  | 'unauthorized'
  | 'rate_limited'
  | 'not_found'
  | 'malformed_response'
  | 'unsupported_operation'
  | 'invalid_request';

export type ProviderMetadataValue = string | number | boolean | null;

export interface ProviderItemReference {
  providerId: ProviderId;
  externalId: string;
}

export interface ProviderExternalId {
  namespace: string;
  value: string;
}

export interface ProviderCreator {
  name: string;
  role?: string;
}

export interface ProviderAttribution {
  name: string;
  notice?: string;
  url?: string;
  licenseUrl?: string;
}

/** A remote reference is not evidence that the image is locally owned or cached. */
export interface ProviderImageReference {
  kind: 'cover' | 'poster' | 'backdrop' | 'thumbnail' | 'other';
  url: string;
  attributions: Array<ProviderAttribution>;
}

export const PROVIDER_SEARCH_MAX_LIMIT = 50;

export interface ProviderRequestOptions {
  cursor?: string;
  signal?: AbortSignal;
}

export interface ProviderSearchQuery extends ProviderRequestOptions {
  text: string;
  categories?: Array<string>;
  limit?: number;
}

export interface ProviderSearchResult {
  reference: ProviderItemReference;
  title: string;
  category: string;
  type?: string;
  description?: string;
  releaseDate?: string;
  images: Array<ProviderImageReference>;
  attributions: Array<ProviderAttribution>;
}

export interface ProviderSearchResponse {
  results: Array<ProviderSearchResult>;
  nextCursor?: string;
  attributions: Array<ProviderAttribution>;
}

/**
 * Provider-neutral metadata. Category-specific details belong in `attributes`
 * only when the adapter can express them as portable primitive values.
 */
export interface ProviderItemDetails {
  reference: ProviderItemReference;
  title: string;
  category: string;
  type?: string;
  description?: string;
  releaseDate?: string;
  creators: Array<ProviderCreator>;
  externalIds: Array<ProviderExternalId>;
  images: Array<ProviderImageReference>;
  attributions: Array<ProviderAttribution>;
  attributes: Record<string, ProviderMetadataValue>;
}

export interface ProviderDetailsResponse {
  item: ProviderItemDetails;
  attributions: Array<ProviderAttribution>;
}

export interface MetadataProvider {
  readonly id: ProviderId;
  readonly capabilities: ReadonlySet<ProviderCapability>;
}

export interface SearchProvider {
  search(query: ProviderSearchQuery): Promise<ProviderSearchResponse>;
}

export interface DetailsProvider {
  getDetails(
    reference: ProviderItemReference,
    options?: ProviderRequestOptions,
  ): Promise<ProviderDetailsResponse>;
}

export type Provider = MetadataProvider &
  Partial<SearchProvider> &
  Partial<DetailsProvider>;

const ProviderItemReferenceSchema: z.ZodType<ProviderItemReference> = z.object({
  providerId: z.string().trim().min(1).max(80),
  externalId: z.string().trim().min(1).max(500),
});

const ProviderAttributionSchema: z.ZodType<ProviderAttribution> = z.object({
  name: z.string().trim().min(1).max(240),
  notice: z.string().trim().min(1).max(2_000).optional(),
  url: z.string().url().optional(),
  licenseUrl: z.string().url().optional(),
});

const ProviderImageReferenceSchema: z.ZodType<ProviderImageReference> =
  z.object({
    kind: z.enum(['cover', 'poster', 'backdrop', 'thumbnail', 'other']),
    url: z.string().url(),
    attributions: z.array(ProviderAttributionSchema).max(24),
  });

const ProviderSearchResultSchema: z.ZodType<ProviderSearchResult> = z.object({
  reference: ProviderItemReferenceSchema,
  title: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(20_000).optional(),
  releaseDate: z.string().trim().min(1).max(80).optional(),
  images: z.array(ProviderImageReferenceSchema).max(24),
  attributions: z.array(ProviderAttributionSchema).max(24),
});

const ProviderItemDetailsSchema: z.ZodType<ProviderItemDetails> = z.object({
  reference: ProviderItemReferenceSchema,
  title: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(20_000).optional(),
  releaseDate: z.string().trim().min(1).max(80).optional(),
  creators: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(500),
        role: z.string().trim().min(1).max(120).optional(),
      }),
    )
    .max(100),
  externalIds: z
    .array(
      z.object({
        namespace: z.string().trim().min(1).max(120),
        value: z.string().trim().min(1).max(500),
      }),
    )
    .max(100),
  images: z.array(ProviderImageReferenceSchema).max(24),
  attributions: z.array(ProviderAttributionSchema).max(24),
  attributes: z.record(
    z.string().trim().min(1).max(120),
    z.union([
      z.string().max(20_000),
      z.number().finite(),
      z.boolean(),
      z.null(),
    ]),
  ),
});

export const ProviderSearchQuerySchema: z.ZodType<ProviderSearchQuery> =
  z.object({
    text: z.string().trim().min(1).max(500),
    categories: z.array(z.string().trim().min(1).max(120)).max(24).optional(),
    limit: z.number().int().min(1).max(PROVIDER_SEARCH_MAX_LIMIT).optional(),
    cursor: z.string().trim().min(1).max(2_000).optional(),
    signal: z.instanceof(AbortSignal).optional(),
  });

const ProviderSearchResponseSchema: z.ZodType<ProviderSearchResponse> =
  z.object({
    results: z.array(ProviderSearchResultSchema).max(PROVIDER_SEARCH_MAX_LIMIT),
    nextCursor: z.string().trim().min(1).max(2_000).optional(),
    attributions: z.array(ProviderAttributionSchema).max(24),
  });

const ProviderDetailsResponseSchema: z.ZodType<ProviderDetailsResponse> =
  z.object({
    item: ProviderItemDetailsSchema,
    attributions: z.array(ProviderAttributionSchema).max(24),
  });

const providerErrorMessages: Record<ProviderFailureKind, string> = {
  unavailable: 'The metadata provider is currently unavailable',
  timeout: 'The metadata provider took too long to respond',
  unauthorized: 'The metadata provider credentials are unavailable or invalid',
  rate_limited: 'The metadata provider rate limit has been reached',
  not_found: 'The requested metadata provider or item was not found',
  malformed_response: 'The metadata provider returned an invalid response',
  unsupported_operation:
    'The metadata provider does not support this operation',
  invalid_request: 'The metadata request is invalid',
};

export const providerFailureIsRetryable = (
  kind: ProviderFailureKind,
): boolean =>
  kind === 'unavailable' || kind === 'timeout' || kind === 'rate_limited';

/** Provider errors intentionally contain only safe, user-presentable messages. */
export class ProviderError extends Error {
  constructor(
    readonly providerId: ProviderId,
    readonly operation: ProviderOperation,
    readonly kind: ProviderFailureKind,
    readonly retryable = providerFailureIsRetryable(kind),
    readonly retryAfterSeconds?: number,
  ) {
    super(providerErrorMessages[kind]);
    this.name = 'ProviderError';
  }
}

export type ProviderOutcome<Value> =
  | { ok: true; value: Value }
  | { ok: false; error: ProviderError };

export const supportsProviderCapability = (
  provider: MetadataProvider,
  capability: ProviderCapability,
): boolean => provider.capabilities.has(capability);

export const canSearchProvider = (
  provider: Provider,
): provider is Provider & SearchProvider =>
  supportsProviderCapability(provider, 'search') &&
  typeof provider.search === 'function';

export const canGetProviderDetails = (
  provider: Provider,
): provider is Provider & DetailsProvider =>
  supportsProviderCapability(provider, 'details') &&
  typeof provider.getDetails === 'function';

export const parseProviderSearchQuery = (
  value: unknown,
): ProviderSearchQuery | null => {
  const parsed = ProviderSearchQuerySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const parseProviderSearchResponse = (
  value: unknown,
): ProviderSearchResponse | null => {
  const parsed = ProviderSearchResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const parseProviderDetailsResponse = (
  value: unknown,
): ProviderDetailsResponse | null => {
  const parsed = ProviderDetailsResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

/**
 * Adapters should throw ProviderError for known failures. Unknown thrown values
 * are intentionally reduced to an external availability failure so SDK and
 * transport details never enter application or UI code.
 */
export const normalizeProviderError = (
  providerId: ProviderId,
  operation: ProviderOperation,
  error: unknown,
): ProviderError => {
  if (
    error instanceof ProviderError &&
    error.providerId === providerId &&
    error.operation === operation
  ) {
    return error;
  }

  return new ProviderError(providerId, operation, 'unavailable');
};
