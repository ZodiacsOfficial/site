import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_ENTRIES,
  hasArchivedPrimaryReceipt,
  listZeroReceiptEntryIds,
  receiptVerificationState,
  validateArchiveReceipts,
} from './archive-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const validReceipt = {
  label: 'Primary record',
  url: 'https://example.com/record',
  archivedUrl: '',
};

describe('archive receipt schema', () => {
  it('gives every committed entry an explicit, valid receipt array', () => {
    expect(() => validateArchiveReceipts(ARCHIVE_ENTRIES)).not.toThrow();
    expect(ARCHIVE_ENTRIES.every((entry) => Object.hasOwn(entry, 'receipts'))).toBe(true);
    expect(listZeroReceiptEntryIds()).toEqual([]);
  });

  it('lists zero-receipt IDs in source order for a single build warning', () => {
    expect(listZeroReceiptEntryIds([
      { id: 'missing-array' },
      { id: 'has-one', receipts: [validReceipt] },
      { id: 'empty-array', receipts: [] },
    ])).toEqual(['missing-array', 'empty-array']);
  });

  it('rejects missing fields and non-absolute receipt URLs', () => {
    expect(() => validateArchiveReceipts([{ id: 'missing', receipts: [{}] }]))
      .toThrow('Archive receipt missing[0].label must be a non-empty string');
    expect(() => validateArchiveReceipts([{
      id: 'relative',
      receipts: [{ ...validReceipt, url: '/record' }],
    }])).toThrow('Archive receipt relative[0].url must be an absolute HTTP(S) URL');
    expect(() => validateArchiveReceipts([{
      id: 'bad-archive',
      receipts: [{ ...validReceipt, archivedUrl: 'archive.example/record' }],
    }])).toThrow(
      'Archive receipt bad-archive[0].archivedUrl must be empty or an absolute HTTP(S) URL',
    );
  });
});

describe('archived-primary-source gate', () => {
  it('keeps accidental-libra pending despite its valid registry mint proof', () => {
    const entry = ARCHIVE_ENTRIES.find(({ id }) => id === 'accidental-libra');
    expect(entry?.mintProof).toBeTruthy();
    expect(hasArchivedPrimaryReceipt(entry)).toBe(false);
    expect(receiptVerificationState(entry)).toBe('pending');
  });

  it('allows verified state only after an archived primary receipt is supplied', () => {
    const entry = ARCHIVE_ENTRIES.find(({ id }) => id === 'accidental-libra');
    const withArchive = {
      ...entry,
      receipts: entry.receipts.map((receipt, index) => index === 0
        ? { ...receipt, archivedUrl: 'https://web.archive.org/web/20250218/https://example.com/post' }
        : receipt),
    };

    expect(hasArchivedPrimaryReceipt(withArchive)).toBe(true);
    expect(receiptVerificationState(withArchive)).toBe('verified');
  });
});

describe('rendered archive receipts', () => {
  it('renders receipt chips with nofollow and leaves Portnoy visibly pending', async () => {
    const html = await readFile(resolve(root, 'public/archive/index.html'), 'utf8');
    const portnoy = html.match(
      /<article class="arc reveal" id="accidental-libra">[\s\S]*?<\/article>/,
    )?.[0];
    const receiptAnchors = [...html.matchAll(/<a class="arc__receipt[^"]*"[^>]*>/g)]
      .map(([tag]) => tag);

    expect(portnoy).toContain('arc__status arc__status--pending');
    expect(portnoy).toContain('Pending archived primary source');
    expect(portnoy).not.toContain('arc__tick');
    expect(html).toContain('--pending: #E0B080');
    expect(receiptAnchors).toHaveLength(ARCHIVE_ENTRIES.reduce(
      (count, entry) => count + entry.receipts.length, 0,
    ));
    expect(receiptAnchors.every((tag) => tag.includes('rel="noopener nofollow"'))).toBe(true);
    expect(html).toContain('<span class="arc__external" aria-hidden="true">↗</span>');
  });

  it('uses only the canonical zodiac icon primitive on touched sign visuals', async () => {
    const html = await readFile(resolve(root, 'public/archive/index.html'), 'utf8');
    expect(html).toContain('src="/assets/zodiac-icons/48/libra.webp"');
    expect(html).not.toContain('class="arc__signs"><a href="/registry/libra/" aria-label="Libra"><img src="/assets/icons/');
  });
});
