/*
 * Backward-compatible entry point. There is deliberately one icon compositor:
 * running either historical command must produce the same complete wheel.
 */
import { buildPwaIcons } from './build-pwa-icons.mjs';

console.log(`App icons: ${await buildPwaIcons()} canonical twelve-sign wheel assets written.`);
