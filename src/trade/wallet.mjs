/**
 * The panel's wallet, over the Wallet Standard.
 *
 * Two jobs the Registry's existing connector cannot do between them: hold on
 * to the ACCOUNT object (signing needs it, and `connectSolanaWallet` returns
 * only an address), and sign a transaction. Discovery is reused from there
 * rather than rewritten — the register/app-ready handshake is subtle enough
 * that two copies of it would eventually disagree.
 *
 * No web3.js. Jupiter hands us a base64 transaction, the wallet signs bytes,
 * and the bytes go back as base64 for Jupiter to submit. This module never
 * builds a transaction, never talks to an RPC, and never broadcasts.
 */

import { watchSolanaWallets } from '../lib/wallet/aura-connectors.ts';
import { TradeError } from './ultra.mjs';

const CHAIN = 'solana:mainnet';
const SIGN = 'solana:signTransaction';

/** The wallet said no. Never an error worth shouting about. */
function dismissed() {
  const error = new Error('The wallet was dismissed.');
  error.name = 'WalletDismissed';
  return error;
}

/**
 * Wallets report a refusal in every shape the platform allows: a numeric code,
 * a name, or nothing but the sentence itself.
 */
function isRefusal(error) {
  if (!error) return false;
  if (error.name === 'WalletDismissed') return true;
  if (error.code === 4001 || error.code === -32603) return true;
  return /reject|refus|denied|declin|cancel|dismiss|user closed/i.test(String(error.message ?? ''));
}

function toBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64(bytes) {
  let binary = '';
  // Chunked: a spread of 60k bytes overflows the argument list in Safari.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function solanaAccount(wallet, connected) {
  const accounts = connected?.accounts?.length ? connected.accounts : wallet.accounts;
  return [...(accounts ?? [])].find((account) => (
    !account.chains?.length || account.chains.some((chain) => chain.startsWith('solana:'))
  )) ?? null;
}

/**
 * Which wallet. With one installed there is nothing to ask; with several,
 * asking is the only honest thing to do, and closing the question is a
 * dismissal rather than a failure.
 */
function chooseWallet(wallets, host) {
  if (wallets.length === 1) return Promise.resolve(wallets[0]);
  return new Promise((resolve, reject) => {
    const sheet = document.createElement('div');
    sheet.className = 'tp-pick';
    const box = document.createElement('div');
    box.className = 'tp-pick__box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Choose a wallet');

    const title = document.createElement('p');
    title.className = 'tp-pick__title';
    title.textContent = 'Choose a wallet';
    box.append(title);

    const close = () => { sheet.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (event) => { if (event.key === 'Escape') { close(); reject(dismissed()); } };

    for (const wallet of wallets) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tp-pick__w';
      if (wallet.icon) {
        const icon = document.createElement('img');
        icon.src = wallet.icon;
        icon.alt = '';
        icon.width = 24; icon.height = 24;
        button.append(icon);
      }
      button.append(document.createTextNode(wallet.name));
      button.addEventListener('click', () => { close(); resolve(wallet); });
      box.append(button);
    }

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tp-pick__x';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => { close(); reject(dismissed()); });
    box.append(cancel);

    sheet.addEventListener('click', (event) => {
      if (event.target === sheet) { close(); reject(dismissed()); }
    });
    document.addEventListener('keydown', onKey);
    sheet.append(box);
    (host?.ownerDocument ?? document).body.append(sheet);
    box.querySelector('button')?.focus();
  });
}

/**
 * @param {object} [options]
 * @param {HTMLElement} [options.host] the panel, for the chooser to sit over
 * @param {EventTarget} [options.target] discovery target (tests pass their own)
 * @param {Function} [options.choose] which-wallet question (tests pass their own)
 */
export function createWallet({ host = null, target = undefined, choose = undefined } = {}) {
  let available = [];
  const stop = watchSolanaWallets((wallets) => { available = wallets; }, target ?? window);
  const ask = choose ?? ((wallets) => chooseWallet(wallets, host));
  let session = null;

  return {
    getAddress() {
      return session?.account.address ?? null;
    },

    async connect() {
      if (session) return session.account.address;
      if (!available.length) {
        throw new TradeError(
          'unavailable',
          'No Solana wallet was found in this browser.',
        );
      }
      const wallet = await ask(available);
      let connected;
      try {
        connected = await wallet.features['standard:connect'].connect();
      } catch (error) {
        throw isRefusal(error) ? dismissed() : error;
      }
      const account = solanaAccount(wallet, connected);
      if (!account) {
        throw new TradeError('unavailable', 'That wallet has no Solana account.');
      }
      session = { wallet, account };
      return account.address;
    },

    async signTransaction(base64) {
      if (!session) throw new TradeError('unavailable', 'No wallet is connected.');
      const feature = session.wallet.features[SIGN];
      if (!feature) {
        throw new TradeError('unavailable', 'That wallet cannot sign here.');
      }
      let signed;
      try {
        signed = await feature.signTransaction({
          transaction: toBytes(base64),
          account: session.account,
          chain: CHAIN,
        });
      } catch (error) {
        throw isRefusal(error) ? dismissed() : error;
      }
      const bytes = signed?.[0]?.signedTransaction;
      if (!bytes) throw new TradeError('unavailable', 'The wallet returned nothing to submit.');
      return toBase64(bytes);
    },

    destroy() {
      stop();
      session = null;
    },
  };
}
