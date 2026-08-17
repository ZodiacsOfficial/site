// Vercel serverless function. One function for the whole Zodiac Games
// surface: /api/games?action=standings|join|checkin (see
// src/lib/games/server.ts for the handler and its auth model).
import { handleGamesApi } from '../src/lib/games/server.js';

export const config = { maxDuration: 15 };

export default async function handler(req: any, res: any): Promise<void> {
  await handleGamesApi(req, res);
}
