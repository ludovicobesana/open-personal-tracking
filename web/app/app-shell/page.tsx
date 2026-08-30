'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Compass,
  FolderKanban,
  History,
  LibraryBig,
  Plus,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { createItem, type ItemStatus, UserPreferencesSchema, type UserPreferences } from '../../../src/domain/archive';

type Episode = { number: number; title: string };
type SeriesSeason = { number: number; title: string; episodes: Episode[] };
type EpisodeSelection = { seasonNumber: number; episodeNumber: number };
type TrackedItem = {
  id: number;
  title: string;
  category: string;
  jacket: string;
  image: string;
  usePlaceholderCover?: boolean;
  creator: string;
  status: 'planned' | 'progress' | 'completed' | 'paused' | 'dropped';
  meta: string;
  next: string;
  value: number;
  description: string;
  tags: string[];
  seasons?: SeriesSeason[];
};

const ITEMS: TrackedItem[] = [
  {
    id: 1,
    title: 'Dune',
    category: 'Book',
    jacket: '#8F6F2E',
    image: '/images/dune.jpg',
    creator: 'Frank Herbert',
    status: 'progress',
    meta: '688 pages',
    next: 'Page 468 of 688',
    value: 68,
    description:
      'A noble family enters a ruthless struggle for control of a desert planet, where power, prophecy, and survival are inseparable.',
    tags: ['Sci-fi', 'classic', 'desert epic'],
  },
  {
    id: 2,
    title: 'The Left Hand of Darkness',
    category: 'Book',
    jacket: '#4B5E5A',
    image: '/images/the-left-hand-of-darkness.jpg',
    creator: 'Ursula K. Le Guin',
    status: 'completed',
    meta: '5★ rating',
    next: 'Finished',
    value: 100,
    description:
      'A diplomat journeys to an alien world where identity, politics, and intimacy are reimagined in a stunningly quiet science-fiction classic.',
    tags: ['classic', 'philosophical', 'essays'],
  },
  {
    id: 3,
    title: 'The Batman',
    category: 'Film',
    jacket: '#3A4650',
    image: '/images/the-batman.jpg',
    creator: 'Matt Reeves',
    status: 'planned',
    meta: '2h 57m',
    next: 'Not started',
    value: 0,
    description:
      'A darker, more intimate detective story succeeds as a grounded noir thriller with a razor-sharp sense of atmosphere.',
    tags: ['noir', 'dark', 'crime'],
  },
  {
    id: 4,
    title: 'Stardew Valley',
    category: 'Game',
    jacket: '#4A5540',
    image: '/images/Logo_of_Stardew_Valley.png',
    creator: 'ConcernedApe',
    status: 'paused',
    meta: 'Season 2',
    next: 'Paused at 52%',
    value: 52,
    description:
      'A cozy life sim with farming, relationships, mining, and a steady rhythm that makes daily rituals feel meditative and rewarding.',
    tags: ['cozy', 'farming', 'slow burn'],
  },
  {
    id: 5,
    title: 'One Piece',
    category: 'Manga',
    jacket: '#6E4A3E',
    image: '/images/onepiece.jpg',
    creator: 'Eiichiro Oda',
    status: 'dropped',
    meta: 'Ch. 340',
    next: 'Dropped at ch. 340',
    value: 30,
    description:
      'A long-form adventure full of huge ambitions, unforgettable characters, and an endless appetite for world-building.',
    tags: ['adventure', 'longform', 'epic'],
  },
  {
    id: 6,
    title: 'The Bear',
    category: 'Series',
    jacket: '#6E4A3E',
    image: '/images/the-bear.jpg',
    creator: 'Christopher Storer',
    status: 'progress',
    meta: '3 seasons',
    next: 'Season 1, episode 4',
    value: 0,
    description:
      'A young chef returns to Chicago to run his family’s sandwich shop, where pressure, grief, and care collide in a very small kitchen.',
    tags: ['drama', 'kitchen', 'character-driven'],
    seasons: [
      {
        number: 1,
        title: 'Season 1',
        episodes: [
          { number: 1, title: 'System' },
          { number: 2, title: 'Hands' },
          { number: 3, title: 'Brigade' },
          { number: 4, title: 'Dogs' },
        ],
      },
      {
        number: 2,
        title: 'Season 2',
        episodes: [
          { number: 1, title: 'Beef' },
          { number: 2, title: 'Pasta' },
          { number: 3, title: 'Sundae' },
        ],
      },
    ],
  },
];

const GROUPS = [
  { key: 'progress', label: 'Continuing' },
  { key: 'planned', label: 'Planned' },
  { key: 'completed', label: 'Finished' },
  { key: 'archived', label: 'Archived' },
];

const PLACEHOLDER_COVERS: Record<string, string> = {
  Book: '/images/eragon-book-cover.jpg',
  Film: '/images/the-odyssey-poster.jpg',
  'TV Show': '/images/family-guy-poster.jpg',
  Manga: '/images/the-odyssey-poster.jpg',
  Anime: '/images/bleach-thousand-year-blood-war-poster.jpg',
  Game: '/images/family-guy-poster.jpg',
  Series: '/images/family-guy-poster.jpg',
};

const getCoverImage = (category: string, image?: string, usePlaceholderCover = true) => {
  if (image && image.trim().length > 0) return image;
  return usePlaceholderCover ? PLACEHOLDER_COVERS[category] ?? PLACEHOLDER_COVERS.Book : '';
};

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  progress: 'In progress',
  completed: 'Completed',
  paused: 'Paused',
  dropped: 'Dropped',
};

const normalizeStatus = (status: string): ItemStatus => {
  if (status === 'progress') return 'in_progress';
  return status as ItemStatus;
};

const domainSeedItems = ITEMS.map((item) =>
  createItem({
    id: String(item.id),
    type: item.category.toLowerCase(),
    title: item.title,
    category: item.category,
    description: item.description,
    status: normalizeStatus(item.status),
    progress: {
      current: item.value,
      target: 100,
      unit: 'percent',
    },
    notes: [],
    tags: item.tags,
    collections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attributes: {
      creator: item.creator,
      meta: item.meta,
      next: item.next,
      jacket: item.jacket,
      image: item.image,
      displayStatus: item.status,
    },
    externalIds: {},
  })
);

const domainArchive = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  items: domainSeedItems,
  collections: [],
  history: [],
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

const ONBOARDING_STORAGE_KEY = 'open-personal-tracking.preferences.v1';
const ACTIVITY_OPTIONS = [
  { key: 'movies', label: 'Movies' }, { key: 'series', label: 'Series' }, { key: 'books', label: 'Books' }, { key: 'manga', label: 'Manga' },
  { key: 'anime', label: 'Anime' }, { key: 'games', label: 'Games' }, { key: 'music', label: 'Music' }, { key: 'podcasts', label: 'Podcasts' },
] as const;
const GENRE_OPTIONS = ['Action', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-fi'];

const ROADMAP_URL = 'https://github.com/ludovicobesana/open-personal-tracking/blob/main/ROADMAP.md';
const CHANGELOG_URL = 'https://github.com/ludovicobesana/open-personal-tracking/blob/main/CHANGELOG.md';
const BUG_REPORT_URL = 'https://github.com/ludovicobesana/open-personal-tracking/issues/new?template=bug_report.md';

const bucketOf = (status: string) => (status === 'paused' || status === 'dropped' ? 'archived' : status);
const getPlaceholderCover = (category: string) => PLACEHOLDER_COVERS[category] ?? PLACEHOLDER_COVERS.Book;

const getPageTarget = (item: TrackedItem) => {
  if (item.category !== 'Book') return null;
  return Number(item.meta.match(/(\d+)\s+pages/i)?.[1]) || null;
};

export default function AppShellPage() {
  const [activeNav, setActiveNav] = useState('library');
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [emptyState, setEmptyState] = useState(false);
  const [selectedId, setSelectedId] = useState(ITEMS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', category: 'Book', status: 'planned' });
  const [newSeriesEpisodeCount, setNewSeriesEpisodeCount] = useState(8);
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'auto'>('dark');
  const [usePlaceholderCover, setUsePlaceholderCover] = useState(true);
  const [detailView, setDetailView] = useState<'summary' | 'expanded'>('summary');
  const [progressByItem, setProgressByItem] = useState<Record<number, number>>({});
  const [completedEpisodesByItem, setCompletedEpisodesByItem] = useState<Record<number, Record<string, boolean>>>({
    6: { '1-1': true, '1-2': true, '1-3': true },
  });
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeSelection | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(() => UserPreferencesSchema.parse({}));
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    if (domainArchive.items.length > 0) {
      // Keep the app shell connected to the domain models even though the UI still renders
      // a compact presentation layer around them.
    }
  }, []);

  const resolveImage = (image: string | undefined, category: string, usePlaceholder = true) => getCoverImage(category, image, usePlaceholder);

  useEffect(() => {
    const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    let parsed: ReturnType<typeof UserPreferencesSchema.safeParse> | null = null;
    try {
      parsed = stored ? UserPreferencesSchema.safeParse(JSON.parse(stored)) : null;
    } catch {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
    if (parsed?.success) {
      setPreferences(parsed.data);
      setOnboardingOpen(!parsed.data.onboardingCompleted);
    } else {
      setOnboardingOpen(true);
    }
  }, []);

  const savePreferences = (next: UserPreferences) => {
    setPreferences(next);
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (mode: 'dark' | 'light' | 'auto') => {
      const normalizedMode = mode || 'dark';
      const actualTheme = normalizedMode === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : normalizedMode;

      root.setAttribute('data-theme', actualTheme);
      document.querySelectorAll('[data-theme-option]').forEach((button) => {
        button.classList.toggle('is-active', button.getAttribute('data-theme-option') === normalizedMode);
      });
    };

    applyTheme(themeMode);
    const colorSchemeMatcher = window.matchMedia('(prefers-color-scheme: light)');
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

  const getItemProgress = (item: TrackedItem) => {
    if (item.category !== 'Series' || !item.seasons?.length) {
      return progressByItem[item.id] ?? item.value;
    }

    const episodes = item.seasons.flatMap((season) => season.episodes.map((episode) => `${season.number}-${episode.number}`));
    const completed = episodes.filter((key) => completedEpisodesByItem[item.id]?.[key]).length;
    return episodes.length > 0 ? (completed / episodes.length) * 100 : 0;
  };

  const selectedItem = ITEMS.find((item) => item.id === selectedId) ?? ITEMS[0];
  const selectedSeasons = selectedItem.category === 'Series' ? selectedItem.seasons ?? [] : [];
  const selectedEpisodes = selectedSeasons.flatMap((season) => season.episodes.map((episode) => ({ ...episode, seasonNumber: season.number })));
  const selectedEpisodeDetail = selectedEpisode
    ? (() => {
      const season = selectedSeasons.find((entry) => entry.number === selectedEpisode.seasonNumber);
      const episode = season?.episodes.find((entry) => entry.number === selectedEpisode.episodeNumber);
      return season && episode ? { season, episode } : null;
    })()
    : null;
  const selectedCompletedEpisodes = selectedEpisodes.filter((episode) => completedEpisodesByItem[selectedItem.id]?.[`${episode.seasonNumber}-${episode.number}`]).length;
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
    : selectedItem.next;

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
    const item = ITEMS.find((entry) => entry.id === selectedId) ?? ITEMS[0];
    setNewItem({
      title: item.title,
      category: item.category,
      status: item.status,
    });
    setDetailView('summary');
    setDrawerOpen(true);
  };

  const handleReportBug = () => {
    if (typeof window !== 'undefined') {
      window.open(BUG_REPORT_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const handleProgressChange = (value: number) => {
    setProgressByItem((state) => ({
      ...state,
      [selectedItem.id]: value,
    }));
  };

  const toggleEpisodeCompletion = (seasonNumber: number, episodeNumber: number) => {
    const key = `${seasonNumber}-${episodeNumber}`;
    setCompletedEpisodesByItem((state) => ({
      ...state,
      [selectedItem.id]: {
        ...state[selectedItem.id],
        [key]: !state[selectedItem.id]?.[key],
      },
    }));
  };

  const visibleItems = useMemo(() => {
    if (emptyState) return [];

    return ITEMS.filter((item) => {
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, emptyState, query]);

  const upNextItems = visibleItems.filter((item) => item.status === 'progress');
  const isLibrary = activeNav === 'library';

  const handleSaveDrawer = () => {
    if (!newItem.title.trim()) return;

    const seasons: SeriesSeason[] | undefined = newItem.category === 'Series'
      ? [{
        number: 1,
        title: 'Season 1',
        episodes: Array.from({ length: newSeriesEpisodeCount }, (_, index) => ({
          number: index + 1,
          title: `Episode ${index + 1}`,
        })),
      }]
      : undefined;

    const item: TrackedItem = {
      id: Date.now(),
      title: newItem.title.trim(),
      category: newItem.category,
      jacket: '#8F6F2E',
      image: usePlaceholderCover ? getPlaceholderCover(newItem.category) : '',
      usePlaceholderCover,
      creator: 'You',
      status: newItem.status as TrackedItem['status'],
      meta: seasons ? '1 season' : 'Added just now',
      next: seasons ? 'Season 1, episode 1' : STATUS_LABEL[newItem.status],
      value: newItem.status === 'completed' ? 100 : 0,
      description: 'Added manually from the app shell preview.',
      tags: ['custom', 'tracked'],
      seasons,
    };

    ITEMS.unshift(item);
    setSelectedId(item.id);
    setNewItem({ title: '', category: 'Book', status: 'planned' });
    setNewSeriesEpisodeCount(8);
    setDrawerOpen(false);
    setEmptyState(false);
  };

  return (
    <div className="app-shell" aria-label="Open personal tracking application shell">
      <aside className="sidebar" aria-label="Navigation sidebar">
        <a href="#" className="brand wordmark" aria-label="Open personal tracking home">
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
              <span className="nav-icon"><LibraryBig size={15} aria-hidden="true" /></span>
              Library
            </span>
            <span className="pill">{ITEMS.length}</span>
          </button>

          <button type="button" className={`nav-item ${activeNav === 'discover' ? 'is-active' : ''}`} onClick={() => setActiveNav('discover')}>
            <span><span className="nav-icon"><Compass size={15} aria-hidden="true" /></span>Discover</span>
          </button>

          <button type="button" className={`nav-item ${activeNav === 'profile' ? 'is-active' : ''}`} onClick={() => setActiveNav('profile')}>
            <span><span className="nav-icon"><UserRound size={15} aria-hidden="true" /></span>Profile</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeNav === 'collections' ? 'is-active' : ''}`}
            onClick={() => setActiveNav('collections')}
          >
            <span>
              <span className="nav-icon"><FolderKanban size={15} aria-hidden="true" /></span>
              Collections
            </span>
            <span className="pill">12</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeNav === 'history' ? 'is-active' : ''}`}
            onClick={() => setActiveNav('history')}
          >
            <span>
              <span className="nav-icon"><History size={15} aria-hidden="true" /></span>
              History
            </span>
          </button>
        </nav>

        <nav className="nav-group" aria-label="Secondary navigation">
          <div className="nav-group-label">Manage</div>

          <button type="button" className="nav-item" onClick={() => setActiveNav('import')}>
            <span>
              <span className="nav-icon"><ArrowUpFromLine size={15} aria-hidden="true" /></span>
              Import
            </span>
          </button>

          <button type="button" className="nav-item" onClick={() => setActiveNav('export')}>
            <span>
              <span className="nav-icon"><ArrowDownToLine size={15} aria-hidden="true" /></span>
              Export
            </span>
          </button>

          <button type="button" className="nav-item" onClick={() => setActiveNav('settings')}>
            <span>
              <span className="nav-icon"><Settings size={15} aria-hidden="true" /></span>
              Settings
            </span>
          </button>
        </nav>

        <div className="sidebar-meta" aria-live="polite">
          <div className="status-block">
            <span>Local sync</span>
            <span className="status-dot" aria-label="Connected locally" />
          </div>
          <strong>Archive safe</strong>
          <div>Last backup: 14 minutes ago</div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <h1 className="page-title">{activeNav === 'library' ? (preferences.displayName ? `Hi, ${preferences.displayName}` : 'Library') : NAV_LABEL[activeNav]}</h1>

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
                <button type="button" className="search-clear-top" onClick={() => setQuery('')} aria-label="Clear search">
                  &times;
                </button>
              )}
            </label>
            <button className="primary-btn" type="button" onClick={() => setDrawerOpen(true)}>
              <Plus size={14} aria-hidden="true" />
              New item
            </button>
          </div>
        </header>

        <div className="demo-controls">
          <span className="tag-label">Demo control</span>
          <label className="demo-toggle">
            <input type="checkbox" checked={emptyState} onChange={() => setEmptyState((value) => !value)} />
            Simulate empty state
          </label>
        </div>

        {isLibrary ? (
          <div className="content" id="panelLibrary">
            <section className="library-panel" aria-labelledby="library-panel-title">
              <div className="panel-header">
                <div className="panel-header-top">
                  <h2 id="library-panel-title" className="panel-title">
                    Your tracked items
                  </h2>
                  <span className="result-count" aria-live="polite">
                    {visibleItems.length} of {ITEMS.length} shown
                  </span>
                </div>

                <div className="panel-toolbar">
                  <label className="search search-inline" aria-label="Search your library">
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search items, authors, tags…"
                      autoComplete="off"
                    />
                    {query && (
                      <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                        &times;
                      </button>
                    )}
                    <kbd className="search-kbd">/</kbd>
                  </label>

                  <div className="panel-tools" aria-label="Filter by category">
                    {['all', 'Book', 'Film', 'Series', 'Game'].map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`filter-chip ${activeCategory === category ? 'is-selected' : ''}`}
                        onClick={() => setActiveCategory(category)}
                      >
                        {category === 'all' ? 'All' : category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="stats-grid" aria-label="Library summary measurements">
                <div className="stat-card">
                  <span className="stat-label">Total</span>
                  <div className="stat-value">{ITEMS.length}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">In progress</span>
                  <div className="stat-value">{ITEMS.filter((item) => item.status === 'progress').length}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Completed</span>
                  <div className="stat-value">{ITEMS.filter((item) => item.status === 'completed').length}</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Collections</span>
                  <div className="stat-value">12</div>
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
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.28)), url('${resolveImage(item.image, item.category, item.usePlaceholderCover)}')`,
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

              {emptyState ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                    <rect x="4" y="3" width="16" height="18" rx="1.5" />
                    <path d="M8 8h8M8 12h8M8 16h4" />
                  </svg>
                  <h3>Nothing tracked yet</h3>
                  <p>
                    Add the first thing you're reading, watching, or playing. It stays on this device,
                    no account needed.
                  </p>
                  <button type="button" className="primary-btn" onClick={() => setDrawerOpen(true)}>
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
                    const items = visibleItems.filter((item) => bucketOf(item.status) === group.key);
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
                                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.35)), url('${resolveImage(item.image, item.category, item.usePlaceholderCover)}')`,
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
                                <span className={`status-chip status-${item.status}`}>{STATUS_LABEL[item.status]}</span>
                              </div>
                              <div className="item-meta">
                                <span>{item.creator}</span>
                                <span>•</span>
                                <span>{item.meta}</span>
                              </div>
                            </div>

                            <div className="item-right">
                              <div className="progress-ring" style={{ ['--value' as string]: getItemProgress(item) }} aria-label={`${Math.round(getItemProgress(item))}% complete`}>
                                <span>{Math.round(getItemProgress(item))}%</span>
                              </div>
                              <button type="button" className="mini-btn" onClick={() => setSelectedId(item.id)}>
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

            <aside className="detail-panel" aria-label="Selected item details">
              <div className="detail-header">
                <strong>Details</strong>
                <div className="detail-actions">
                  <button type="button" className="mini-btn" onClick={() => setDetailView('expanded')}>
                    Open page
                  </button>
                  <button type="button" className="mini-btn" onClick={handleEditSelected}>
                    Edit
                  </button>
                </div>
              </div>

              <div className="detail-body">
                <div className="detail-hero">
                  <div
                    className="detail-cover"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(24,27,22,0.08), rgba(24,27,22,0.4)), url('${resolveImage(selectedItem.image, selectedItem.category, selectedItem.usePlaceholderCover)}')`,
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
                      <span>Category: {selectedItem.category.toLowerCase()}</span>
                      <span>Updated: 2 days ago</span>
                    </div>
                  </div>
                </div>

                <>
                    <section className="detail-section" aria-labelledby="description-label">
                      <h3 id="description-label" className="section-label">
                        Synopsis
                      </h3>
                      <p className="description">{selectedItem.description}</p>
                    </section>

                    <section className="detail-section" aria-labelledby="progress-label">
                      <h3 id="progress-label" className="section-label">
                        Progress
                      </h3>
                      <div className="progress-stack">
                        <div className="progress-line" aria-hidden="true">
                          <span className="progress-bar" style={{ width: `${selectedProgress}%` }} />
                        </div>
                        <div className="progress-values">
                          <span>{selectedProgressLabel}</span>
                          <span>{selectedProgressPercent}%</span>
                        </div>
                      </div>
                    </section>

                    <section className="detail-section" aria-labelledby="attributes-label">
                      <h3 id="attributes-label" className="section-label">
                        Attributes
                      </h3>
                      <div className="attribute-list" aria-label="Item attributes">
                        <span className="attribute">Rating: 4.5★</span>
                        <span className="attribute">Status: {STATUS_LABEL[selectedItem.status]}</span>
                        <span className="attribute">Format: hardcover</span>
                      </div>
                    </section>

                    <section className="detail-section" aria-labelledby="history-label">
                      <h3 id="history-label" className="section-label">
                        Recent history
                      </h3>
                      <ul className="timeline" aria-label="Recent changes timeline">
                        <li>Updated reading progress after chapter 18.</li>
                        <li>Marked as “in progress” from backlog.</li>
                        <li>Added tags: classic, science fiction, desert epic.</li>
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
                    <p>Organize your tracked items by mood, format, and purpose.</p>
                  </div>
                  <button className="primary-btn" type="button">
                    New collection
                  </button>
                </div>
                <div className="screen-grid">
                  <div className="summary-card">
                    <span className="eyebrow">Total</span>
                    <strong>12</strong>
                    <span>Across books, films, and games</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Featured</span>
                    <strong>4</strong>
                    <span>Currently spotlighted on the home view</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Ready</span>
                    <strong>7</strong>
                    <span>Collections with clear next action</span>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'discover' && (
              <>
                <div className="screen-hero discover-hero">
                  <div>
                    <span className="eyebrow">Discover</span>
                    <h2>{preferences.displayName ? `Made for ${preferences.displayName}` : 'Make this library yours'}</h2>
                    <p>{preferences.activities.length ? `Start with ${preferences.activities.join(', ')} and refine what you want to track.` : 'Choose what you enjoy in Settings to make discovery useful.'}</p>
                  </div>
                  <button className="primary-btn" type="button" onClick={() => setDrawerOpen(true)}><Plus size={14} aria-hidden="true" />Add to library</button>
                </div>
                <div className="screen-grid discovery-grid">
                  <div className="summary-card"><span className="eyebrow">Watch next</span><strong>{upNextItems.length}</strong><span>Items ready to continue</span></div>
                  <div className="summary-card"><span className="eyebrow">Your genres</span><strong>{preferences.favoriteGenres.length || '—'}</strong><span>{preferences.favoriteGenres.length ? preferences.favoriteGenres.join(' · ') : 'Set favourites in Settings'}</span></div>
                  <div className="summary-card"><span className="eyebrow">Local first</span><strong>0</strong><span>External recommendations until a provider is connected</span></div>
                </div>
              </>
            )}

            {activeNav === 'profile' && (
              <>
                <div className="screen-hero profile-hero">
                  <div>
                    <span className="eyebrow">Profile</span>
                    <h2>{preferences.displayName || 'Your personal archive'}</h2>
                    <p>{preferences.activities.length ? `Tracking ${preferences.activities.join(', ')} locally.` : 'Set your tracking preferences to personalise this space.'}</p>
                  </div>
                  <button className="ghost-btn" type="button" onClick={() => setActiveNav('settings')}>Edit preferences</button>
                </div>
                <div className="screen-grid">
                  <div className="summary-card"><span className="eyebrow">Tracked</span><strong>{ITEMS.length}</strong><span>Across your active categories</span></div>
                  <div className="summary-card"><span className="eyebrow">Finished</span><strong>{ITEMS.filter((item) => item.status === 'completed').length}</strong><span>Saved in your history</span></div>
                  <div className="summary-card"><span className="eyebrow">Language</span><strong>{preferences.locale === 'it' ? 'IT' : 'EN'}</strong><span>Saved with your preferences</span></div>
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
                      <li>Updated “Dune” to 68% after reading chapters 14–18.</li>
                      <li>Marked “The Batman” as planned after adding it to the watchlist.</li>
                      <li>Imported three books from a CSV backup.</li>
                      <li>Archived “Stardew Valley” after a two-month pause.</li>
                    </ul>
                  </div>
                  <div className="content-card">
                    <span className="eyebrow">Summary</span>
                    <div className="list-stack">
                      <div className="mini-row">
                        <div>
                          <strong>18 updates</strong>
                          <br />
                          <small>This week</small>
                        </div>
                      </div>
                      <div className="mini-row">
                        <div>
                          <strong>4 imports</strong>
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
                    <p>Keep everything in a durable, readable format you own.</p>
                  </div>
                  <button className="primary-btn" type="button">
                    Export now
                  </button>
                </div>
                <div className="screen-grid">
                  <div className="summary-card">
                    <span className="eyebrow">Last export</span>
                    <strong>12 min</strong>
                    <span>ago</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Format</span>
                    <strong>JSON</strong>
                    <span>Portable, inspectable, re-importable</span>
                  </div>
                  <div className="summary-card">
                    <span className="eyebrow">Backup</span>
                    <strong>3</strong>
                    <span>local copies retained</span>
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
                        {mode === 'auto' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark'}
                      </button>
                    ))}
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Language</strong>
                      <br />
                      <small>Used for your app preferences and future catalog results</small>
                    </div>
                    <select className="setting-select" value={preferences.locale} onChange={(event) => savePreferences({ ...preferences, locale: event.target.value as UserPreferences['locale'] })}>
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
                        onChange={(event) => setThemeMode(event.target.checked ? 'auto' : 'dark')}
                      />
                      <i />
                    </label>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Placeholder covers</strong>
                      <br />
                      <small>Use category-appropriate artwork for new items</small>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={usePlaceholderCover}
                        onChange={(event) => setUsePlaceholderCover(event.target.checked)}
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
                    <a className="inline-link" href={ROADMAP_URL} target="_blank" rel="noreferrer noopener">
                      Open roadmap
                    </a>
                  </div>
                  <div className="setting-row setting-row--stacked">
                    <div>
                      <strong>Report a bug</strong>
                      <br />
                      <small>Share a quick issue with the team</small>
                    </div>
                    <button type="button" className="mini-btn" onClick={handleReportBug}>
                      Report
                    </button>
                  </div>
                  <div className="setting-card app-about-card">
                    <span className="eyebrow">About this app</span>
                    <h3>Preview build</h3>
                    <p>This local-first preview is not a published release yet. Published release notes will appear here once the project ships tagged versions.</p>
                    <div className="app-about-actions">
                      <a className="inline-link" href={CHANGELOG_URL} target="_blank" rel="noreferrer noopener">Repository changelog</a>
                      <a className="inline-link" href={ROADMAP_URL} target="_blank" rel="noreferrer noopener">Roadmap</a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeNav === 'import' && (
              <div className="screen-hero">
                <div>
                  <span className="eyebrow">Import</span>
                  <h2>Bring your archive in</h2>
                  <p>Import CSV, JSON, or a previous export backup.</p>
                </div>
                <button className="primary-btn" type="button">
                  Select file
                </button>
              </div>
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
            <Icon size={19} strokeWidth={activeNav === key ? 2.35 : 1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {detailView === 'expanded' && (
        <div className="detail-page-layer" role="presentation">
          <button className="detail-page-backdrop" type="button" aria-label="Close item detail" onClick={() => setDetailView('summary')} />
          <article className="detail-page" role="dialog" aria-modal="true" aria-labelledby="detailPageTitle">
            <header className="detail-page-header">
              <div>
                <span className="eyebrow">Your library / {selectedItem.category}</span>
                <p>Item details</p>
              </div>
              <div className="detail-actions">
                <button type="button" className="mini-btn" onClick={handleEditSelected}>Edit item</button>
                <button type="button" className="detail-page-close" aria-label="Close item detail" onClick={() => setDetailView('summary')}>
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
                    backgroundImage: `linear-gradient(180deg, rgba(24,27,22,0.05), rgba(24,27,22,0.46)), url('${resolveImage(selectedItem.image, selectedItem.category, selectedItem.usePlaceholderCover)}')`,
                    backgroundColor: selectedItem.jacket,
                  }}
                />
                <div className="detail-page-intro">
                  <div className="detail-page-title-row">
                    <h2 id="detailPageTitle">{selectedItem.title}</h2>
                    <span className={`status-chip status-${selectedItem.status}`}>{STATUS_LABEL[selectedItem.status]}</span>
                  </div>
                  <div className="detail-meta">
                    <span className="tag">{selectedItem.category}</span>
                    {selectedItem.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                  <p className="detail-page-description">{selectedItem.description}</p>
                  <dl className="detail-facts">
                    <div><dt>Creator</dt><dd>{selectedItem.creator}</dd></div>
                    <div><dt>Format</dt><dd>{selectedItem.meta}</dd></div>
                    <div><dt>Last updated</dt><dd>2 days ago</dd></div>
                  </dl>
                </div>
              </section>

              <div className="detail-page-grid">
                <section className="detail-page-card detail-page-progress" aria-labelledby="detailPageProgress">
                  <div className="detail-progress-head">
                    <h3 id="detailPageProgress" className="section-label">Progress</h3>
                    <strong>{selectedProgressPercent}%</strong>
                  </div>
                  {selectedEpisodes.length > 0 ? (
                    <p className="detail-progress-note">For a series, progress is calculated from completed episodes. A season completes only when every episode in it is marked complete.</p>
                  ) : (
                    <input
                      aria-label={selectedPageTarget ? 'Adjust current page' : 'Adjust progress percentage'}
                      className="progress-slider"
                      type="range"
                      min={0}
                      max={selectedPageTarget ?? 100}
                      step={1}
                      value={selectedPageCurrent ?? selectedProgress}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        handleProgressChange(selectedPageTarget ? (value / selectedPageTarget) * 100 : value);
                      }}
                    />
                  )}
                  <div className="progress-values"><span>{selectedProgressLabel}</span><span>{selectedProgressPercent}% complete</span></div>
                </section>

                {selectedEpisodes.length > 0 && (
                  <section className="detail-page-card detail-page-seasons" aria-labelledby="detailPageSeasons">
                    <div className="detail-seasons-heading">
                      <div>
                        <h3 id="detailPageSeasons" className="section-label">Seasons and episodes</h3>
                        <p>Mark an episode complete to update the season and series progress.</p>
                      </div>
                      <span className="detail-season-total">{selectedSeasons.filter((season) => season.episodes.every((episode) => completedEpisodesByItem[selectedItem.id]?.[`${season.number}-${episode.number}`])).length} / {selectedSeasons.length} seasons complete</span>
                    </div>
                    <div className="season-list">
                      {selectedSeasons.map((season) => {
                        const completedCount = season.episodes.filter((episode) => completedEpisodesByItem[selectedItem.id]?.[`${season.number}-${episode.number}`]).length;
                        const isComplete = completedCount === season.episodes.length;
                        return (
                          <section key={season.number} className={`season-card ${isComplete ? 'is-complete' : ''}`}>
                            <div className="season-card-head">
                              <div>
                                <h4>{season.title}</h4>
                                <span>{completedCount} of {season.episodes.length} episodes complete</span>
                              </div>
                              <span className="season-status">{isComplete ? 'Complete' : 'In progress'}</span>
                            </div>
                            <div className="episode-list">
                              {season.episodes.map((episode) => {
                                const isComplete = Boolean(completedEpisodesByItem[selectedItem.id]?.[`${season.number}-${episode.number}`]);
                                return (
                                  <div
                                    key={episode.number}
                                    className={`episode-card ${isComplete ? 'is-complete' : ''}`}
                                    style={{
                                      backgroundImage: `linear-gradient(180deg, rgba(10,12,15,0.05) 18%, rgba(10,12,15,0.85) 100%), url('${resolveImage(selectedItem.image, selectedItem.category, selectedItem.usePlaceholderCover)}')`,
                                    }}
                                  >
                                    <button type="button" className="episode-card-detail" aria-label={`Open ${season.title}, episode ${episode.number}, ${episode.title}`} onClick={() => setSelectedEpisode({ seasonNumber: season.number, episodeNumber: episode.number })}>
                                      <span className="episode-card-copy">
                                      <span className="episode-card-code">S{season.number} · E{episode.number}</span>
                                      <strong>{episode.title}</strong>
                                      <span>{isComplete ? 'Watched' : 'Mark as watched'}</span>
                                      </span>
                                    </button>
                                    <button type="button" className="episode-card-state" aria-label={`${isComplete ? 'Mark as unwatched' : 'Mark as watched'}: ${season.title}, episode ${episode.number}`} onClick={() => toggleEpisodeCompletion(season.number, episode.number)}>{isComplete ? '✓' : '+'}</button>
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

                <section className="detail-page-card" aria-labelledby="detailPageAttributes">
                  <h3 id="detailPageAttributes" className="section-label">Attributes</h3>
                  <div className="attribute-list">
                    <span className="attribute">Rating: 4.5★</span>
                    <span className="attribute">Status: {STATUS_LABEL[selectedItem.status]}</span>
                    <span className="attribute">Progress target: 100%</span>
                    <span className="attribute">Local only</span>
                  </div>
                </section>

                <section className="detail-page-card" aria-labelledby="detailPageNotes">
                  <h3 id="detailPageNotes" className="section-label">Highlights</h3>
                  <ul className="detail-page-list">
                    <li>Personal notes are stored locally with this item.</li>
                    <li>Keep the next action visible without opening another app.</li>
                    <li>Your archive remains exportable at any time.</li>
                  </ul>
                </section>

                <section className="detail-page-card" aria-labelledby="detailPageHistory">
                  <h3 id="detailPageHistory" className="section-label">Recent history</h3>
                  <ul className="timeline">
                    <li>Updated progress after chapter 18.</li>
                    <li>Marked as “in progress” from backlog.</li>
                    <li>Added tags: {selectedItem.tags.join(', ')}.</li>
                    <li>Saved a local backup of the current archive state.</li>
                  </ul>
                </section>
              </div>
            </div>
          </article>
        </div>
      )}

      {detailView === 'expanded' && selectedEpisodeDetail && (
        <div className="episode-detail-layer" role="presentation">
          <button className="episode-detail-backdrop" type="button" aria-label="Close episode details" onClick={() => setSelectedEpisode(null)} />
          <article className="episode-detail-modal" role="dialog" aria-modal="true" aria-labelledby="episodeDetailTitle">
            <header className="episode-detail-header">
              <div>
                <span className="eyebrow">{selectedItem.title} / {selectedEpisodeDetail.season.title}</span>
                <p>Episode details</p>
              </div>
              <button type="button" className="detail-page-close" aria-label="Close episode details" onClick={() => setSelectedEpisode(null)}>
                <X size={19} aria-hidden="true" />
              </button>
            </header>
            <div className="episode-detail-body">
              <div
                className="episode-detail-image"
                aria-hidden="true"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(10,12,15,0.06), rgba(10,12,15,0.7)), url('${resolveImage(selectedItem.image, selectedItem.category, selectedItem.usePlaceholderCover)}')` }}
              />
              <div className="episode-detail-copy">
                <span className="episode-detail-code">Season {selectedEpisodeDetail.season.number} · Episode {selectedEpisodeDetail.episode.number}</span>
                <h2 id="episodeDetailTitle">{selectedEpisodeDetail.episode.title}</h2>
                <span className={`episode-detail-status ${completedEpisodesByItem[selectedItem.id]?.[`${selectedEpisodeDetail.season.number}-${selectedEpisodeDetail.episode.number}`] ? 'is-complete' : ''}`}>
                  {completedEpisodesByItem[selectedItem.id]?.[`${selectedEpisodeDetail.season.number}-${selectedEpisodeDetail.episode.number}`] ? 'Watched' : 'Not watched'}
                </span>
                <dl className="episode-detail-facts">
                  <div><dt>Series</dt><dd>{selectedItem.title}</dd></div>
                  <div><dt>Season</dt><dd>{selectedEpisodeDetail.season.title}</dd></div>
                  <div><dt>Episode</dt><dd>{selectedEpisodeDetail.episode.number}</dd></div>
                </dl>
                <section className="episode-detail-summary" aria-labelledby="episodeSummaryTitle">
                  <h3 id="episodeSummaryTitle" className="section-label">Synopsis</h3>
                  <p>No synopsis has been added for this episode yet.</p>
                </section>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => toggleEpisodeCompletion(selectedEpisodeDetail.season.number, selectedEpisodeDetail.episode.number)}
                >
                  {completedEpisodesByItem[selectedItem.id]?.[`${selectedEpisodeDetail.season.number}-${selectedEpisodeDetail.episode.number}`] ? 'Mark as unwatched' : 'Mark as watched'}
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
          <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle">
            <div className="onboarding-progress" aria-label={`Step ${onboardingStep + 1} of 3`}>
              {[0, 1, 2].map((step) => <span key={step} className={step <= onboardingStep ? 'is-active' : ''} />)}
            </div>
            {onboardingStep === 0 && <div className="onboarding-step"><span className="eyebrow">Your archive, your rules</span><h2 id="onboardingTitle">Start with the things that matter to you.</h2><p>No account required. These preferences stay on this device and are included in the archive model for export.</p><label className="onboarding-field">What should we call you?<input autoFocus value={preferences.displayName} onChange={(event) => setPreferences({ ...preferences, displayName: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setOnboardingStep(1); } }} placeholder="Your name" maxLength={80} /></label></div>}
            {onboardingStep === 1 && <div className="onboarding-step"><span className="eyebrow">Choose your worlds</span><h2 id="onboardingTitle">What do you want to track?</h2><p>Choose every category you use. You can change this later.</p><div className="onboarding-option-grid">{ACTIVITY_OPTIONS.map((activity) => { const active = preferences.activities.includes(activity.key); return <button key={activity.key} type="button" className={`onboarding-option ${active ? 'is-selected' : ''}`} aria-pressed={active} onClick={() => setPreferences({ ...preferences, activities: active ? preferences.activities.filter((entry) => entry !== activity.key) : [...preferences.activities, activity.key] })}>{activity.label}</button>; })}</div></div>}
            {onboardingStep === 2 && <div className="onboarding-step"><span className="eyebrow">Make discovery useful</span><h2 id="onboardingTitle">Pick a few favourite genres.</h2><p>They will guide local search filters and future optional catalog discovery.</p><div className="onboarding-option-grid genres">{GENRE_OPTIONS.map((genre) => { const active = preferences.favoriteGenres.includes(genre); return <button key={genre} type="button" className={`onboarding-option ${active ? 'is-selected' : ''}`} aria-pressed={active} onClick={() => setPreferences({ ...preferences, favoriteGenres: active ? preferences.favoriteGenres.filter((entry) => entry !== genre) : [...preferences.favoriteGenres, genre] })}>{genre}</button>; })}</div></div>}
            <div className="onboarding-actions"><button type="button" className="ghost-btn" onClick={() => onboardingStep > 0 ? setOnboardingStep(onboardingStep - 1) : undefined}>{onboardingStep === 0 ? 'Local-first' : 'Back'}</button><button type="button" className="primary-btn" onClick={() => { if (onboardingStep < 2) { setOnboardingStep(onboardingStep + 1); } else { savePreferences({ ...preferences, onboardingCompleted: true }); setOnboardingOpen(false); } }}>{onboardingStep === 2 ? 'Open my archive' : 'Continue'}</button></div>
          </section>
        </div>
      )}

      {drawerOpen && (
        <>
          <div className="drawer-overlay is-open" onClick={() => setDrawerOpen(false)} />
          <aside className="add-drawer is-open" role="dialog" aria-modal="true" aria-labelledby="addDrawerTitle">
            <div className="add-drawer-head">
              <h3 id="addDrawerTitle">New item</h3>
              <button className="add-drawer-close" type="button" onClick={() => setDrawerOpen(false)}>
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
                  onChange={(event) => setNewItem((state) => ({ ...state, title: event.target.value }))}
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
                  onChange={(event) => setNewItem((state) => ({ ...state, category: event.target.value }))}
                >
                  <option value="Book">Book</option>
                  <option value="Film">Film</option>
                  <option value="Series">Series</option>
                  <option value="Manga">Manga</option>
                  <option value="Anime">Anime</option>
                  <option value="Game">Game</option>
                </select>
              </div>

              {newItem.category === 'Series' && (
                <div>
                  <label className="field-label" htmlFor="fEpisodeCount">
                    Episodes in season 1
                  </label>
                  <input
                    className="field-control"
                    id="fEpisodeCount"
                    type="number"
                    min={1}
                    max={99}
                    value={newSeriesEpisodeCount}
                    onChange={(event) => setNewSeriesEpisodeCount(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
                  />
                  <small className="field-help">You can mark each episode complete from the series detail.</small>
                </div>
              )}

              <div>
                <label className="field-label">Status</label>
                <div className="panel-tools">
                  {Object.entries(STATUS_LABEL).map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-chip ${newItem.status === status ? 'is-selected' : ''}`}
                      onClick={() => setNewItem((state) => ({ ...state, status }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 0 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>Add placeholder cover</strong>
                  <small style={{ color: 'var(--muted)' }}>Uses a sensible image for this category</small>
                </div>
                <label className="switch" style={{ marginLeft: 'auto' }}>
                  <input
                    type="checkbox"
                    checked={usePlaceholderCover}
                    onChange={(event) => setUsePlaceholderCover(event.target.checked)}
                  />
                  <i />
                </label>
              </label>

              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>
                Manual entry only in this preview. Catalog search comes later.
              </p>
            </div>

            <div className="add-drawer-foot">
              <button className="ghost-btn" type="button" onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button className="primary-btn" type="button" onClick={handleSaveDrawer}>
                Save item
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
