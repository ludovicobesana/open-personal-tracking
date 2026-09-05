import { BrowserArchiveStore } from '../storage/browser-archive-store.js';
import { UserPreferencesSchema, type ArchiveSnapshot } from '../domain/archive.js';
import { ArchiveApplication } from './archive-application.js';

const LEGACY_ONBOARDING_STORAGE_KEY = 'open-personal-tracking.preferences.v1';

/** Creates the local application boundary used by browser clients. */
export const createLocalArchiveApplication = (): ArchiveApplication =>
  new ArchiveApplication(new BrowserArchiveStore());

/**
 * Loads the persisted archive and moves preview onboarding preferences into it
 * once. This keeps a previous local-only preference from being silently lost.
 */
export const loadLocalArchive = async (application: ArchiveApplication): Promise<ArchiveSnapshot> => {
  const archive = await application.load();
  const legacyValue = globalThis.localStorage?.getItem(LEGACY_ONBOARDING_STORAGE_KEY);
  if (!legacyValue || archive.items.length > 0 || archive.history.length > 0 || archive.preferences.onboardingCompleted) {
    return archive;
  }

  try {
    const preferences = UserPreferencesSchema.safeParse(JSON.parse(legacyValue));
    if (!preferences.success) {
      globalThis.localStorage.removeItem(LEGACY_ONBOARDING_STORAGE_KEY);
      return archive;
    }

    const migrated = await application.updatePreferences(archive, preferences.data);
    globalThis.localStorage.removeItem(LEGACY_ONBOARDING_STORAGE_KEY);
    return migrated;
  } catch {
    globalThis.localStorage.removeItem(LEGACY_ONBOARDING_STORAGE_KEY);
    return archive;
  }
};
