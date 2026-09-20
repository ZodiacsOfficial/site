import { coreBackend, circular } from '../lib/backends.mjs';
const core = await coreBackend();
for (const t of ['2020-01-10T02:11:00Z','2020-01-22T23:33:00Z','2020-01-22T23:34:00Z','2020-01-22T23:35:00Z']) {
  const ms=Date.parse(t); const L=core.lon('Moon',ms);
  console.log(t,'lon=',L.toFixed(6),'g=circ(lon,100)=',circular(L,100).toFixed(6));
}
