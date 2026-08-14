import { handleGuideApi } from '../src/lib/guide-server/handler.js';

export const config = {
  api: { bodyParser: false },
  supportsCancellation: true,
  maxDuration: 60,
};

export default handleGuideApi;
