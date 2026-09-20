import type { AttributeValue, CreateItemInput } from '../domain/archive.js';
import {
  ProviderError,
  canGetProviderDetails,
  canSearchProvider,
  normalizeProviderError,
  type MetadataProvider,
  type Provider,
  type ProviderAttribution,
  type ProviderDetailsResponse,
  type ProviderImageReference,
  type ProviderItemDetails,
  type ProviderItemReference,
  type ProviderOutcome,
  type ProviderRequestOptions,
  type ProviderSearchQuery,
  type ProviderSearchResponse,
  parseProviderDetailsResponse,
  parseProviderSearchQuery,
  parseProviderSearchResponse,
} from '../providers/metadata-provider.js';

export interface ProviderItemDraft {
  input: CreateItemInput;
  reference: ProviderItemReference;
  attributions: Array<ProviderAttribution>;
  imageReference?: ProviderImageReference;
}

const attributeKeyPart = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

const providerAttributeKey = (providerId: string, key: string): string =>
  `provider_${attributeKeyPart(providerId)}_${attributeKeyPart(key)}`;

const preferredImageReference = (
  details: ProviderItemDetails,
): ProviderImageReference | undefined =>
  details.images.find(
    (image) => image.kind === 'cover' || image.kind === 'poster',
  );

const providerAttributes = (
  details: ProviderItemDetails,
  attributions: Array<ProviderAttribution>,
): Record<string, AttributeValue> => {
  const attributes: Record<string, AttributeValue> = {};
  const setAttribute = (key: string, value: AttributeValue): void => {
    const current = attributes[key];
    if (current !== undefined && current !== value) {
      throw new ProviderError(
        details.reference.providerId,
        'details',
        'malformed_response',
      );
    }
    attributes[key] = value;
  };

  for (const [key, value] of Object.entries(details.attributes)) {
    setAttribute(
      providerAttributeKey(details.reference.providerId, key),
      value,
    );
  }
  if (details.releaseDate) {
    setAttribute(
      providerAttributeKey(details.reference.providerId, 'releaseDate'),
      details.releaseDate,
    );
  }
  if (details.creators.length > 0) {
    setAttribute(
      providerAttributeKey(details.reference.providerId, 'creators'),
      details.creators
        .map((creator) =>
          creator.role ? `${creator.name} (${creator.role})` : creator.name,
        )
        .join(', '),
    );
  }
  if (attributions.length > 0) {
    setAttribute(
      providerAttributeKey(details.reference.providerId, 'attribution'),
      attributions
        .map((attribution) =>
          [
            attribution.name,
            attribution.notice,
            attribution.url,
            attribution.licenseUrl,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' | '),
        )
        .join('\n'),
    );
  }

  return attributes;
};

const providerExternalIds = (
  details: ProviderItemDetails,
): Record<string, string> => {
  const externalIds = new Map<string, string>([
    [details.reference.providerId, details.reference.externalId],
  ]);

  for (const identifier of details.externalIds) {
    const key = `${details.reference.providerId}:${identifier.namespace}`;
    const current = externalIds.get(key);
    if (current && current !== identifier.value) {
      throw new ProviderError(
        details.reference.providerId,
        'details',
        'malformed_response',
      );
    }
    externalIds.set(key, identifier.value);
  }

  return Object.fromEntries(externalIds);
};

const uniqueAttributions = (
  attributions: Array<ProviderAttribution>,
): Array<ProviderAttribution> => {
  const seen = new Set<string>();

  return attributions.filter((attribution) => {
    const key = [
      attribution.name,
      attribution.notice ?? '',
      attribution.url ?? '',
      attribution.licenseUrl ?? '',
    ].join('\u0000');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Converts reviewed external metadata into a local item draft. The caller owns
 * the decision to create or update an archive item and must display required
 * attribution before using provider-supplied content.
 */
export const createItemDraftFromProviderDetails = (
  details: ProviderItemDetails,
  attributions: Array<ProviderAttribution> = [],
): ProviderItemDraft => {
  const resolvedAttributions = uniqueAttributions([
    ...details.attributions,
    ...details.images.flatMap((image) => image.attributions),
    ...attributions,
  ]);

  return {
    input: {
      type: details.type ?? 'generic',
      category: details.category,
      title: details.title,
      description: details.description,
      progress: { current: 0, unit: 'units' },
      attributes: providerAttributes(details, resolvedAttributions),
      externalIds: providerExternalIds(details),
    },
    reference: details.reference,
    attributions: resolvedAttributions,
    imageReference: preferredImageReference(details),
  };
};

const unsupportedOperation = (
  provider: MetadataProvider,
  operation: 'search' | 'details',
): ProviderError =>
  new ProviderError(provider.id, operation, 'unsupported_operation', false);

const malformedResponse = (
  providerId: string,
  operation: 'search' | 'details',
): ProviderError =>
  new ProviderError(providerId, operation, 'malformed_response', false);

/** Coordinates optional metadata providers without exposing adapter failures. */
export class ProviderCatalog {
  private readonly providers = new Map<string, Provider>();

  constructor(providers: Iterable<Provider>) {
    for (const provider of providers) {
      if (this.providers.has(provider.id)) {
        throw new Error(`A provider is already registered for ${provider.id}`);
      }
      this.providers.set(provider.id, provider);
    }
  }

  async search(
    providerId: string,
    query: ProviderSearchQuery,
  ): Promise<ProviderOutcome<ProviderSearchResponse>> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return {
        ok: false,
        error: new ProviderError(providerId, 'search', 'not_found', false),
      };
    }
    if (!canSearchProvider(provider)) {
      return { ok: false, error: unsupportedOperation(provider, 'search') };
    }

    const validatedQuery = parseProviderSearchQuery(query);
    if (!validatedQuery) {
      return {
        ok: false,
        error: new ProviderError(
          provider.id,
          'search',
          'invalid_request',
          false,
        ),
      };
    }

    try {
      const response = parseProviderSearchResponse(
        await provider.search(validatedQuery),
      );
      if (
        !response ||
        response.results.some(
          (result) => result.reference.providerId !== provider.id,
        )
      ) {
        return { ok: false, error: malformedResponse(provider.id, 'search') };
      }
      return { ok: true, value: response };
    } catch (error) {
      return {
        ok: false,
        error: normalizeProviderError(provider.id, 'search', error),
      };
    }
  }

  async getDetails(
    reference: ProviderItemReference,
    options?: ProviderRequestOptions,
  ): Promise<ProviderOutcome<ProviderDetailsResponse>> {
    const provider = this.providers.get(reference.providerId);
    if (!provider) {
      return {
        ok: false,
        error: new ProviderError(
          reference.providerId,
          'details',
          'not_found',
          false,
        ),
      };
    }
    if (!canGetProviderDetails(provider)) {
      return { ok: false, error: unsupportedOperation(provider, 'details') };
    }

    try {
      const response = parseProviderDetailsResponse(
        await provider.getDetails(reference, options),
      );
      if (
        !response ||
        response.item.reference.providerId !== provider.id ||
        response.item.reference.externalId !== reference.externalId
      ) {
        return { ok: false, error: malformedResponse(provider.id, 'details') };
      }
      return { ok: true, value: response };
    } catch (error) {
      return {
        ok: false,
        error: normalizeProviderError(provider.id, 'details', error),
      };
    }
  }
}
