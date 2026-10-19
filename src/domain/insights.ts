import type { HistoryEntry, Item } from './archive.js';

export const INSIGHT_TREND_MONTHS = 6;
export const INSIGHT_HISTORY_LIMIT = 10_000;

export type InsightTrendPoint = {
  month: string;
  label: string;
  completions: number;
};

export type InsightRatingBucket = {
  rating: number;
  count: number;
};

export type InsightCategorySummary = {
  category: string;
  total: number;
  completed: number;
};

export type ArchiveInsights = {
  trend: InsightTrendPoint[];
  ratings: InsightRatingBucket[];
  categories: InsightCategorySummary[];
  includedItemCount: number;
  includedHistoryCount: number;
  ignoredHistoryCount: number;
  historyWasLimited: boolean;
};

const completionActions = new Set<HistoryEntry['action']>([
  'completed',
  'watched',
]);

const monthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date: Date): string =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

const trendStart = (now: Date): Date =>
  new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - (INSIGHT_TREND_MONTHS - 1),
      1,
    ),
  );

const createTrend = (
  history: HistoryEntry[],
  now: Date,
): InsightTrendPoint[] => {
  const start = trendStart(now);
  const points = Array.from({ length: INSIGHT_TREND_MONTHS }, (_, index) => {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
    );
    return {
      month: monthKey(date),
      label: monthLabel(date),
      completions: 0,
    };
  });
  const pointByMonth = new Map(points.map((point) => [point.month, point]));

  for (const entry of history) {
    if (!completionActions.has(entry.action)) continue;
    const date = new Date(entry.timestamp);
    if (!Number.isNaN(date.valueOf())) {
      const point = pointByMonth.get(monthKey(date));
      if (point) point.completions += 1;
    }
  }

  return points;
};

export const calculateArchiveInsights = (
  items: readonly Item[],
  history: readonly HistoryEntry[],
  now = new Date(),
): ArchiveInsights => {
  const recentHistory = history.slice(-INSIGHT_HISTORY_LIMIT);
  const ratings = Array.from({ length: 6 }, (_, rating) => ({
    rating,
    count: 0,
  }));
  const categories = new Map<string, InsightCategorySummary>();
  let ignoredHistoryCount = 0;

  for (const item of items) {
    if (item.rating !== undefined) {
      ratings[Math.max(0, Math.min(5, Math.round(item.rating)))].count += 1;
    }
    const summary = categories.get(item.category) ?? {
      category: item.category,
      total: 0,
      completed: 0,
    };
    summary.total += 1;
    if (item.status === 'completed') summary.completed += 1;
    categories.set(item.category, summary);
  }

  for (const entry of recentHistory) {
    if (Number.isNaN(new Date(entry.timestamp).valueOf())) {
      ignoredHistoryCount += 1;
    }
  }

  return {
    trend: createTrend(recentHistory, now),
    ratings,
    categories: Array.from(categories.values()).sort(
      (left, right) =>
        right.total - left.total || left.category.localeCompare(right.category),
    ),
    includedItemCount: items.length,
    includedHistoryCount: recentHistory.length - ignoredHistoryCount,
    ignoredHistoryCount,
    historyWasLimited: history.length > recentHistory.length,
  };
};
