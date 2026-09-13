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
