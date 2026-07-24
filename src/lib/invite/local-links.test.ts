import { describe, expect, it } from 'vitest';
import {
  INVITE_LINKS_STORAGE_KEY,
  inviteLinksForRows,
  readInviteLink,
  rememberInviteLink,
  removeInviteLink,
  type InviteLinkStorage,
} from './local-links';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'A'.repeat(43);
const TOKEN_B = 'B'.repeat(43);

function memoryStorage(): InviteLinkStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('local invitation links', () => {
  it('remembers and reads only the browser-held private URL', () => {
    const storage = memoryStorage();
    const url = `https://zodiacs.org/c/${TOKEN_A}/`;

    expect(rememberInviteLink(ID_A, url, storage, 'https://zodiacs.org')).toBe(true);
    expect(readInviteLink(ID_A, storage, 'https://zodiacs.org')).toBe(url);
    expect(readInviteLink(ID_B, storage, 'https://zodiacs.org')).toBeNull();
  });

  it('accepts same-origin preview links without broadening production origins', () => {
    const storage = memoryStorage();
    const preview = `https://phase4-preview.vercel.app/c/${TOKEN_A}/`;

    expect(
      rememberInviteLink(ID_A, preview, storage, 'https://phase4-preview.vercel.app'),
    ).toBe(true);
    expect(
      readInviteLink(ID_A, storage, 'https://phase4-preview.vercel.app'),
    ).toBe(preview);
    expect(
      readInviteLink(ID_A, storage, 'https://zodiacs.org'),
    ).toBeNull();
  });

  it('rejects malformed, cross-origin, query-bearing, and short-token links', () => {
    const storage = memoryStorage();
    expect(
      rememberInviteLink(ID_A, `https://elsewhere.example/c/${TOKEN_A}/`, storage, 'https://zodiacs.org'),
    ).toBe(false);
    expect(
      rememberInviteLink(ID_A, `https://zodiacs.org/c/${TOKEN_A}/?token=again`, storage, 'https://zodiacs.org'),
    ).toBe(false);
    expect(
      rememberInviteLink(ID_A, 'https://zodiacs.org/c/short/', storage, 'https://zodiacs.org'),
    ).toBe(false);
    expect(
      rememberInviteLink('not-an-id', `https://zodiacs.org/c/${TOKEN_A}/`, storage, 'https://zodiacs.org'),
    ).toBe(false);
  });

  it('returns links only for requested rows and removes ended links', () => {
    const storage = memoryStorage();
    rememberInviteLink(ID_A, `https://zodiacs.org/c/${TOKEN_A}/`, storage, 'https://zodiacs.org');
    rememberInviteLink(ID_B, `https://zodiacs.org/c/${TOKEN_B}/`, storage, 'https://zodiacs.org');

    expect(inviteLinksForRows([ID_A], storage, 'https://zodiacs.org')).toEqual({
      [ID_A]: `https://zodiacs.org/c/${TOKEN_A}/`,
    });
    expect(removeInviteLink(ID_A, storage)).toBe(true);
    expect(readInviteLink(ID_A, storage, 'https://zodiacs.org')).toBeNull();
    expect(readInviteLink(ID_B, storage, 'https://zodiacs.org')).not.toBeNull();
  });

  it('fails closed when storage is corrupt or unavailable', () => {
    const storage = memoryStorage();
    storage.values.set(INVITE_LINKS_STORAGE_KEY, '{not json');
    expect(readInviteLink(ID_A, storage, 'https://zodiacs.org')).toBeNull();

    const blocked: InviteLinkStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(
      rememberInviteLink(ID_A, `https://zodiacs.org/c/${TOKEN_A}/`, blocked, 'https://zodiacs.org'),
    ).toBe(false);
    expect(readInviteLink(ID_A, blocked, 'https://zodiacs.org')).toBeNull();
    expect(removeInviteLink(ID_A, blocked)).toBe(false);
  });
});
