import { ProviderCatalog } from '../../../src/application/provider-catalog';
import { ProviderDiscovery } from '../../../src/application/provider-discovery';
import { TmdbProvider } from '../../../src/providers/tmdb/tmdb-provider';

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

    const provider = new TmdbProvider({ accessToken });
    return {
      id: provider.id,
      discovery: new ProviderDiscovery(
        new ProviderCatalog([provider]),
        provider.id,
      ),
    };
  };
