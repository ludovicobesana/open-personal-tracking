'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleAlert,
  CircleCheck,
  Compass,
  FolderKanban,
  History,
  LibraryBig,
  Plus,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  createLocalArchiveApplication,
  loadLocalArchive,
} from '../../../src/application/local-archive-application';
import type { ArchiveApplication } from '../../../src/application/archive-application';
import {
  type ArchiveSnapshot,
  type Item,
  type ItemStatus,
  type TrackingUnit,
  UserPreferencesSchema,
  type UserPreferences,
} from '../../../src/domain/archive';
import { filterItems, getHistoryTimeline } from '../../../src/domain/search';
import {
  applyTvTimeImport,
  extractTvTimeCsvFilesFromZip,
  previewTvTimeImport,
  type TvTimeDuplicateResolution,
  type TvTimeImportPreview,
} from '../../../src/import/tv-time';
import { ConnectionStatus } from '../connection-status';

type Episode = {
  id: string;
  number: number;
  title: string;
  description?: string;
  imageUrl?: string;
  completed: boolean;
};
type SeriesSeason = {
  id: string;
  number: number;
  title: string;
  description?: string;
  imageUrl?: string;
  episodes: Episode[];
};
type EpisodeSelection = { seasonNumber: number; episodeNumber: number };
type ImportFeedback = {
  kind: 'error' | 'success' | 'warning';
  message: string;
  title: string;
};
type SeriesDraftEpisode = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  completed: boolean;
};
type SeriesDraftSeason = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  episodes: SeriesDraftEpisode[];
};
type ItemForm = {
  title: string;
  category: string;
  status: string;
  description: string;
  rating: string;
  notes: string;
  tags: string;
  collections: string;
  seasons: SeriesDraftSeason[];
};
type TrackedItem = {
  id: string;
  title: string;
  category: string;
  jacket: string;
  image: string;
  usePlaceholderCover: boolean;
  creator: string;
  status: 'planned' | 'progress' | 'completed' | 'paused' | 'dropped';
  meta: string;
  next: string;
  value: number;
  progressKind: 'percent' | 'count';
  progressText: string;
  description: string;
  tags: string[];
  rating?: number;
  seasons?: SeriesSeason[];
};

const GROUPS = [
  { key: 'progress', label: 'Continuing' },
  { key: 'planned', label: 'Planned' },
  { key: 'completed', label: 'Finished' },
  { key: 'archived', label: 'Archived' },
];

const getCoverImage = (image?: string): string => image?.trim() ?? '';

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  progress: 'In progress',
  completed: 'Completed',
  paused: 'Paused',
  dropped: 'Dropped',
};

const NAV_LABEL: Record<string, string> = {
  library: 'Library',
  discover: 'Discover',
  profile: 'Profile',
  collections: 'Collections',
  history: 'History',
  import: 'Import',
  export: 'Export',
  settings: 'Settings',
};

const MOBILE_NAV_ITEMS = [
  { key: 'library', label: 'Library', Icon: LibraryBig },
  { key: 'discover', label: 'Discover', Icon: Compass },
  { key: 'profile', label: 'Profile', Icon: UserRound },
  { key: 'settings', label: 'Settings', Icon: Settings },
] as const;

const ACTIVITY_OPTIONS = [
  { key: 'movies', label: 'Movies' },
  { key: 'series', label: 'Series' },
  { key: 'books', label: 'Books' },
  { key: 'manga', label: 'Manga' },
  { key: 'anime', label: 'Anime' },
  { key: 'games', label: 'Games' },
  { key: 'music', label: 'Music' },
  { key: 'podcasts', label: 'Podcasts' },
] as const;
const GENRE_OPTIONS = [
  'Action',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-fi',
];

const ROADMAP_URL =
  'https://github.com/ludovicobesana/open-personal-tracking/blob/main/ROADMAP.md';
const CHANGELOG_URL =
  'https://github.com/ludovicobesana/open-personal-tracking/blob/main/CHANGELOG.md';
const BUG_REPORT_URL =
  'https://github.com/ludovicobesana/open-personal-tracking/issues/new?template=bug_report.md';
const IMPORT_FEEDBACK_DURATION_MS: Record<ImportFeedback['kind'], number> = {
  success: 4_000,
  warning: 8_000,
  error: 12_000,
};
const IMPORT_FEEDBACK_EXIT_DURATION_MS = 180;

const bucketOf = (status: string) =>
  status === 'paused' || status === 'dropped' ? 'archived' : status;

const getPageTarget = (item: TrackedItem) => {
  return item.category === 'Book' && item.meta.endsWith('pages')
    ? Number(item.meta.split(' ')[0]) || null
    : null;
};

const displayStatus = (status: ItemStatus): TrackedItem['status'] =>
  status === 'in_progress' ? 'progress' : status;

const stringAttribute = (item: Item, key: string): string | undefined => {
  const value = item.attributes[key];
  return typeof value === 'string' ? value : undefined;
};

const orderedByPosition = <T extends { position?: number }>(items: T[]): T[] =>
  [...items].sort(
    (left, right) =>
      (left.position ?? Number.MAX_SAFE_INTEGER) -
      (right.position ?? Number.MAX_SAFE_INTEGER),
  );

const toSeriesSeasons = (item: Item): SeriesSeason[] =>
  orderedByPosition(item.subunits.filter((unit) => unit.kind === 'season')).map(
    (season, index) => ({
      id: season.id,
      number: season.position ?? index + 1,
      title: season.title,
      description: season.description,
      imageUrl: season.imageUrl,
      episodes: orderedByPosition(
        item.subunits.filter(
          (unit) => unit.parentId === season.id && unit.kind === 'episode',
        ),
      ).map((episode, episodeIndex) => ({
        id: episode.id,
        number: episode.position ?? episodeIndex + 1,
        title: episode.title,
        description: episode.description,
        imageUrl: episode.imageUrl,
        completed: episode.completed,
      })),
    }),
  );

const progressUnitLabel = (item: Item, amount?: number): string => {
  if (item.progress.unit !== 'subunits') return item.progress.unit;

  const count = amount ?? item.progress.target ?? item.progress.current;
  if (item.category === 'Series') {
    return count === 1 ? 'episode' : 'episodes';
  }
  return count === 1 ? 'tracked entry' : 'tracked entries';
};

const toTrackedItem = (
  item: Item,
  defaultPlaceholderCover: boolean,
): TrackedItem => {
  const target = item.progress.target;
  const hasAggregateEpisodeCount =
    item.category === 'Series' &&
    item.progress.unit === 'episodes' &&
    target === undefined &&
    item.subunits.length === 0;
  const value =
    target && target > 0
      ? Math.min(100, (item.progress.current / target) * 100)
      : item.progress.current;
  const status = displayStatus(item.status);

  return {
    id: item.id,
    title: item.title,
    category: item.category,
    jacket: stringAttribute(item, 'jacket') ?? '#8F6F2E',
    image: item.imageUrl ?? '',
    usePlaceholderCover:
      typeof item.attributes.usePlaceholderCover === 'boolean'
        ? item.attributes.usePlaceholderCover
        : defaultPlaceholderCover,
    creator: stringAttribute(item, 'creator') ?? '—',
    status,
    meta:
      stringAttribute(item, 'meta') ??
      (target
        ? `${target} ${progressUnitLabel(item, target)}`
        : progressUnitLabel(item)),
    next:
      stringAttribute(item, 'next') ??
      (hasAggregateEpisodeCount
        ? `${item.progress.current} episodes watched`
        : status === 'completed'
          ? 'Finished'
          : `${Math.round(value)}% complete`),
    value,
    progressKind: hasAggregateEpisodeCount ? 'count' : 'percent',
    progressText: hasAggregateEpisodeCount
      ? `${item.progress.current} episodes watched`
      : `${Math.round(value)}% complete`,
    description: item.description ?? '',
    tags: item.tags,
    rating: item.rating,
    seasons: item.category === 'Series' ? toSeriesSeasons(item) : undefined,
  };
};

const noSelection: TrackedItem = {
  id: '',
  title: 'Select an item',
  category: 'Library',
  jacket: '#8F6F2E',
  image: '',
  usePlaceholderCover: false,
  creator: '—',
  status: 'planned',
  meta: '—',
  next: 'Choose an item from your library',
  value: 0,
  progressKind: 'percent',
  progressText: '0% complete',
  description: 'Select an item to see its details.',
  tags: [],
};

const toArchiveStatus = (status: string): ItemStatus =>
  status === 'progress' ? 'in_progress' : (status as ItemStatus);
const emptyItemForm = (): ItemForm => ({
  title: '',
  category: 'Book',
  status: 'planned',
  description: '',
  rating: '',
  notes: '',
  tags: '',
  collections: '',
  seasons: [],
});
const draftId = (): string => crypto.randomUUID();
const emptyEpisodeDraft = (): SeriesDraftEpisode => ({
  id: draftId(),
  title: '',
  description: '',
  imageUrl: '',
  completed: false,
});
const emptySeasonDraft = (): SeriesDraftSeason => ({
  id: draftId(),
  title: '',
  description: '',
  imageUrl: '',
  episodes: [emptyEpisodeDraft()],
});
const optionalUrl = (value: string): string | undefined =>
  value.trim() || undefined;
const seriesSubunits = (seasons: SeriesDraftSeason[]): TrackingUnit[] =>
  seasons.flatMap((season, seasonIndex) => [
    {
      id: season.id,
      kind: 'season' as const,
      title: season.title.trim(),
      description: season.description.trim() || undefined,
      imageUrl: optionalUrl(season.imageUrl),
      position: seasonIndex + 1,
      completed: false,
      watchCount: 0,
    },
    ...season.episodes.map((episode, episodeIndex) => ({
      id: episode.id,
      kind: 'episode' as const,
      title: episode.title.trim(),
      description: episode.description.trim() || undefined,
      imageUrl: optionalUrl(episode.imageUrl),
      parentId: season.id,
      position: episodeIndex + 1,
      completed: episode.completed,
      watchCount: episode.completed ? 1 : 0,
    })),
  ]);
const listFromInput = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

export default function AppShellPage() {
  const [activeNav, setActiveNav] = useState('library');
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newItem, setNewItem] = useState<ItemForm>(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'auto'>('dark');
  const [newItemUsesPlaceholderCover, setNewItemUsesPlaceholderCover] =
    useState(true);
  const [detailView, setDetailView] = useState<'summary' | 'expanded'>(
    'summary',
  );
  const [selectedEpisode, setSelectedEpisode] =
    useState<EpisodeSelection | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [archive, setArchive] = useState<ArchiveSnapshot | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [tvTimePreview, setTvTimePreview] =
    useState<TvTimeImportPreview | null>(null);
  const [tvTimeDuplicateResolution, setTvTimeDuplicateResolution] =
    useState<TvTimeDuplicateResolution>('skip');
  const [tvTimeImportFeedback, setTvTimeImportFeedback] =
    useState<ImportFeedback | null>(null);
  const [isTvTimeImportFeedbackExiting, setIsTvTimeImportFeedbackExiting] =
    useState(false);
  const [isTvTimeImporting, setIsTvTimeImporting] = useState(false);
  const application = useRef<ArchiveApplication | null>(null);
  const restoreInput = useRef<HTMLInputElement | null>(null);
  const tvTimeInput = useRef<HTMLInputElement | null>(null);
  const preferenceSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const preferenceSaveRevision = useRef(0);

  useEffect(() => {
    let isCurrent = true;
    const loadArchive = async () => {
      try {
        application.current = createLocalArchiveApplication();
        const loaded = await loadLocalArchive(application.current);
        if (!isCurrent) return;
        setArchive(loaded);
        setOnboardingOpen(!loaded.preferences.onboardingCompleted);
      } catch (error) {
        if (isCurrent) {
          setStorageError(
            error instanceof Error
              ? error.message
              : 'Could not load your local archive',
          );
        }
      }
    };

    void loadArchive();
    return () => {
      isCurrent = false;
    };
  }, []);

  const showTvTimeImportFeedback = (feedback: ImportFeedback) => {
    setIsTvTimeImportFeedbackExiting(false);
    setTvTimeImportFeedback(feedback);
  };

  const dismissTvTimeImportFeedback = () => {
    setIsTvTimeImportFeedbackExiting(true);
  };

  useEffect(() => {
    if (!tvTimeImportFeedback || isTvTimeImporting) return;

    const timeout = window.setTimeout(
      dismissTvTimeImportFeedback,
      IMPORT_FEEDBACK_DURATION_MS[tvTimeImportFeedback.kind],
    );
    return () => window.clearTimeout(timeout);
  }, [isTvTimeImporting, tvTimeImportFeedback]);

  useEffect(() => {
    if (!tvTimeImportFeedback || !isTvTimeImportFeedbackExiting) return;

    const timeout = window.setTimeout(() => {
      setTvTimeImportFeedback(null);
      setIsTvTimeImportFeedbackExiting(false);
    }, IMPORT_FEEDBACK_EXIT_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [isTvTimeImportFeedbackExiting, tvTimeImportFeedback]);

  const preferences = archive?.preferences ?? UserPreferencesSchema.parse({});
  const coverBackground = (
    image: string | undefined,
    usePlaceholder: boolean,
    overlay: string,
  ) => {
    const cover = getCoverImage(image);
    if (cover) return `${overlay}, url('${cover}')`;
    return usePlaceholder ? overlay : undefined;
  };

  const savePreferences = (next: UserPreferences): Promise<void> => {
    if (!archive || !application.current) return Promise.resolve();
    const archiveApplication = application.current;
    const previous = archive;
    const revision = ++preferenceSaveRevision.current;
    setArchive({ ...archive, preferences: next });

    const persist = async () => {
      try {
        const persisted = await archiveApplication.updatePreferences(
          archive,
          next,
        );
        if (revision === preferenceSaveRevision.current) {
          setArchive(persisted);
        }
      } catch (error) {
        if (revision === preferenceSaveRevision.current) {
          setArchive(previous);
          setOperationError(
            error instanceof Error
              ? error.message
              : 'Could not save your preferences',
          );
        }
      }
    };

    preferenceSaveQueue.current = preferenceSaveQueue.current.then(
      persist,
      persist,
    );
    return preferenceSaveQueue.current;
  };

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (mode: 'dark' | 'light' | 'auto') => {
      const normalizedMode = mode || 'dark';
      const actualTheme =
        normalizedMode === 'auto'
          ? window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark'
          : normalizedMode;

      root.setAttribute('data-theme', actualTheme);
      document.querySelectorAll('[data-theme-option]').forEach((button) => {
        button.classList.toggle(
          'is-active',
          button.getAttribute('data-theme-option') === normalizedMode,
        );
      });
    };

    applyTheme(themeMode);
    const colorSchemeMatcher = window.matchMedia(
      '(prefers-color-scheme: light)',
    );
    const handleChange = () => {
      if (themeMode === 'auto') {
        applyTheme('auto');
      }
    };

    if (colorSchemeMatcher.addEventListener) {
      colorSchemeMatcher.addEventListener('change', handleChange);
    } else if (colorSchemeMatcher.addListener) {
      colorSchemeMatcher.addListener(handleChange);
    }

    return () => {
      if (colorSchemeMatcher.removeEventListener) {
        colorSchemeMatcher.removeEventListener('change', handleChange);
      } else if (colorSchemeMatcher.removeListener) {
        colorSchemeMatcher.removeListener(handleChange);
      }
    };
  }, [themeMode]);

  const getItemProgress = (item: TrackedItem) => item.value;

  const items = useMemo(
    () =>
      archive?.items.map((item) =>
        toTrackedItem(item, preferences.placeholderCovers),
      ) ?? [],
    [archive, preferences.placeholderCovers],
  );
  const selectedItem =
    items.find((item) => item.id === selectedId) ?? noSelection;
  const selectedDomainItem =
    archive?.items.find((item) => item.id === selectedId) ?? null;
  const hasSelectedItem = selectedDomainItem !== null;
  const selectedSeasons =
    selectedItem.category === 'Series' ? (selectedItem.seasons ?? []) : [];
  const selectedEpisodes = selectedSeasons.flatMap((season) =>
    season.episodes.map((episode) => ({
      ...episode,
      seasonNumber: season.number,
    })),
  );
  const selectedEpisodeDetail = selectedEpisode
    ? (() => {
        const season = selectedSeasons.find(
          (entry) => entry.number === selectedEpisode.seasonNumber,
        );
        const episode = season?.episodes.find(
          (entry) => entry.number === selectedEpisode.episodeNumber,
        );
        return season && episode ? { season, episode } : null;
      })()
    : null;
  const selectedCompletedEpisodes = selectedEpisodes.filter(
    (episode) => episode.completed,
  ).length;
  const selectedProgress = getItemProgress(selectedItem);
  const selectedProgressPercent = Math.round(selectedProgress);
  const selectedPageTarget = getPageTarget(selectedItem);
  const selectedPageCurrent = selectedPageTarget
    ? Math.round((selectedProgress / 100) * selectedPageTarget)
    : null;
  const selectedProgressLabel = selectedPageTarget
    ? `Page ${selectedPageCurrent} of ${selectedPageTarget}`
    : selectedEpisodes.length > 0
      ? `${selectedCompletedEpisodes} of ${selectedEpisodes.length} episodes completed`
      : selectedItem.progressKind === 'count'
        ? selectedItem.progressText
        : selectedItem.next;

  useEffect(() => {
    setSelectedId((current) =>
      items.some((item) => item.id === current) ? current : null,
    );
  }, [items]);

  useEffect(() => {
    if (detailView !== 'expanded' && !selectedEpisode) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedEpisode) {
        setSelectedEpisode(null);
      } else {
        setDetailView('summary');
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [detailView, selectedEpisode]);

  const handleEditSelected = () => {
    if (!hasSelectedItem) return;
    const seasons = selectedDomainItem
      ? toSeriesSeasons(selectedDomainItem).map((season) => ({
          id: season.id,
          title: season.title,
          description: season.description ?? '',
          imageUrl: season.imageUrl ?? '',
          episodes: season.episodes.map((episode) => ({
            id: episode.id,
            title: episode.title,
            description: episode.description ?? '',
            imageUrl: episode.imageUrl ?? '',
            completed: episode.completed,
          })),
        }))
      : [];
    setNewItem({
      title: selectedItem.title,
      category: selectedItem.category,
      status: selectedItem.status,
      description: selectedItem.description,
      rating: selectedItem.rating?.toString() ?? '',
      notes: selectedDomainItem?.notes.join('\n') ?? '',
      tags: selectedItem.tags.join(', '),
      collections: selectedDomainItem?.collections.join(', ') ?? '',
      seasons,
    });
    setEditingItemId(selectedItem.id);
    setNewItemUsesPlaceholderCover(selectedItem.usePlaceholderCover);
    setDetailView('summary');
    setDrawerOpen(true);
  };

  const openNewItemDrawer = () => {
    setEditingItemId(null);
    setNewItem(emptyItemForm());
    setNewItemUsesPlaceholderCover(preferences.placeholderCovers);
    setDrawerOpen(true);
  };

  const closeItemDrawer = () => {
    setDrawerOpen(false);
    setEditingItemId(null);
  };

  const updateDraftSeason = (
    seasonId: string,
    update: Partial<SeriesDraftSeason>,
  ) => {
    setNewItem((state) => ({
      ...state,
      seasons: state.seasons.map((season) =>
        season.id === seasonId ? { ...season, ...update } : season,
      ),
    }));
  };

  const updateDraftEpisode = (
    seasonId: string,
    episodeId: string,
    update: Partial<SeriesDraftEpisode>,
  ) => {
    setNewItem((state) => ({
      ...state,
      seasons: state.seasons.map((season) =>
        season.id === seasonId
          ? {
              ...season,
              episodes: season.episodes.map((episode) =>
                episode.id === episodeId ? { ...episode, ...update } : episode,
              ),
            }
          : season,
      ),
    }));
  };

  const addDraftSeason = () => {
    setNewItem((state) => ({
      ...state,
      seasons: [...state.seasons, emptySeasonDraft()],
    }));
  };

  const removeDraftSeason = (seasonId: string) => {
    setNewItem((state) => ({
      ...state,
      seasons: state.seasons.filter((season) => season.id !== seasonId),
    }));
  };

  const addDraftEpisode = (seasonId: string) => {
    setNewItem((state) => ({
      ...state,
      seasons: state.seasons.map((season) =>
        season.id === seasonId
          ? { ...season, episodes: [...season.episodes, emptyEpisodeDraft()] }
          : season,
      ),
    }));
  };

  const removeDraftEpisode = (seasonId: string, episodeId: string) => {
    setNewItem((state) => ({
      ...state,
      seasons: state.seasons.map((season) =>
        season.id === seasonId
          ? {
              ...season,
              episodes: season.episodes.filter(
                (episode) => episode.id !== episodeId,
              ),
            }
          : season,
      ),
    }));
  };

  const handleReportBug = () => {
    if (typeof window !== 'undefined') {
      window.open(BUG_REPORT_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteSelected = async () => {
    if (!archive || !application.current || !selectedDomainItem) return;
    if (
      !window.confirm(
        `Delete “${selectedDomainItem.title}” from your local archive? This cannot be undone without a backup.`,
      )
    ) {
      return;
    }

    try {
      setArchive(
        await application.current.deleteItem(archive, selectedDomainItem.id),
      );
      setDetailView('summary');
      setSelectedId(null);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : 'Could not delete your item',
      );
    }
  };

  const handleProgressChange = async (value: number) => {
    if (!archive || !application.current || !selectedDomainItem) return;
    const target = selectedDomainItem.progress.target ?? 100;
    try {
      setArchive(
        await application.current.updateProgress(
          archive,
          selectedDomainItem.id,
          {
            ...selectedDomainItem.progress,
            current: (value / 100) * target,
            target,
          },
        ),
      );
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : 'Could not update progress',
      );
    }
  };

  const handleExportBackup = () => {
    if (!archive || !application.current) return;

    try {
      const backup = application.current.exportBackup(archive);
      const file = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const download = document.createElement('a');
      download.href = url;
      download.download = `open-personal-tracking-backup-${archive.exportedAt.slice(0, 10)}.json`;
      document.body.append(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setOperationError(null);
      setBackupStatus(
        'Backup downloaded. Keep this file somewhere you control.',
      );
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? `Could not export your backup: ${error.message}`
          : 'Could not export your backup',
      );
    }
  };

  const handleRestoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !application.current) return;

    try {
      const prepared = application.current.prepareRestore(await file.text());
      const itemLabel = prepared.items.length === 1 ? 'item' : 'items';
      if (
        !window.confirm(
          `Restore ${prepared.items.length} ${itemLabel} from “${file.name}”? This replaces the current local archive. Export a backup first if you need to keep the current data.`,
        )
      ) {
        return;
      }

      const restored = await application.current.restoreBackup(prepared);
      setArchive(restored);
      setSelectedId(null);
      setDetailView('summary');
      setSelectedEpisode(null);
      setOperationError(null);
      setBackupStatus(
        `Restored ${restored.items.length} ${restored.items.length === 1 ? 'item' : 'items'} from ${file.name}.`,
      );
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? `Could not restore this backup. Your current local archive was not changed: ${error.message}`
          : 'Could not restore this backup. Your current local archive was not changed.',
      );
    }
  };

  const handleTvTimeFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || !archive) return;

    try {
      const preview = previewTvTimeImport(
        (
          await Promise.all(
            files.map(async (file) =>
              file.name.toLowerCase().endsWith('.zip')
                ? extractTvTimeCsvFilesFromZip(
                    new Uint8Array(await file.arrayBuffer()),
                  )
                : [{ name: file.name, text: await file.text() }],
            ),
          )
        ).flat(),
        archive,
      );
      setTvTimePreview(preview);
      setTvTimeDuplicateResolution('skip');
      setOperationError(null);
      setBackupStatus(null);
      setTvTimeImportFeedback(null);
      setIsTvTimeImportFeedbackExiting(false);
    } catch (error) {
      setTvTimePreview(null);
      showTvTimeImportFeedback({
        kind: 'error',
        title: 'TV Time import could not start',
        message:
          error instanceof Error
            ? `Your local archive was not changed: ${error.message}`
            : 'Your local archive was not changed.',
      });
    }
  };

  const handleTvTimeImport = async () => {
    if (!archive || !application.current || !tvTimePreview || isTvTimeImporting)
      return;

    setIsTvTimeImporting(true);
    showTvTimeImportFeedback({
      kind: 'warning',
      title: 'Importing TV Time data',
      message: 'Your archive is being validated before local data is updated.',
    });
    try {
      const prepared = applyTvTimeImport(
        archive,
        tvTimePreview,
        tvTimeDuplicateResolution,
      );
      const restored = await application.current.restoreBackup(prepared);
      const importedCount =
        tvTimePreview.items.length -
        (tvTimeDuplicateResolution === 'skip'
          ? tvTimePreview.conflicts.length
          : 0);
      setArchive(restored);
      setTvTimePreview(null);
      setOperationError(null);
      setBackupStatus(null);
      showTvTimeImportFeedback({
        kind: importedCount > 0 ? 'success' : 'warning',
        title:
          importedCount > 0
            ? 'TV Time import complete'
            : 'No TV Time items were imported',
        message:
          importedCount > 0
            ? `${importedCount} ${importedCount === 1 ? 'item was' : 'items were'} saved to this device.`
            : 'Matching items were skipped, so your local archive was not changed.',
      });
    } catch (error) {
      showTvTimeImportFeedback({
        kind: 'error',
        title: 'TV Time import failed',
        message:
          error instanceof Error
            ? `Your local archive was not changed: ${error.message}`
            : 'Your local archive was not changed.',
      });
    } finally {
      setIsTvTimeImporting(false);
    }
  };

  const recordEpisodeWatch = async (episodeId: string) => {
    if (!archive || !application.current || !selectedDomainItem) return;

    try {
      setArchive(
        await application.current.watchSubunit(
          archive,
          selectedDomainItem.id,
          episodeId,
        ),
      );
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : 'Could not record this episode watch',
      );
    }
  };

  const visibleItems = useMemo(() => {
    if (!archive) return [];
    return filterItems(archive.items, {
      category: activeCategory === 'all' ? undefined : [activeCategory],
      query,
    }).map((item) => toTrackedItem(item, preferences.placeholderCovers));
  }, [activeCategory, archive, preferences.placeholderCovers, query]);

  const upNextItems = visibleItems.filter((item) => item.status === 'progress');
  const timeline = archive ? getHistoryTimeline(archive.history) : [];
  const isLibrary = activeNav === 'library';

  const handleSaveDrawer = async () => {
    if (!archive || !application.current || !newItem.title.trim()) return;
    const rating = newItem.rating.trim() ? Number(newItem.rating) : undefined;
    if (
      rating !== undefined &&
      (!Number.isFinite(rating) || rating < 0 || rating > 5)
    ) {
      setOperationError('Rating must be a number between 0 and 5');
      return;
    }
    const hasInvalidSeriesStructure =
      newItem.category === 'Series' &&
      newItem.seasons.some(
        (season) =>
          !season.title.trim() ||
          season.episodes.length === 0 ||
          season.episodes.some((episode) => !episode.title.trim()),
      );
    if (hasInvalidSeriesStructure) {
      setOperationError(
        'Each season needs a title and at least one titled episode before saving.',
      );
      return;
    }
    const subunits =
      newItem.category === 'Series' ? seriesSubunits(newItem.seasons) : [];

    try {
      const next = editingItemId
        ? await application.current.updateItem(archive, editingItemId, {
            title: newItem.title.trim(),
            category: newItem.category,
            type: newItem.category.toLowerCase(),
            status: toArchiveStatus(newItem.status),
            description: newItem.description.trim() || undefined,
            rating,
            notes: newItem.notes
              .split('\n')
              .map((note) => note.trim())
              .filter(Boolean),
            tags: listFromInput(newItem.tags),
            collections: listFromInput(newItem.collections),
            subunits,
            attributes: {
              ...selectedDomainItem?.attributes,
              usePlaceholderCover: newItemUsesPlaceholderCover,
            },
          })
        : await application.current.createItem(archive, {
            title: newItem.title.trim(),
            category: newItem.category,
            type: newItem.category.toLowerCase(),
            status: toArchiveStatus(newItem.status),
            progress: {
              current: newItem.status === 'completed' ? 100 : 0,
              target: 100,
              unit: 'percent',
            },
            description: newItem.description.trim() || undefined,
            rating,
            notes: newItem.notes
              .split('\n')
              .map((note) => note.trim())
              .filter(Boolean),
            tags: listFromInput(newItem.tags),
            collections: listFromInput(newItem.collections),
            subunits,
            attributes: { usePlaceholderCover: newItemUsesPlaceholderCover },
          });
      const savedItem = editingItemId ?? next.items.at(-1)?.id ?? null;
      setArchive(next);
      setSelectedId(savedItem);
      setNewItem(emptyItemForm());
      setEditingItemId(null);
      setDrawerOpen(false);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : 'Could not save your item',
      );
    }
  };

  if (storageError) {
    return (
      <main className="screen-panel">
        <p className="empty-state" role="alert">
          Your local archive could not be opened: {storageError}
        </p>
      </main>
    );
  }

  if (!archive) {
    return (
      <main className="screen-panel">
        <p className="empty-state" aria-live="polite">
          Loading your local archive…
        </p>
      </main>
    );
  }

  return (
    <div
      className="app-shell"
      aria-label="Open personal tracking application shell"
    >
      <ConnectionStatus placement="mobile" />
      {tvTimeImportFeedback && (
        <aside
          className={`connection-status connection-status--expanded ${
            tvTimeImportFeedback.kind === 'success'
              ? 'is-online'
              : tvTimeImportFeedback.kind === 'error'
                ? 'is-offline'
                : 'is-warning'
          } ${isTvTimeImportFeedbackExiting ? 'is-dismissing' : ''}`}
          role={tvTimeImportFeedback.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {tvTimeImportFeedback.kind === 'success' ? (
            <CircleCheck aria-hidden="true" />
          ) : (
            <CircleAlert aria-hidden="true" />
          )}
          <div>
            <strong>{tvTimeImportFeedback.title}</strong>
            <span>{tvTimeImportFeedback.message}</span>
          </div>
          <button
            className="connection-status-dismiss"
            type="button"
            onClick={dismissTvTimeImportFeedback}
            aria-label="Dismiss TV Time import notification"
          >
            <X aria-hidden="true" />
          </button>
        </aside>
      )}
      <aside className="sidebar" aria-label="Navigation sidebar">
        <a
          href="#"
          className="brand wordmark"
          aria-label="Open personal tracking home"
        >
          <span>open</span>
          <span className="dot">·</span>
          <span>personal</span>
          <span className="dot">·</span>
          <span>tracking</span>
        </a>

        <nav className="nav-group" aria-label="Primary navigation">
          <div className="nav-group-label">Main</div>

          <button
            type="button"
            className={`nav-item ${activeNav === 'library' ? 'is-active' : ''}`}
            onClick={() => setActiveNav('library')}
          >
            <span>
              <span className="nav-icon">
                <LibraryBig size={15} aria-hidden="true" />
              </span>
              Library
            </span>
            <span className="pill">{items.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeNav === 'discover' ? 'is-active' : ''}`}
            onClick={() => setActiveNav('discover')}
          >
            <span>
              <span className="nav-icon">
                <Compass size={15} aria-hidden="true" />
              </span>
              Discover
            </span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeNav === 'profile' ? 'is-active' : ''}`}
            onClick={() => setActiveNav('profile')}
          >
            <span>
              <span className="nav-icon">
                <UserRound size={15} aria-hidden="true" />
              </span>
              Profile
            </span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeNav === 'collections' ? 'is-active' : ''}`}
            onClick={() => setActiveNav('collections')}
          >
            <span>
              <span className="nav-icon">
                <FolderKanban size={15} aria-hidden="true" />
              </span>
              Collections
            </span>
            <span className="pill">{archive.collections.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeNav === 'history' ? 'is-active' : ''}`}
            onClick={() => setActiveNav('history')}
          >
            <span>
              <span className="nav-icon">
                <History size={15} aria-hidden="true" />
              </span>
              History
            </span>
          </button>
        </nav>

        <nav className="nav-group" aria-label="Secondary navigation">
          <div className="nav-group-label">Manage</div>

          <button
            type="button"
            className="nav-item"
            onClick={() => setActiveNav('import')}
          >
            <span>
              <span className="nav-icon">
                <ArrowUpFromLine size={15} aria-hidden="true" />
              </span>
              Import
            </span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => setActiveNav('export')}
          >
            <span>
              <span className="nav-icon">
                <ArrowDownToLine size={15} aria-hidden="true" />
              </span>
              Export
            </span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => setActiveNav('settings')}
          >
            <span>
              <span className="nav-icon">
                <Settings size={15} aria-hidden="true" />
              </span>
              Settings
            </span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <ConnectionStatus placement="desktop" />
          <div className="sidebar-meta" aria-live="polite">
            <div className="status-block">
              <span>Local sync</span>
              <span className="status-dot" aria-label="Connected locally" />
            </div>
            <strong>Local archive</strong>
            <div>{items.length} items stored on this device</div>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <h1 className="page-title">
            {activeNav === 'library'
              ? preferences.displayName
                ? `Hi, ${preferences.displayName}`
                : 'Library'
              : NAV_LABEL[activeNav]}
          </h1>

          <div className="topbar-actions">
            <label className="topbar-search" aria-label="Search your library">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search items, authors, or tags…"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-top"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </label>
            <button
              className="primary-btn"
              type="button"
              onClick={openNewItemDrawer}
            >
              <Plus size={14} aria-hidden="true" />
              New item
            </button>
          </div>
        </header>

        {operationError && (
          <p className="empty-state" role="alert">
            {operationError}
          </p>
        )}

        {isLibrary ? (
          <div
            className={`content ${hasSelectedItem ? '' : 'content--without-details'}`}
            id="panelLibrary"
          >
            <section
              className="library-panel"
              aria-labelledby="library-panel-title"
            >
              <div className="panel-header">
                <div className="panel-header-top">
                  <h2 id="library-panel-title" className="panel-title">
                    Your tracked items
                  </h2>
                  <span className="result-count" aria-live="polite">
                    {visibleItems.length} of {items.length} shown
                  </span>
                </div>

                <div className="panel-toolbar">
                  <label
                    className="search search-inline"
                    aria-label="Search your library"
                  >
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search items, authors, tags…"
                      autoComplete="off"
                    />
                    {query && (
                      <button
                        type="button"
                        className="search-clear"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                      >
                        &times;
                      </button>
                    )}
                    <kbd className="search-kbd">/</kbd>
                  </label>

                  <div className="panel-tools" aria-label="Filter by category">
                    {['all', 'Book', 'Film', 'Series', 'Game'].map(
                      (category) => (
                        <button
                          key={category}
                          type="button"
                          className={`filter-chip ${activeCategory === category ? 'is-selected' : ''}`}
                          onClick={() => setActiveCategory(category)}
                        >
                          {category === 'all' ? 'All' : category}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div
                className="stats-grid"
                aria-label="Library summary measurements"
              >
                <div className="stat-card">
                  <span className="stat-label">Total</span>
                  <div className="stat-value">{items.length}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">In progress</span>
                  <div className="stat-value">
                    {items.filter((item) => item.status === 'progress').length}
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Completed</span>
                  <div className="stat-value">
                    {items.filter((item) => item.status === 'completed').length}
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Collections</span>
                  <div className="stat-value">{archive.collections.length}</div>
                </div>
              </div>

              <div className="up-next" hidden={upNextItems.length === 0}>
                <p className="up-next-label">Up next</p>
                <div className="up-next-track">
                  {upNextItems.map((item) => (
                    <div key={item.id} className="up-next-card">
                      <span
                        className="up-next-cover"
                        style={{
                          backgroundImage: coverBackground(
                            item.image,
                            item.usePlaceholderCover,
                            'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.28))',
                          ),
                          backgroundColor: item.jacket,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                        aria-hidden="true"
                      />
                      <span className="up-next-info">
                        <span className="up-next-title">{item.title}</span>
                        <span className="up-next-next">{item.next}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {items.length === 0 ? (
                <div className="empty-state">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    aria-hidden="true"
                  >
                    <rect x="4" y="3" width="16" height="18" rx="1.5" />
                    <path d="M8 8h8M8 12h8M8 16h4" />
                  </svg>
                  <h3>Nothing tracked yet</h3>
                  <p>
                    Add the first thing you&apos;re reading, watching, or
                    playing. It stays on this device, no account needed.
                  </p>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={openNewItemDrawer}
                  >
                    Add your first item
                  </button>
                </div>
              ) : visibleItems.length === 0 ? (
                <p className="empty-state" style={{ display: 'block' }}>
                  No items match your search.
                </p>
              ) : (
                <div className="list" aria-label="Item list">
                  {GROUPS.map((group) => {
                    const items = visibleItems.filter(
                      (item) => bucketOf(item.status) === group.key,
                    );
                    if (!items.length) return null;

                    return (
                      <div key={group.key} className="item-group">
                        <div className="group-head">
                          <h3>{group.label}</h3>
                          <span className="n">{items.length}</span>
                        </div>

                        {items.map((item) => (
                          <article
                            key={item.id}
                            className={`item-row ${selectedId === item.id ? 'is-selected' : ''}`}
                            tabIndex={0}
                            onClick={() => setSelectedId(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedId(item.id);
                              }
                            }}
                          >
                            <div
                              className="item-cover"
                              aria-hidden="true"
                              style={{
                                backgroundImage: coverBackground(
                                  item.image,
                                  item.usePlaceholderCover,
                                  'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.35))',
                                ),
                                backgroundColor: item.jacket,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            >
                              <span>{item.title.charAt(0)}</span>
                            </div>

                            <div className="item-main">
                              <div className="item-head">
                                <h3 className="item-title">{item.title}</h3>
                                <span className="tag">{item.category}</span>
                                <span
                                  className={`status-chip status-${item.status}`}
                                >
                                  {STATUS_LABEL[item.status]}
                                </span>
                              </div>
                              <div className="item-meta">
                                <span>{item.creator}</span>
                                <span>•</span>
                                <span>{item.meta}</span>
                              </div>
                            </div>

                            <div className="item-right">
                              {item.progressKind === 'count' ? (
                                <span
                                  className="item-progress-count"
                                  aria-label={item.progressText}
                                >
                                  {item.value}
                                  <small>episodes</small>
                                </span>
                              ) : (
                                <div
                                  className="progress-ring"
                                  style={{
                                    ['--value' as string]:
                                      getItemProgress(item),
                                  }}
                                  aria-label={item.progressText}
                                >
                                  <span>
                                    {Math.round(getItemProgress(item))}%
                                  </span>
                                </div>
                              )}
                              <button
                                type="button"
                                className="mini-btn"
                                onClick={() => setSelectedId(item.id)}
                              >
                                Open
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <aside
              className="detail-panel"
              aria-label="Selected item details"
              hidden={!hasSelectedItem}
            >
              <div className="detail-header">
                <strong>Details</strong>
                <div className="detail-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => setDetailView('expanded')}
                    disabled={!hasSelectedItem}
                  >
                    Open page
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={handleEditSelected}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => void handleDeleteSelected()}
                    disabled={!hasSelectedItem}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="detail-body">
                <div className="detail-hero">
                  <div
                    className="detail-cover"
                    aria-hidden="true"
                    style={{
                      backgroundImage: coverBackground(
                        selectedItem.image,
                        selectedItem.usePlaceholderCover,
                        'linear-gradient(180deg, rgba(24,27,22,0.08), rgba(24,27,22,0.4))',
                      ),
                      backgroundColor: selectedItem.jacket,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="detail-copy">
                    <h2 className="detail-title">{selectedItem.title}</h2>
                    <div className="detail-meta">
                      <span className="tag">{selectedItem.category}</span>
                      {selectedItem.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="detail-credits">
                      <span>Author: {selectedItem.creator}</span>
                      <span>
                        Category: {selectedItem.category.toLowerCase()}
                      </span>
                      <span>Updated: 2 days ago</span>
                    </div>
                  </div>
                </div>

                <>
                  <section
                    className="detail-section"
                    aria-labelledby="description-label"
                  >
                    <h3 id="description-label" className="section-label">
                      Synopsis
                    </h3>
                    <p className="description">{selectedItem.description}</p>
                  </section>

                  <section
                    className="detail-section"
                    aria-labelledby="progress-label"
                  >
                    <h3 id="progress-label" className="section-label">
                      Progress
                    </h3>
                    {selectedItem.progressKind === 'count' ? (
                      <p className="detail-aggregate-progress">
                        {selectedProgressLabel}. TV Time did not provide season
                        or episode rows for this series in the selected export.
                      </p>
                    ) : (
                      <div className="progress-stack">
                        <div className="progress-line" aria-hidden="true">
                          <span
                            className="progress-bar"
                            style={{ width: `${selectedProgress}%` }}
                          />
                        </div>
                        <div className="progress-values">
                          <span>{selectedProgressLabel}</span>
                          <span>{selectedProgressPercent}%</span>
                        </div>
                      </div>
                    )}
                  </section>

                  {selectedItem.category === 'Series' && (
                    <section
                      className="detail-section detail-series-overview"
                      aria-labelledby="series-overview-label"
                    >
                      <div className="detail-series-overview-head">
                        <div>
                          <h3
                            id="series-overview-label"
                            className="section-label"
                          >
                            Seasons and episodes
                          </h3>
                          <p>
                            {selectedEpisodes.length > 0
                              ? `${selectedCompletedEpisodes} of ${selectedEpisodes.length} episodes watched`
                              : 'No episode structure has been added yet.'}
                          </p>
                        </div>
                        <button
                          className="mini-btn"
                          type="button"
                          onClick={handleEditSelected}
                        >
                          Edit episodes
                        </button>
                      </div>

                      {selectedSeasons.length > 0 ? (
                        <div className="detail-season-list">
                          {selectedSeasons.map((season) => {
                            const watchedEpisodes = season.episodes.filter(
                              (episode) => episode.completed,
                            ).length;
                            return (
                              <section
                                className="detail-season-summary"
                                key={season.id}
                              >
                                <div className="detail-season-summary-head">
                                  <strong>{season.title}</strong>
                                  <span>
                                    {watchedEpisodes}/{season.episodes.length}{' '}
                                    watched
                                  </span>
                                </div>
                                {season.description && (
                                  <p>{season.description}</p>
                                )}
                                <ul className="detail-episode-list">
                                  {season.episodes.map((episode) => (
                                    <li key={episode.id}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDetailView('expanded');
                                          setSelectedEpisode({
                                            seasonNumber: season.number,
                                            episodeNumber: episode.number,
                                          });
                                        }}
                                      >
                                        <span aria-hidden="true">
                                          {episode.completed ? '✓' : '○'}
                                        </span>
                                        <span>
                                          E{episode.number} · {episode.title}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="detail-series-empty">
                          {selectedItem.progressKind === 'count'
                            ? `${selectedItem.progressText} were imported, but TV Time did not include individual season or episode rows for this series.`
                            : 'Add seasons and episodes in edit mode to track them individually.'}
                        </p>
                      )}
                    </section>
                  )}

                  <section
                    className="detail-section"
                    aria-labelledby="attributes-label"
                  >
                    <h3 id="attributes-label" className="section-label">
                      Attributes
                    </h3>
                    <div
                      className="attribute-list"
                      aria-label="Item attributes"
                    >
                      <span className="attribute">
                        Rating: {selectedItem.rating ?? 'Not rated'}
                        {selectedItem.rating !== undefined ? '★' : ''}
                      </span>
                      <span className="attribute">
                        Status: {STATUS_LABEL[selectedItem.status]}
                      </span>
                      <span className="attribute">
                        Format: {selectedItem.meta}
                      </span>
                    </div>
                  </section>

                  <section
                    className="detail-section"
                    aria-labelledby="history-label"
                  >
                    <h3 id="history-label" className="section-label">
                      Recent history
                    </h3>
                    <ul
                      className="timeline"
                      aria-label="Recent changes timeline"
                    >
                      {timeline
                        .filter((entry) => entry.itemId === selectedItem.id)
                        .slice(0, 3)
                        .map((entry) => (
                          <li key={entry.id}>{entry.summary}</li>
                        ))}
                      {timeline.every(
                        (entry) => entry.itemId !== selectedItem.id,
                      ) && <li>No changes recorded for this item yet.</li>}
                    </ul>
                  </section>
                </>
              </div>
            </aside>
          </div>
        ) : (
          <div className="screen-panel">
            {activeNav === 'collections' && (
              <>
                <div className="screen-hero">
                  <div>
                    <span className="eyebrow">Collections</span>
                    <h2>Curated shelves</h2>
                    <p>
                      Organize your tracked items by mood, format, and purpose.
                    </p>
                  </div>
                  <button className="primary-btn" type="button">
                    New collection
                  </button>
                </div>
                <div className="screen-grid">
                  <div className="summary-card">
                    <span className="eyebrow">Total</span>
                    <strong>{archive.collections.length}</strong>
                    <span>Saved in your local archive</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Featured</span>
                    <strong>
                      {
                        archive.collections.filter(
                          (collection) => collection.itemIds.length > 0,
                        ).length
                      }
                    </strong>
                    <span>Containing tracked items</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Ready</span>
                    <strong>
                      {archive.collections.reduce(
                        (total, collection) =>
                          total + collection.itemIds.length,
                        0,
                      )}
                    </strong>
                    <span>Item references in total</span>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'discover' && (
              <>
                <div className="screen-hero discover-hero">
                  <div>
                    <span className="eyebrow">Discover</span>
                    <h2>
                      {preferences.displayName
                        ? `Made for ${preferences.displayName}`
                        : 'Make this library yours'}
                    </h2>
                    <p>
                      {preferences.activities.length
                        ? `Start with ${preferences.activities.join(', ')} and refine what you want to track.`
                        : 'Choose what you enjoy in Settings to make discovery useful.'}
                    </p>
                  </div>
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={openNewItemDrawer}
                  >
                    <Plus size={14} aria-hidden="true" />
                    Add to library
                  </button>
                </div>
                <div className="screen-grid discovery-grid">
                  <div className="summary-card">
                    <span className="eyebrow">Watch next</span>
                    <strong>{upNextItems.length}</strong>
                    <span>Items ready to continue</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Your genres</span>
                    <strong>{preferences.favoriteGenres.length || '—'}</strong>
                    <span>
                      {preferences.favoriteGenres.length
                        ? preferences.favoriteGenres.join(' · ')
                        : 'Set favourites in Settings'}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Local first</span>
                    <strong>0</strong>
                    <span>
                      External recommendations until a provider is connected
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'profile' && (
              <>
                <div className="screen-hero profile-hero">
                  <div>
                    <span className="eyebrow">Profile</span>
                    <h2>
                      {preferences.displayName || 'Your personal archive'}
                    </h2>
                    <p>
                      {preferences.activities.length
                        ? `Tracking ${preferences.activities.join(', ')} locally.`
                        : 'Set your tracking preferences to personalise this space.'}
                    </p>
                  </div>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => setActiveNav('settings')}
                  >
                    Edit preferences
                  </button>
                </div>
                <div className="screen-grid">
                  <div className="summary-card">
                    <span className="eyebrow">Tracked</span>
                    <strong>{items.length}</strong>
                    <span>Across your active categories</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Finished</span>
                    <strong>
                      {
                        items.filter((item) => item.status === 'completed')
                          .length
                      }
                    </strong>
                    <span>Saved in your history</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Language</span>
                    <strong>{preferences.locale === 'it' ? 'IT' : 'EN'}</strong>
                    <span>Saved with your preferences</span>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'history' && (
              <>
                <div className="screen-hero">
                  <div>
                    <span className="eyebrow">History</span>
                    <h2>Recent changes</h2>
                    <p>Every update stays local and exportable.</p>
                  </div>
                  <button className="ghost-btn" type="button">
                    Export log
                  </button>
                </div>
                <div className="layout-warmup">
                  <div className="content-card">
                    <span className="eyebrow">Timeline</span>
                    <ul className="timeline" aria-label="History timeline">
                      {timeline.map((entry) => (
                        <li key={entry.id}>{entry.summary}</li>
                      ))}
                      {timeline.length === 0 && (
                        <li>No changes recorded yet.</li>
                      )}
                    </ul>
                  </div>
                  <div className="content-card">
                    <span className="eyebrow">Summary</span>
                    <div className="list-stack">
                      <div className="mini-row">
                        <div>
                          <strong>{timeline.length} updates</strong>
                          <br />
                          <small>This week</small>
                        </div>
                      </div>
                      <div className="mini-row">
                        <div>
                          <strong>
                            {
                              timeline.filter(
                                (entry) => entry.action === 'imported',
                              ).length
                            }{' '}
                            imports
                          </strong>
                          <br />
                          <small>Last 30 days</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'export' && (
              <>
                <div className="screen-hero">
                  <div>
                    <span className="eyebrow">Export</span>
                    <h2>Share your archive</h2>
                    <p>
                      Keep everything in a durable, readable format you own.
                    </p>
                  </div>
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={handleExportBackup}
                  >
                    Export now
                  </button>
                </div>
                {backupStatus && activeNav === 'export' && (
                  <p className="empty-state" role="status">
                    {backupStatus}
                  </p>
                )}
                <div className="screen-grid">
                  <div className="summary-card">
                    <span className="eyebrow">Last export</span>
                    <strong>On demand</strong>
                    <span>
                      Download a complete archive whenever you need one
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Format</span>
                    <strong>JSON</strong>
                    <span>Portable, inspectable, re-importable</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Backup</span>
                    <strong>Local</strong>
                    <span>Export creates a copy you control</span>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'settings' && (
              <>
                <div className="screen-hero">
                  <div>
                    <span className="eyebrow">Settings</span>
                    <h2>Preferences</h2>
                    <p>Keep the app local-first and comfy to use.</p>
                  </div>
                  <button className="ghost-btn" type="button">
                    Reset defaults
                  </button>
                </div>
                <div className="setting-card">
                  <h3>Appearance</h3>
                  <div className="theme-switch" aria-label="Theme switcher">
                    {(['auto', 'light', 'dark'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`theme-btn ${themeMode === mode ? 'is-active' : ''}`}
                        data-theme-option={mode}
                        onClick={() => setThemeMode(mode)}
                      >
                        {mode === 'auto'
                          ? 'Auto'
                          : mode === 'light'
                            ? 'Light'
                            : 'Dark'}
                      </button>
                    ))}
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Language</strong>
                      <br />
                      <small>
                        Used for your app preferences and future catalog results
                      </small>
                    </div>
                    <select
                      className="setting-select"
                      value={preferences.locale}
                      onChange={(event) =>
                        savePreferences({
                          ...preferences,
                          locale: event.target
                            .value as UserPreferences['locale'],
                        })
                      }
                    >
                      <option value="en">English</option>
                      <option value="it">Italiano</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Follow system theme</strong>
                      <br />
                      <small>Sync with your computer settings</small>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={themeMode === 'auto'}
                        onChange={(event) =>
                          setThemeMode(event.target.checked ? 'auto' : 'dark')
                        }
                      />
                      <i />
                    </label>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Placeholder covers</strong>
                      <br />
                      <small>
                        Use a neutral cover when an item has no artwork
                      </small>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={preferences.placeholderCovers}
                        onChange={(event) =>
                          void savePreferences({
                            ...preferences,
                            placeholderCovers: event.target.checked,
                          })
                        }
                      />
                      <i />
                    </label>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Compact cards</strong>
                      <br />
                      <small>Denser list layout</small>
                    </div>
                    <label className="switch">
                      <input type="checkbox" />
                      <i />
                    </label>
                  </div>
                  <div className="setting-row setting-row--stacked">
                    <div>
                      <strong>Roadmap</strong>
                      <br />
                      <small>See what is coming next</small>
                    </div>
                    <a
                      className="inline-link"
                      href={ROADMAP_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Open roadmap
                    </a>
                  </div>
                  <div className="setting-row setting-row--stacked">
                    <div>
                      <strong>Report a bug</strong>
                      <br />
                      <small>Share a quick issue with the team</small>
                    </div>
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={handleReportBug}
                    >
                      Report
                    </button>
                  </div>
                  <div className="setting-card app-about-card">
                    <span className="eyebrow">About this app</span>
                    <h3>Preview build</h3>
                    <p>
                      This local-first preview is not a published release yet.
                      Published release notes will appear here once the project
                      ships tagged versions.
                    </p>
                    <div className="app-about-actions">
                      <a
                        className="inline-link"
                        href={CHANGELOG_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Repository changelog
                      </a>
                      <a
                        className="inline-link"
                        href={ROADMAP_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Roadmap
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'import' && (
              <>
                <div className="screen-hero">
                  <div>
                    <span className="eyebrow">Restore</span>
                    <h2>Restore a local backup</h2>
                    <p>
                      Choose a JSON backup exported by this app. It is validated
                      before it can replace your current local archive.
                    </p>
                  </div>
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => restoreInput.current?.click()}
                  >
                    Select backup
                  </button>
                  <input
                    ref={restoreInput}
                    type="file"
                    accept="application/json,.json"
                    aria-label="Select an Open Personal Tracking JSON backup"
                    onChange={(event) => void handleRestoreBackup(event)}
                    hidden
                  />
                </div>
                <p className="empty-state">
                  Restoring replaces the current archive only after the backup
                  passes migration and validation. Invalid or unsupported files
                  leave your current data unchanged.
                </p>
                {backupStatus && (
                  <p className="empty-state" role="status">
                    {backupStatus}
                  </p>
                )}
                <section
                  className="content-card tvtime-import-card"
                  aria-labelledby="tvTimeImportTitle"
                >
                  <div className="tvtime-import-head">
                    <Image
                      className="tvtime-import-logo"
                      src="/images/tvtime-logo.png"
                      alt="TV Time"
                      width={48}
                      height={48}
                    />
                    <div>
                      <span className="eyebrow">TV Time import</span>
                      <h3 id="tvTimeImportTitle">Bring your history home</h3>
                      <p>
                        Import a TV Time GDPR export without sharing it with
                        another service.
                      </p>
                    </div>
                    <span className="tvtime-import-status">
                      {tvTimePreview ? 'Ready to review' : 'Local only'}
                    </span>
                  </div>
                  <ol className="tvtime-import-steps">
                    <li>
                      <strong>1. Choose your export</strong>
                      <span>
                        Use the GDPR ZIP file, or its extracted CSV files.
                      </span>
                    </li>
                    <li>
                      <strong>2. Review safely</strong>
                      <span>
                        See supported data, limitations, and duplicates first.
                      </span>
                    </li>
                    <li>
                      <strong>3. Confirm the import</strong>
                      <span>
                        Your current archive stays unchanged until confirmation.
                      </span>
                    </li>
                  </ol>
                  <div className="tvtime-import-actions">
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => tvTimeInput.current?.click()}
                    >
                      Choose TV Time export
                    </button>
                    <span>ZIP recommended · CSV also supported</span>
                  </div>
                  <input
                    ref={tvTimeInput}
                    type="file"
                    accept="application/zip,.zip,text/csv,.csv"
                    aria-label="Select TV Time ZIP or CSV files"
                    multiple
                    onChange={(event) => void handleTvTimeFiles(event)}
                    hidden
                  />
                  <p className="field-help tvtime-import-help">
                    Processed only in this browser. Supported source tables are
                    checked before your archive can change.
                  </p>
                </section>

                {tvTimePreview && (
                  <section
                    className="content-card tvtime-preview-card"
                    aria-labelledby="tvTimePreviewTitle"
                  >
                    <div className="tvtime-preview-head">
                      <div>
                        <span className="eyebrow">Step 2 of 3 · Preview</span>
                        <h3 id="tvTimePreviewTitle">Review TV Time import</h3>
                        <p>
                          Nothing has changed in your archive yet. Confirm only
                          after reviewing the summary below.
                        </p>
                      </div>
                      <span className="tvtime-preview-safe">
                        No changes yet
                      </span>
                    </div>
                    <dl className="tvtime-preview-summary">
                      <div>
                        <dt>Ready to import</dt>
                        <dd>
                          {tvTimePreview.items.length}{' '}
                          {tvTimePreview.items.length === 1 ? 'item' : 'items'}
                        </dd>
                      </div>
                      <div>
                        <dt>Recognised source</dt>
                        <dd>
                          {tvTimePreview.files.length}{' '}
                          {tvTimePreview.files.length === 1 ? 'file' : 'files'}
                        </dd>
                      </div>
                      <div>
                        <dt>Episodes found</dt>
                        <dd>
                          {tvTimePreview.seriesStructure.episodeCount > 0
                            ? `${tvTimePreview.seriesStructure.episodeCount} across ${tvTimePreview.seriesStructure.seasonCount} ${tvTimePreview.seriesStructure.seasonCount === 1 ? 'season' : 'seasons'}`
                            : 'None in selected files'}
                        </dd>
                      </div>
                      <div>
                        <dt>Needs attention</dt>
                        <dd>
                          {tvTimePreview.conflicts.length +
                            tvTimePreview.warnings.length}{' '}
                          notes
                        </dd>
                      </div>
                    </dl>
                    {tvTimePreview.seriesStructure.episodeCount > 0 && (
                      <p className="tvtime-preview-structure">
                        {tvTimePreview.seriesStructure.episodeCount} watched{' '}
                        {tvTimePreview.seriesStructure.episodeCount === 1
                          ? 'episode'
                          : 'episodes'}{' '}
                        will be added to{' '}
                        {tvTimePreview.seriesStructure.seriesCount}{' '}
                        {tvTimePreview.seriesStructure.seriesCount === 1
                          ? 'series'
                          : 'series'}
                        . To add them to a matching series already in your
                        library, choose “Update their TV Time progress and
                        status” below.
                      </p>
                    )}
                    {tvTimePreview.conflicts.length > 0 && (
                      <fieldset className="setting-row">
                        <legend>Matching local items</legend>
                        <p>
                          {tvTimePreview.conflicts.length}{' '}
                          {tvTimePreview.conflicts.length === 1
                            ? 'duplicate was'
                            : 'duplicates were'}{' '}
                          found. Choose how to handle them before importing.
                        </p>
                        <label>
                          <input
                            type="radio"
                            name="tv-time-duplicate-resolution"
                            checked={tvTimeDuplicateResolution === 'skip'}
                            onChange={() => {
                              setTvTimeDuplicateResolution('skip');
                              showTvTimeImportFeedback({
                                kind: 'warning',
                                title: 'Skip matching items selected',
                                message:
                                  'Click Confirm import to apply this choice.',
                              });
                            }}
                          />{' '}
                          Skip matching items
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="tv-time-duplicate-resolution"
                            checked={tvTimeDuplicateResolution === 'update'}
                            onChange={() => {
                              setTvTimeDuplicateResolution('update');
                              showTvTimeImportFeedback({
                                kind: 'warning',
                                title: 'Update matching items selected',
                                message:
                                  'Click Confirm import to apply this choice.',
                              });
                            }}
                          />{' '}
                          Update their TV Time progress and status, keeping
                          local notes and collections
                        </label>
                      </fieldset>
                    )}
                    {tvTimePreview.warnings.length > 0 && (
                      <section
                        className="tvtime-preview-notes"
                        aria-labelledby="tvTimeImportNotes"
                      >
                        <h4 id="tvTimeImportNotes">
                          What will not be imported
                        </h4>
                        <ul>
                          {tvTimePreview.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                    <div className="inline-actions">
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => void handleTvTimeImport()}
                        disabled={isTvTimeImporting}
                      >
                        {isTvTimeImporting
                          ? 'Importing…'
                          : tvTimeDuplicateResolution === 'update'
                            ? 'Confirm import and update matches'
                            : 'Confirm import and skip matches'}
                      </button>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => setTvTimePreview(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {MOBILE_NAV_ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`bottom-nav-item ${activeNav === key ? 'is-active' : ''}`}
            onClick={() => setActiveNav(key)}
          >
            <Icon
              size={19}
              strokeWidth={activeNav === key ? 2.35 : 1.8}
              aria-hidden="true"
            />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {detailView === 'expanded' && hasSelectedItem && (
        <div className="detail-page-layer" role="presentation">
          <button
            className="detail-page-backdrop"
            type="button"
            aria-label="Close item detail"
            onClick={() => setDetailView('summary')}
          />
          <article
            className="detail-page"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detailPageTitle"
          >
            <header className="detail-page-header">
              <div>
                <span className="eyebrow">
                  Your library / {selectedItem.category}
                </span>
                <p>Item details</p>
              </div>
              <div className="detail-actions">
                <button
                  type="button"
                  className="mini-btn"
                  onClick={handleEditSelected}
                >
                  Edit item
                </button>
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => void handleDeleteSelected()}
                >
                  Delete item
                </button>
                <button
                  type="button"
                  className="detail-page-close"
                  aria-label="Close item detail"
                  onClick={() => setDetailView('summary')}
                >
                  <X size={19} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="detail-page-body">
              <section className="detail-page-hero">
                <div
                  className="detail-page-cover"
                  aria-hidden="true"
                  style={{
                    backgroundImage: coverBackground(
                      selectedItem.image,
                      selectedItem.usePlaceholderCover,
                      'linear-gradient(180deg, rgba(24,27,22,0.05), rgba(24,27,22,0.46))',
                    ),
                    backgroundColor: selectedItem.jacket,
                  }}
                />
                <div className="detail-page-intro">
                  <div className="detail-page-title-row">
                    <h2 id="detailPageTitle">{selectedItem.title}</h2>
                    <span
                      className={`status-chip status-${selectedItem.status}`}
                    >
                      {STATUS_LABEL[selectedItem.status]}
                    </span>
                  </div>
                  <div className="detail-meta">
                    <span className="tag">{selectedItem.category}</span>
                    {selectedItem.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="detail-page-description">
                    {selectedItem.description}
                  </p>
                  <dl className="detail-facts">
                    <div>
                      <dt>Creator</dt>
                      <dd>{selectedItem.creator}</dd>
                    </div>
                    <div>
                      <dt>Format</dt>
                      <dd>{selectedItem.meta}</dd>
                    </div>
                    <div>
                      <dt>Last updated</dt>
                      <dd>2 days ago</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <div className="detail-page-grid">
                <section
                  className="detail-page-card detail-page-progress"
                  aria-labelledby="detailPageProgress"
                >
                  <div className="detail-progress-head">
                    <h3 id="detailPageProgress" className="section-label">
                      Progress
                    </h3>
                    <strong>
                      {selectedItem.progressKind === 'count'
                        ? selectedItem.progressText
                        : `${selectedProgressPercent}%`}
                    </strong>
                  </div>
                  {selectedItem.progressKind === 'count' ? (
                    <p className="detail-progress-note">
                      TV Time supplied only this aggregate watched-episode count
                      for the series. It did not supply individual season or
                      episode rows.
                    </p>
                  ) : selectedEpisodes.length > 0 ? (
                    <p className="detail-progress-note">
                      For a series, progress is calculated from completed
                      episodes. A season completes only when every episode in it
                      is marked complete.
                    </p>
                  ) : (
                    <input
                      aria-label={
                        selectedPageTarget
                          ? 'Adjust current page'
                          : 'Adjust progress percentage'
                      }
                      className="progress-slider"
                      type="range"
                      min={0}
                      max={selectedPageTarget ?? 100}
                      step={1}
                      value={selectedPageCurrent ?? selectedProgress}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        handleProgressChange(
                          selectedPageTarget
                            ? (value / selectedPageTarget) * 100
                            : value,
                        );
                      }}
                    />
                  )}
                  <div className="progress-values">
                    <span>{selectedProgressLabel}</span>
                    {selectedItem.progressKind !== 'count' && (
                      <span>{selectedProgressPercent}% complete</span>
                    )}
                  </div>
                </section>

                {selectedEpisodes.length > 0 && (
                  <section
                    className="detail-page-card detail-page-seasons"
                    aria-labelledby="detailPageSeasons"
                  >
                    <div className="detail-seasons-heading">
                      <div>
                        <h3 id="detailPageSeasons" className="section-label">
                          Seasons and episodes
                        </h3>
                        <p>
                          Mark an episode complete to update the season and
                          series progress.
                        </p>
                      </div>
                      <span className="detail-season-total">
                        {
                          selectedSeasons.filter((season) =>
                            season.episodes.every(
                              (episode) => episode.completed,
                            ),
                          ).length
                        }{' '}
                        / {selectedSeasons.length} seasons complete
                      </span>
                    </div>
                    <div className="season-list">
                      {selectedSeasons.map((season) => {
                        const completedCount = season.episodes.filter(
                          (episode) => episode.completed,
                        ).length;
                        const isComplete =
                          completedCount === season.episodes.length;
                        return (
                          <section
                            key={season.number}
                            className={`season-card ${isComplete ? 'is-complete' : ''}`}
                          >
                            <div className="season-card-head">
                              <div>
                                <h4>{season.title}</h4>
                                {season.description && (
                                  <p className="season-card-description">
                                    {season.description}
                                  </p>
                                )}
                                <span>
                                  {completedCount} of {season.episodes.length}{' '}
                                  episodes complete
                                </span>
                              </div>
                              <span className="season-status">
                                {isComplete ? 'Complete' : 'In progress'}
                              </span>
                            </div>
                            <div className="episode-list">
                              {season.episodes.map((episode) => {
                                const isComplete = episode.completed;
                                return (
                                  <div
                                    key={episode.number}
                                    className={`episode-card ${isComplete ? 'is-complete' : ''}`}
                                    style={{
                                      backgroundImage: coverBackground(
                                        episode.imageUrl ??
                                          season.imageUrl ??
                                          selectedItem.image,
                                        selectedItem.usePlaceholderCover,
                                        'linear-gradient(180deg, rgba(10,12,15,0.05) 18%, rgba(10,12,15,0.85) 100%)',
                                      ),
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="episode-card-detail"
                                      aria-label={`Open ${season.title}, episode ${episode.number}, ${episode.title}`}
                                      onClick={() =>
                                        setSelectedEpisode({
                                          seasonNumber: season.number,
                                          episodeNumber: episode.number,
                                        })
                                      }
                                    >
                                      <span className="episode-card-copy">
                                        <span className="episode-card-code">
                                          S{season.number} · E{episode.number}
                                        </span>
                                        <strong>{episode.title}</strong>
                                        <span>
                                          {isComplete
                                            ? 'Watched'
                                            : 'Mark as watched'}
                                        </span>
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      className="episode-card-state"
                                      aria-label={`${isComplete ? 'Rewatch' : 'Mark as watched'}: ${season.title}, episode ${episode.number}`}
                                      onClick={() =>
                                        void recordEpisodeWatch(episode.id)
                                      }
                                    >
                                      {isComplete ? '↻' : '+'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section
                  className="detail-page-card"
                  aria-labelledby="detailPageAttributes"
                >
                  <h3 id="detailPageAttributes" className="section-label">
                    Attributes
                  </h3>
                  <div className="attribute-list">
                    <span className="attribute">
                      Rating: {selectedItem.rating ?? 'Not rated'}
                      {selectedItem.rating !== undefined ? '★' : ''}
                    </span>
                    <span className="attribute">
                      Status: {STATUS_LABEL[selectedItem.status]}
                    </span>
                    <span className="attribute">
                      Progress target:{' '}
                      {selectedDomainItem?.progress.target ?? 'Not set'}{' '}
                      {selectedDomainItem?.progress.target !== undefined
                        ? progressUnitLabel(
                            selectedDomainItem,
                            selectedDomainItem.progress.target,
                          )
                        : ''}
                    </span>
                    <span className="attribute">Local only</span>
                  </div>
                </section>

                <section
                  className="detail-page-card"
                  aria-labelledby="detailPageNotes"
                >
                  <h3 id="detailPageNotes" className="section-label">
                    Highlights
                  </h3>
                  <ul className="detail-page-list">
                    <li>Personal notes are stored locally with this item.</li>
                    <li>
                      Keep the next action visible without opening another app.
                    </li>
                    <li>Your archive remains exportable at any time.</li>
                  </ul>
                </section>

                <section
                  className="detail-page-card"
                  aria-labelledby="detailPageHistory"
                >
                  <h3 id="detailPageHistory" className="section-label">
                    Recent history
                  </h3>
                  <ul className="timeline">
                    {timeline
                      .filter((entry) => entry.itemId === selectedItem.id)
                      .slice(0, 4)
                      .map((entry) => (
                        <li key={entry.id}>{entry.summary}</li>
                      ))}
                    {timeline.every(
                      (entry) => entry.itemId !== selectedItem.id,
                    ) && <li>No changes recorded for this item yet.</li>}
                  </ul>
                </section>
              </div>
            </div>
          </article>
        </div>
      )}

      {detailView === 'expanded' && selectedEpisodeDetail && (
        <div className="episode-detail-layer" role="presentation">
          <button
            className="episode-detail-backdrop"
            type="button"
            aria-label="Close episode details"
            onClick={() => setSelectedEpisode(null)}
          />
          <article
            className="episode-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="episodeDetailTitle"
          >
            <header className="episode-detail-header">
              <div>
                <span className="eyebrow">
                  {selectedItem.title} / {selectedEpisodeDetail.season.title}
                </span>
                <p>Episode details</p>
              </div>
              <button
                type="button"
                className="detail-page-close"
                aria-label="Close episode details"
                onClick={() => setSelectedEpisode(null)}
              >
                <X size={19} aria-hidden="true" />
              </button>
            </header>
            <div className="episode-detail-body">
              <div
                className="episode-detail-image"
                aria-hidden="true"
                style={{
                  backgroundImage: coverBackground(
                    selectedEpisodeDetail.episode.imageUrl ??
                      selectedEpisodeDetail.season.imageUrl ??
                      selectedItem.image,
                    selectedItem.usePlaceholderCover,
                    'linear-gradient(180deg, rgba(10,12,15,0.06), rgba(10,12,15,0.7))',
                  ),
                }}
              />
              <div className="episode-detail-copy">
                <span className="episode-detail-code">
                  Season {selectedEpisodeDetail.season.number} · Episode{' '}
                  {selectedEpisodeDetail.episode.number}
                </span>
                <h2 id="episodeDetailTitle">
                  {selectedEpisodeDetail.episode.title}
                </h2>
                <span
                  className={`episode-detail-status ${selectedEpisodeDetail.episode.completed ? 'is-complete' : ''}`}
                >
                  {selectedEpisodeDetail.episode.completed
                    ? 'Watched'
                    : 'Not watched'}
                </span>
                <dl className="episode-detail-facts">
                  <div>
                    <dt>Series</dt>
                    <dd>{selectedItem.title}</dd>
                  </div>
                  <div>
                    <dt>Season</dt>
                    <dd>{selectedEpisodeDetail.season.title}</dd>
                  </div>
                  <div>
                    <dt>Episode</dt>
                    <dd>{selectedEpisodeDetail.episode.number}</dd>
                  </div>
                </dl>
                <section
                  className="episode-detail-summary"
                  aria-labelledby="episodeSummaryTitle"
                >
                  <h3 id="episodeSummaryTitle" className="section-label">
                    Synopsis
                  </h3>
                  <p>
                    {selectedEpisodeDetail.episode.description ||
                      'No synopsis has been added for this episode yet.'}
                  </p>
                </section>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    void recordEpisodeWatch(selectedEpisodeDetail.episode.id)
                  }
                >
                  {selectedEpisodeDetail.episode.completed
                    ? 'Rewatch episode'
                    : 'Mark as watched'}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {onboardingOpen && (
        <div className="onboarding-layer" role="presentation">
          <div className="onboarding-orbit onboarding-orbit-one" />
          <div className="onboarding-orbit onboarding-orbit-two" />
          <section
            className="onboarding-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboardingTitle"
          >
            <div
              className="onboarding-progress"
              aria-label={`Step ${onboardingStep + 1} of 3`}
            >
              {[0, 1, 2].map((step) => (
                <span
                  key={step}
                  className={step <= onboardingStep ? 'is-active' : ''}
                />
              ))}
            </div>
            {onboardingStep === 0 && (
              <div className="onboarding-step">
                <span className="eyebrow">Your archive, your rules</span>
                <h2 id="onboardingTitle">
                  Start with the things that matter to you.
                </h2>
                <p>
                  No account required. These preferences stay on this device and
                  are included in the archive model for export.
                </p>
                <label className="onboarding-field">
                  What should we call you?
                  <input
                    autoFocus
                    value={preferences.displayName}
                    onChange={(event) =>
                      void savePreferences({
                        ...preferences,
                        displayName: event.target.value,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        setOnboardingStep(1);
                      }
                    }}
                    placeholder="Your name"
                    maxLength={80}
                  />
                </label>
              </div>
            )}
            {onboardingStep === 1 && (
              <div className="onboarding-step">
                <span className="eyebrow">Choose your worlds</span>
                <h2 id="onboardingTitle">What do you want to track?</h2>
                <p>Choose every category you use. You can change this later.</p>
                <div className="onboarding-option-grid">
                  {ACTIVITY_OPTIONS.map((activity) => {
                    const active = preferences.activities.includes(
                      activity.key,
                    );
                    return (
                      <button
                        key={activity.key}
                        type="button"
                        className={`onboarding-option ${active ? 'is-selected' : ''}`}
                        aria-pressed={active}
                        onClick={() =>
                          void savePreferences({
                            ...preferences,
                            activities: active
                              ? preferences.activities.filter(
                                  (entry) => entry !== activity.key,
                                )
                              : [...preferences.activities, activity.key],
                          })
                        }
                      >
                        {activity.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="onboarding-step">
                <span className="eyebrow">Make discovery useful</span>
                <h2 id="onboardingTitle">Pick a few favourite genres.</h2>
                <p>
                  They will guide local search filters and future optional
                  catalog discovery.
                </p>
                <div className="onboarding-option-grid genres">
                  {GENRE_OPTIONS.map((genre) => {
                    const active = preferences.favoriteGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        className={`onboarding-option ${active ? 'is-selected' : ''}`}
                        aria-pressed={active}
                        onClick={() =>
                          void savePreferences({
                            ...preferences,
                            favoriteGenres: active
                              ? preferences.favoriteGenres.filter(
                                  (entry) => entry !== genre,
                                )
                              : [...preferences.favoriteGenres, genre],
                          })
                        }
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="onboarding-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() =>
                  onboardingStep > 0
                    ? setOnboardingStep(onboardingStep - 1)
                    : undefined
                }
              >
                {onboardingStep === 0 ? 'Local-first' : 'Back'}
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  if (onboardingStep < 2) {
                    setOnboardingStep(onboardingStep + 1);
                  } else {
                    void savePreferences({
                      ...preferences,
                      onboardingCompleted: true,
                    });
                    setOnboardingOpen(false);
                  }
                }}
              >
                {onboardingStep === 2 ? 'Open my archive' : 'Continue'}
              </button>
            </div>
          </section>
        </div>
      )}

      {drawerOpen && (
        <>
          <div className="drawer-overlay is-open" onClick={closeItemDrawer} />
          <aside
            className="add-drawer is-open"
            role="dialog"
            aria-modal="true"
            aria-labelledby="addDrawerTitle"
          >
            <div className="add-drawer-head">
              <h3 id="addDrawerTitle">New item</h3>
              <button
                className="add-drawer-close"
                type="button"
                onClick={closeItemDrawer}
              >
                &times;
              </button>
            </div>

            <div className="add-drawer-body">
              <div>
                <label className="field-label" htmlFor="fTitle">
                  Title
                </label>
                <input
                  className="field-control"
                  id="fTitle"
                  type="text"
                  value={newItem.title}
                  onChange={(event) =>
                    setNewItem((state) => ({
                      ...state,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Dune"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="fCategory">
                  Category
                </label>
                <select
                  className="field-control"
                  id="fCategory"
                  value={newItem.category}
                  onChange={(event) =>
                    setNewItem((state) => ({
                      ...state,
                      category: event.target.value,
                    }))
                  }
                >
                  <option value="Book">Book</option>
                  <option value="Film">Film</option>
                  <option value="Series">Series</option>
                  <option value="Manga">Manga</option>
                  <option value="Anime">Anime</option>
                  <option value="Game">Game</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="fDescription">
                  Description
                </label>
                <textarea
                  className="field-control"
                  id="fDescription"
                  value={newItem.description}
                  onChange={(event) =>
                    setNewItem((state) => ({
                      ...state,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Your private description"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="fRating">
                  Rating
                </label>
                <input
                  className="field-control"
                  id="fRating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={newItem.rating}
                  onChange={(event) =>
                    setNewItem((state) => ({
                      ...state,
                      rating: event.target.value,
                    }))
                  }
                  placeholder="0–5"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="fTags">
                  Tags
                </label>
                <input
                  className="field-control"
                  id="fTags"
                  type="text"
                  value={newItem.tags}
                  onChange={(event) =>
                    setNewItem((state) => ({
                      ...state,
                      tags: event.target.value,
                    }))
                  }
                  placeholder="e.g. science fiction, favourite"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="fCollections">
                  Collections
                </label>
                <input
                  className="field-control"
                  id="fCollections"
                  type="text"
                  value={newItem.collections}
                  onChange={(event) =>
                    setNewItem((state) => ({
                      ...state,
                      collections: event.target.value,
                    }))
                  }
                  placeholder="e.g. favourites, read later"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="fNotes">
                  Private notes
                </label>
                <textarea
                  className="field-control"
                  id="fNotes"
                  value={newItem.notes}
                  onChange={(event) =>
                    setNewItem((state) => ({
                      ...state,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="One note per line"
                />
              </div>

              <div>
                <label className="field-label">Status</label>
                <div className="panel-tools">
                  {Object.entries(STATUS_LABEL).map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-chip ${newItem.status === status ? 'is-selected' : ''}`}
                      onClick={() =>
                        setNewItem((state) => ({ ...state, status }))
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {newItem.category === 'Series' && (
                <section
                  className="series-editor"
                  aria-labelledby="seriesEditorTitle"
                >
                  <div className="series-editor-head">
                    <div>
                      <span className="eyebrow">Series structure</span>
                      <h4 id="seriesEditorTitle">Seasons and episodes</h4>
                      <p>
                        Add the episodes you want to track. Series progress is
                        calculated from episodes marked as watched.
                      </p>
                    </div>
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={addDraftSeason}
                    >
                      Add season
                    </button>
                  </div>

                  {newItem.seasons.length === 0 ? (
                    <p className="series-editor-empty">
                      No seasons yet. You can save a series without episode
                      tracking, or add a season to track its progress.
                    </p>
                  ) : (
                    <div className="series-editor-list">
                      {newItem.seasons.map((season, seasonIndex) => (
                        <section
                          key={season.id}
                          className="series-draft-season"
                        >
                          <div className="series-draft-head">
                            <h5>Season {seasonIndex + 1}</h5>
                            <button
                              className="mini-btn"
                              type="button"
                              onClick={() => removeDraftSeason(season.id)}
                            >
                              Remove season
                            </button>
                          </div>
                          <label
                            className="field-label"
                            htmlFor={`season-title-${season.id}`}
                          >
                            Season {seasonIndex + 1} title
                          </label>
                          <input
                            className="field-control"
                            id={`season-title-${season.id}`}
                            value={season.title}
                            onChange={(event) =>
                              updateDraftSeason(season.id, {
                                title: event.target.value,
                              })
                            }
                            placeholder={`Season ${seasonIndex + 1}`}
                          />
                          <label
                            className="field-label"
                            htmlFor={`season-description-${season.id}`}
                          >
                            Season {seasonIndex + 1} information
                          </label>
                          <textarea
                            className="field-control"
                            id={`season-description-${season.id}`}
                            value={season.description}
                            onChange={(event) =>
                              updateDraftSeason(season.id, {
                                description: event.target.value,
                              })
                            }
                            placeholder="Private notes or a short description"
                          />
                          <label
                            className="field-label"
                            htmlFor={`season-image-${season.id}`}
                          >
                            Season {seasonIndex + 1} image URL
                          </label>
                          <input
                            className="field-control"
                            id={`season-image-${season.id}`}
                            type="url"
                            value={season.imageUrl}
                            onChange={(event) =>
                              updateDraftSeason(season.id, {
                                imageUrl: event.target.value,
                              })
                            }
                            placeholder="https://…"
                          />

                          <div className="series-draft-episodes">
                            <div className="series-draft-head">
                              <h6>Episodes</h6>
                              <button
                                className="mini-btn"
                                type="button"
                                onClick={() => addDraftEpisode(season.id)}
                              >
                                Add episode
                              </button>
                            </div>
                            {season.episodes.map((episode, episodeIndex) => (
                              <fieldset
                                key={episode.id}
                                className="series-draft-episode"
                              >
                                <legend>Episode {episodeIndex + 1}</legend>
                                <label
                                  className="field-label"
                                  htmlFor={`episode-title-${episode.id}`}
                                >
                                  Episode {episodeIndex + 1} title
                                </label>
                                <input
                                  className="field-control"
                                  id={`episode-title-${episode.id}`}
                                  value={episode.title}
                                  onChange={(event) =>
                                    updateDraftEpisode(season.id, episode.id, {
                                      title: event.target.value,
                                    })
                                  }
                                  placeholder="Episode title"
                                />
                                <label
                                  className="field-label"
                                  htmlFor={`episode-description-${episode.id}`}
                                >
                                  Episode {episodeIndex + 1} information
                                </label>
                                <textarea
                                  className="field-control"
                                  id={`episode-description-${episode.id}`}
                                  value={episode.description}
                                  onChange={(event) =>
                                    updateDraftEpisode(season.id, episode.id, {
                                      description: event.target.value,
                                    })
                                  }
                                  placeholder="Private notes or a short description"
                                />
                                <label
                                  className="field-label"
                                  htmlFor={`episode-image-${episode.id}`}
                                >
                                  Episode {episodeIndex + 1} image URL
                                </label>
                                <input
                                  className="field-control"
                                  id={`episode-image-${episode.id}`}
                                  type="url"
                                  value={episode.imageUrl}
                                  onChange={(event) =>
                                    updateDraftEpisode(season.id, episode.id, {
                                      imageUrl: event.target.value,
                                    })
                                  }
                                  placeholder="https://…"
                                />
                                <div className="series-draft-episode-actions">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={episode.completed}
                                      onChange={(event) =>
                                        updateDraftEpisode(
                                          season.id,
                                          episode.id,
                                          {
                                            completed: event.target.checked,
                                          },
                                        )
                                      }
                                    />{' '}
                                    Watched
                                  </label>
                                  <button
                                    className="mini-btn"
                                    type="button"
                                    onClick={() =>
                                      removeDraftEpisode(season.id, episode.id)
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              </fieldset>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <label
                className="setting-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: 0,
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                    Add placeholder cover
                  </strong>
                  <small style={{ color: 'var(--muted)' }}>
                    Uses a neutral cover, never artwork from another item
                  </small>
                </div>
                <label className="switch" style={{ marginLeft: 'auto' }}>
                  <input
                    type="checkbox"
                    checked={newItemUsesPlaceholderCover}
                    onChange={(event) =>
                      setNewItemUsesPlaceholderCover(event.target.checked)
                    }
                  />
                  <i />
                </label>
              </label>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  color: 'var(--muted)',
                }}
              >
                Manual entry only in this preview. Catalog search comes later.
              </p>
            </div>

            <div className="add-drawer-foot">
              <button
                className="ghost-btn"
                type="button"
                onClick={closeItemDrawer}
              >
                Cancel
              </button>
              <button
                className="primary-btn"
                type="button"
                onClick={handleSaveDrawer}
              >
                Save item
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
