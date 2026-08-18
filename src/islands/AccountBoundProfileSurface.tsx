import { useEffect, useState } from 'preact/hooks';
import ProfileDashboard from './ProfileDashboard';
import ProfileManager from './ProfileManager';
import {
  inspectLocalAccountBoundary,
  type AccountV2Storage,
} from '../lib/account-v2/local-state';
import { hasAccountBoundLocalProfileData } from '../lib/account-v2/profile-boundary';
import { getAccountV2BrowserStorage } from '../lib/account-v2/browser-storage';
import { profileAccessAllowed } from '../lib/account-v2/profile-access-reader';
import type { CatalogLocale } from '../lib/i18n';

interface Props {
  dailyEmailEnabled?: boolean;
  locale?: CatalogLocale;
  livingChartEnabled?: boolean;
  livingChartSyncEnabled?: boolean;
}

type LivingChartTimelineModule = typeof import('./living-chart/LivingChartTimeline');

type AccessState = 'checking' | 'visible' | 'withheld';

export function accountBoundProfileAccess(
  storage: AccountV2Storage,
  authenticatedAccountId: string | null,
  accessAllowed = profileAccessAllowed(),
): Exclude<AccessState, 'checking'> {
  if (!accessAllowed) return 'withheld';
  if (authenticatedAccountId === null) return 'visible';
  const boundary = inspectLocalAccountBoundary(
    storage,
    authenticatedAccountId,
    hasAccountBoundLocalProfileData(storage),
  );
  return boundary.status === 'ready' ? 'visible' : 'withheld';
}

/**
 * Keeps birth-chart surfaces out of the DOM until the signed-in account owns
 * this browser's active local profile. The account panel performs any needed
 * hand-off, then reloads the page so this gate can re-evaluate from storage.
 */
export default function AccountBoundProfileSurface({
  dailyEmailEnabled = false,
  locale = 'en',
  livingChartEnabled = false,
  livingChartSyncEnabled = false,
}: Props) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [livingChartModule, setLivingChartModule] = useState<LivingChartTimelineModule | null>(null);

  useEffect(() => {
    if (!livingChartEnabled || locale !== 'en' || access !== 'visible') return;
    let live = true;
    void import('./living-chart/LivingChartTimeline')
      .then((module) => {
        if (live) setLivingChartModule(module);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [access, livingChartEnabled, locale]);

  useEffect(() => {
    let live = true;
    let unsubscribe = () => {};
    let authVersion = 0;
    let currentAccountId: string | null = null;
    const storage = getAccountV2BrowserStorage()?.local ?? null;

    const evaluate = (accountId: string | null) => {
      if (!live) return;
      currentAccountId = accountId;
      setAccess(storage
        ? accountBoundProfileAccess(storage, accountId)
        : 'withheld');
    };

    const onProfileAccess = () => evaluate(currentAccountId);
    window.addEventListener('zodiacs:profile-access', onProfileAccess);

    void import('../lib/profile/sync').then(async (api) => {
      if (!live) return;
      if (!api.isSupabaseConfigured()) {
        setAccess('withheld');
        return;
      }
      // Install the listener before reading the session snapshot so an auth
      // transition cannot be lost between those two operations.
      unsubscribe = api.onSyncAuthChange((next) => {
        authVersion += 1;
        // Every auth event invalidates the old account decision first. The
        // bootstrap's subsequent profile-access event is the only event that
        // may reveal the surface again after it acquires a fresh shared lease.
        currentAccountId = next?.user.id ?? null;
        setAccess('withheld');
      });
      const snapshotVersion = authVersion;
      const current = await api.getSyncSession();
      if (!live || authVersion !== snapshotVersion) return;
      evaluate(current?.user.id ?? null);
    }).catch(() => {
      if (live) setAccess('withheld');
    });

    return () => {
      live = false;
      unsubscribe();
      window.removeEventListener('zodiacs:profile-access', onProfileAccess);
    };
  }, []);

  if (access !== 'visible') return null;
  const LivingChartTimeline = livingChartModule?.default;
  return (
    <>
      <ProfileDashboard locale={locale} />
      {LivingChartTimeline ? <LivingChartTimeline syncEnabled allowSyncGrant={livingChartSyncEnabled} /> : null}
      <ProfileManager locale={locale} dailyEmailEnabled={dailyEmailEnabled} accountSyncV2Enabled />
    </>
  );
}
