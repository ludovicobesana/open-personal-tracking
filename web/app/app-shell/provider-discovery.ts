import { ProviderCatalog } from '../../../src/application/provider-catalog';
import { ProviderDiscovery } from '../../../src/application/provider-discovery';
import {
  TmdbProvider,
  type TmdbFetch,
} from '../../../src/providers/tmdb/tmdb-provider';

export interface ConfiguredProviderDiscovery {
  id: string;
  discovery: ProviderDiscovery;
}

/**
 * Optional browser composition. No provider is initialized or contacted until
 * a person explicitly submits a metadata search from the item drawer.
 */
export const createConfiguredProviderDiscovery =
  (): ConfiguredProviderDiscovery | null => {
    const accessToken = process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN?.trim();
    if (!accessToken) return null;

    // The browser composition owns its transport. Passing it explicitly avoids
    // relying on an ambient fetch binding while keeping the adapter portable.
    const fetch: TmdbFetch = (input, init) => globalThis.fetch(input, init);
    const provider = new TmdbProvider({ accessToken, fetch });
    return {
      id: provider.id,
      discovery: new ProviderDiscovery(
        new ProviderCatalog([provider]),
        provider.id,
      ),
    };
  };
