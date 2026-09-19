import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';

import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import {
  applyTvTimeImport,
  extractTvTimeCsvFilesFromZip,
  previewTvTimeImport,
} from '../src/import/tv-time.js';

const file = (name: string, text: string) => ({ name, text });
const encoder = new TextEncoder();
const bytes16 = (value: number) => Uint8Array.of(value & 0xff, value >>> 8);
const bytes32 = (value: number) =>
  Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
const join = (parts: Uint8Array[]) => {
  const output = new Uint8Array(
    parts.reduce((size, part) => size + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

const zip = (
  entries: Array<{ name: string; text: string }>,
  compression = 0,
): Uint8Array => {
  let offset = 0;
  const localEntries: Uint8Array[] = [];
  const centralEntries: Uint8Array[] = [];

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const content = encoder.encode(entry.text);
    const compressed =
      compression === 8 ? new Uint8Array(deflateRawSync(content)) : content;
    localEntries.push(
      join([
        bytes32(0x04034b50),
        bytes16(20),
        bytes16(0),
        bytes16(compression),
        bytes16(0),
        bytes16(0),
        bytes32(0),
        bytes32(compressed.length),
        bytes32(content.length),
        bytes16(name.length),
        bytes16(0),
        name,
        compressed,
      ]),
    );
    centralEntries.push(
      join([
        bytes32(0x02014b50),
        bytes16(20),
        bytes16(20),
        bytes16(0),
        bytes16(compression),
        bytes16(0),
        bytes16(0),
        bytes32(0),
        bytes32(compressed.length),
        bytes32(content.length),
        bytes16(name.length),
        bytes16(0),
        bytes16(0),
        bytes16(0),
        bytes16(0),
        bytes32(0),
        bytes32(offset),
        name,
      ]),
    );
    offset += localEntries.at(-1)!.length;
  }

  const central = join(centralEntries);
  return join([
    ...localEntries,
    central,
    join([
      bytes32(0x06054b50),
      bytes16(0),
      bytes16(0),
      bytes16(entries.length),
      bytes16(entries.length),
      bytes32(central.length),
      bytes32(offset),
      bytes16(0),
    ]),
  ]);
};

describe('TV Time GDPR CSV import', () => {
  it('extracts CSV entries from a ZIP export locally', async () => {
    const files = await extractTvTimeCsvFilesFromZip(
      zip([
        {
          name: 'gdpr/user_tv_show_data.csv',
          text: 'user_id,tv_show_id,is_followed,is_favorited,nb_episodes_seen,tv_show_name\nuser-1,show-7,1,0,4,ZIP fixture\n',
        },
        { name: 'gdpr/readme.txt', text: 'not imported' },
      ]),
    );

    expect(files).toEqual([
      expect.objectContaining({ name: 'gdpr/user_tv_show_data.csv' }),
    ]);
    expect(previewTvTimeImport(files, createEmptyArchive()).items).toEqual([
      expect.objectContaining({ title: 'ZIP fixture' }),
    ]);
  });

  it('extracts deflated CSV entries from a ZIP export locally', async () => {
    const files = await extractTvTimeCsvFilesFromZip(
      zip(
        [
          {
            name: 'user_tv_show_data.csv',
            text: 'user_id,tv_show_id,is_followed,is_favorited,nb_episodes_seen,tv_show_name\nuser-1,show-8,1,0,2,Deflated ZIP fixture\n',
          },
        ],
        8,
      ),
    );

    expect(previewTvTimeImport(files, createEmptyArchive()).items).toEqual([
      expect.objectContaining({ title: 'Deflated ZIP fixture' }),
    ]);
  });

  it('previews supported series and movies without changing the archive', () => {
    const archive = createEmptyArchive();
    const preview = previewTvTimeImport(
      [
        file(
          'user_tv_show_data.csv',
          'user_id,tv_show_id,is_followed,is_favorited,nb_episodes_seen,tv_show_name\nuser-1,show-7,1,0,4,Example Series\n',
        ),
        file(
          'tracking-prod-records-v2.csv',
          'uuid,movie_name,movie_watch_count\nmovie-5,Example Film,2\n',
        ),
        file(
          'seen_episode_latest.csv',
          'user_id,created_at,tv_show_name\nuser-1,2025-01-01T12:00:00.000Z,Example Series\n',
        ),
        file(
          'ratings-prod-episode_votes.csv',
          'user_id,vote_key,episode_id\nuser-1,excellent,episode-1\n',
        ),
      ],
      archive,
    );

    expect(archive.items).toEqual([]);
    expect(preview.items).toHaveLength(2);
    expect(preview.items[0]).toMatchObject({
      title: 'Example Series',
      status: 'in_progress',
      progress: { current: 4, unit: 'episodes' },
      externalIds: { tvTime: 'show-7' },
    });
    expect(preview.items[1]).toMatchObject({
      title: 'Example Film',
      status: 'completed',
    });
    expect(preview.warnings.join(' ')).toContain('rating vote keys');
    expect(preview.watchEvents).toEqual([
      expect.objectContaining({ rewatch: false }),
    ]);
    expect(
      applyTvTimeImport(archive, preview, 'skip').history.map(
        (entry) => entry.action,
      ),
    ).toContain('watched');
  });

  it('reconstructs watched seasons and episodes when the export provides their numbers', () => {
    const archive = createEmptyArchive();
    const preview = previewTvTimeImport(
      [
        file(
          'user_tv_show_data.csv',
          'user_id,tv_show_id,is_followed,nb_episodes_seen,tv_show_name\nuser-1,show-episodes,1,2,Episode Series\n',
        ),
        file(
          'watched_on_episode.csv',
          'user_id,episode_id,created_at,tv_show_name,episode_season_number,episode_number\nuser-1,episode-1,2025-01-01T12:00:00.000Z,Episode Series,1,1\nuser-1,episode-2,2025-01-02T12:00:00.000Z,Episode Series,1,2\n',
        ),
      ],
      archive,
    );

    expect(preview.items[0].subunits).toEqual([
      expect.objectContaining({ kind: 'season', title: 'Season 1' }),
      expect.objectContaining({
        kind: 'episode',
        title: 'Episode 1',
        completed: true,
      }),
      expect.objectContaining({
        kind: 'episode',
        title: 'Episode 2',
        completed: true,
      }),
    ]);
    expect(preview.seriesStructure).toEqual({
      episodeCount: 2,
      seasonCount: 1,
      seriesCount: 1,
    });

    const imported = applyTvTimeImport(archive, preview, 'skip').items[0];
    expect(imported).toMatchObject({
      status: 'completed',
      progress: { current: 2, target: 2, unit: 'subunits' },
    });
  });

  it('reads TV Time v2 tracking rows as series episodes rather than movies', () => {
    const preview = previewTvTimeImport(
      [
        file(
          'user_tv_show_data.csv',
          'user_id,tv_show_id,is_followed,nb_episodes_seen,tv_show_name\nuser-1,show-v2,1,1,V2 Series\n',
        ),
        file(
          'tracking-prod-records-v2.csv',
          'series_name,s_id,episode_id,s_no,ep_no,ep_watch_count,created_at,movie_name,movie_watch_count\nV2 Series,show-v2,episode-1,1,1,1,2025-01-01T12:00:00.000Z,,\nV2 Series,show-v2,episode-2,1,2,0,2025-01-01T12:00:00.000Z,,\n',
        ),
      ],
      createEmptyArchive(),
    );

    expect(preview.items).toHaveLength(1);
    expect(preview.items[0].subunits).toEqual([
      expect.objectContaining({ kind: 'season', title: 'Season 1' }),
      expect.objectContaining({ title: 'Episode 1', completed: true }),
      expect.objectContaining({ title: 'Episode 2', completed: false }),
    ]);
    expect(
      applyTvTimeImport(createEmptyArchive(), preview, 'skip').items[0]
        .progress,
    ).toEqual({ current: 1, target: 2, unit: 'subunits' });
  });

  it('treats real v2 watch-episode rows as watched even without a per-episode watch count', () => {
    const preview = previewTvTimeImport(
      [
        file(
          'tracking-prod-records-v2.csv',
          [
            'series_name,key,created_at,s_id,episode_id,season_number,episode_number,s_no,ep_no,ep_watch_count,rewatch_count',
            'Real Series,user-series-u1,2025-01-01 10:00:00,show-real,,,,,,2,',
            'Real Series,watch-episode-u1-e1,2025-01-01 10:00:00,show-real,episode-1,1,1,1,1,,0',
            'Real Series,watch-episode-u1-e2,2025-01-02 10:00:00,show-real,episode-2,1,2,1,2,,1',
            'Real Series,rewatch-episode-u1-e2-1,2025-02-01 10:00:00,show-real,episode-2,1,2,,,,',
          ].join('\n'),
        ),
      ],
      createEmptyArchive(),
    );

    expect(preview.items).toHaveLength(1);
    expect(preview.items[0].subunits).toEqual([
      expect.objectContaining({ kind: 'season', title: 'Season 1' }),
      expect.objectContaining({
        title: 'Episode 1',
        completed: true,
        watchCount: 1,
      }),
      expect.objectContaining({
        title: 'Episode 2',
        completed: true,
        watchCount: 2,
      }),
    ]);
    expect(preview.items[0].attributes.tvTimeRewatchCount).toBe(1);
    expect(preview.watchEvents.map((event) => event.rewatch)).toEqual([
      false,
      false,
      true,
    ]);
    expect(
      applyTvTimeImport(createEmptyArchive(), preview, 'skip').items[0]
        .progress,
    ).toEqual({ current: 2, target: 2, unit: 'subunits' });
  });

  it('reads watches from legacy tracking row types and files movies as Film', () => {
    const header =
      'series_name,created_at,uuid,watch_count,type,watches,entity_type,movie_name,rewatch_count,episode_id,episode_number,season_number,series_uuid';
    const archive = createEmptyArchive();
    archive.items.push(
      createItem({
        id: 'old-import',
        type: 'movie',
        category: 'Movies',
        title: 'Rewatched Film',
        progress: { current: 0, target: 100, unit: 'percent' },
        externalIds: { tvTime: 'movie-rewatched' },
      }),
    );
    const preview = previewTvTimeImport(
      [
        file(
          'tracking-prod-records.csv',
          [
            header,
            ',2025-01-01 10:00:00,movie-watched,,follow,,movie,Watched Film,0,,,,',
            ',2025-01-01 10:00:00,movie-watched,,watch,,movie,Watched Film,0,,,,',
            ',2025-01-02 10:00:00,movie-rewatched,,watch,,movie,Rewatched Film,1,,,,',
            ',2025-02-02 10:00:00,movie-rewatched,,rewatch,,movie,Rewatched Film,1,,,,',
            ',2025-01-03 10:00:00,movie-later,,towatch,,movie,Later Film,,,,,',
            'Legacy Series,2025-01-04 10:00:00,show-legacy,,watch,,episode,,0,ep-1,1,1,show-legacy',
            'Legacy Series,2025-01-04 10:00:00,show-legacy,,last-episode-watched,,episode,,,ep-2,2,1,show-legacy',
          ].join('\n'),
        ),
      ],
      archive,
    );

    const byTitle = (title: string) =>
      preview.items.find((item) => item.title === title);
    expect(byTitle('Watched Film')).toMatchObject({
      type: 'film',
      category: 'Film',
      status: 'completed',
      attributes: { tvTimeWatchCount: 1 },
    });
    expect(byTitle('Rewatched Film')).toMatchObject({
      status: 'completed',
      attributes: { tvTimeWatchCount: 2 },
    });
    expect(byTitle('Later Film')).toMatchObject({ status: 'planned' });
    expect(byTitle('Legacy Series')?.subunits).toEqual([
      expect.objectContaining({ kind: 'season' }),
      expect.objectContaining({ title: 'Episode 1', completed: true }),
      expect.objectContaining({ title: 'Episode 2', completed: true }),
    ]);

    const updated = applyTvTimeImport(archive, preview, 'update').items.find(
      (item) => item.id === 'old-import',
    );
    expect(updated).toMatchObject({
      type: 'film',
      category: 'Film',
      status: 'completed',
    });
  });

  it('raises watch counts from legacy rewatch_count rows without double counting', () => {
    const header =
      'series_name,created_at,uuid,watch_count,type,watches,entity_type,movie_name,rewatch_count,episode_id,episode_number,season_number,series_uuid';
    const preview = previewTvTimeImport(
      [
        file(
          'tracking-prod-records.csv',
          [
            header,
            ',2025-03-01 10:00:00,movie-total,,rewatch_count,,movie,Total Film,2,,,,',
            'Total Series,2025-03-02 10:00:00,show-total,,watch,,episode,,2,ep-1,1,1,show-total',
            'Total Series,2025-03-02 10:00:00,show-total,,rewatch_count,,episode,,2,ep-1,1,1,show-total',
          ].join('\n'),
        ),
      ],
      createEmptyArchive(),
    );

    const byTitle = (title: string) =>
      preview.items.find((item) => item.title === title);
    expect(byTitle('Total Film')).toMatchObject({
      status: 'completed',
      attributes: { tvTimeWatchCount: 3 },
    });
    expect(byTitle('Total Series')).toMatchObject({
      attributes: { tvTimeRewatchCount: 2 },
    });
    expect(byTitle('Total Series')?.subunits).toEqual([
      expect.objectContaining({ kind: 'season' }),
      expect.objectContaining({
        title: 'Episode 1',
        completed: true,
        watchCount: 3,
      }),
    ]);
  });

  it('surfaces duplicates and requires an explicit resolution before applying', () => {
    const archive = createEmptyArchive();
    archive.items.push(
      createItem({
        id: 'existing-show',
        type: 'series',
        category: 'Series',
        title: 'Example Series',
        progress: { current: 1, unit: 'episodes' },
        attributes: { localOnly: true },
      }),
    );
    const preview = previewTvTimeImport(
      [
        file(
          'user_tv_show_data.csv',
          'user_id,tv_show_id,is_followed,is_favorited,nb_episodes_seen,tv_show_name\nuser-1,show-7,1,0,4,Example Series\n',
        ),
      ],
      archive,
    );

    expect(preview.conflicts).toEqual([
      expect.objectContaining({ existingItemId: 'existing-show' }),
    ]);
    expect(applyTvTimeImport(archive, preview, 'skip').items).toHaveLength(1);

    const updated = applyTvTimeImport(archive, preview, 'update');
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]).toMatchObject({
      progress: { current: 4, unit: 'episodes' },
      attributes: { localOnly: true, tvTimeFollowed: true },
      externalIds: { tvTime: 'show-7' },
    });
    expect(updated.history.at(-1)).toMatchObject({ action: 'imported' });
  });

  it('rejects malformed and unsupported files before creating an import plan', () => {
    const archive = createEmptyArchive();
    expect(() =>
      previewTvTimeImport([file('random.csv', 'name\nExample\n')], archive),
    ).toThrow('No supported TV Time library table');
    expect(() =>
      previewTvTimeImport(
        [file('user_tv_show_data.csv', 'a,b\n1,2,3\n')],
        archive,
      ),
    ).toThrow('invalid column count');
  });
});
