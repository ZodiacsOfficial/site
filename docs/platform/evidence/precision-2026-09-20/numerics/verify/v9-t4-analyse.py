"""Tabulates the differential effect sweep: size per effect, per body, and
where in the geometry it bites."""
import json, math, sys, collections

d = json.load(open('verify/t4-effects.json'))
rows = d['rows']
BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
EFFECTS = ['nut_ae','nut_2000a','bias_off','defl_off','aberr_first','aberr_off',
           'tt_as_tdb','vel_h60','vel_h600','lt_1','lt_2','lt_3']

def q(sorted_v, p):
    if not sorted_v: return None
    i = (len(sorted_v)-1)*p; lo, hi = math.floor(i), math.ceil(i)
    return sorted_v[lo] if lo==hi else sorted_v[lo]+(sorted_v[hi]-sorted_v[lo])*(i-lo)

out = {'grid': d['grid'], 'byEffectByBody': {}, 'byEffectOverall': {}, 'deflectionByElongation': {},
       'lightTime': {}, 'notes': []}

for e in EFFECTS:
    per = {}
    allv = []
    for b in BODIES:
        v = [abs(r['d'][e]) for r in rows if r['body']==b]
        allv += v
        s = sorted(v)
        worst = max((r for r in rows if r['body']==b), key=lambda r: abs(r['d'][e]))
        per[b] = {'n': len(v), 'maxAbs': s[-1], 'p50Abs': q(s,.5), 'p95Abs': q(s,.95),
                  'worstAtElongDeg': worst['elong'], 'worstAtDistAu': worst['distAu'],
                  'worstTtDays': worst['ttDays']}
    s = sorted(allv)
    out['byEffectByBody'][e] = per
    out['byEffectOverall'][e] = {'n': len(allv), 'maxAbs': s[-1], 'p50Abs': q(s,.5), 'p95Abs': q(s,.95)}

# Deflection binned by solar elongation - the geometry where it bites.
bins = [(0,1),(1,2),(2,5),(5,10),(10,20),(20,45),(45,90),(90,135),(135,180.1)]
for lo,hi in bins:
    v = [abs(r['d']['defl_off']) for r in rows if r['body']!='Sun' and lo<=r['elong']<hi]
    if not v: continue
    s = sorted(v)
    out['deflectionByElongation'][f'{lo}-{hi}deg'] = {'n': len(v), 'maxAbs': s[-1], 'p50Abs': q(s,.5)}

# Light-time convergence.
out['lightTime'] = {
    'maxIterationsUsed': max(r['ltIters'] for r in rows),
    'allConverged': all(r['ltConverged'] for r in rows),
    'maxLightTimeSeconds': max(r['ltSec'] for r in rows),
    'maxLightTimeDays': max(r['ltSec'] for r in rows)/86400,
    'byBodyMaxSeconds': {b: max(r['ltSec'] for r in rows if r['body']==b) for b in BODIES},
}
json.dump(out, open('verify/t4-summary.json','w'), indent=1)

pad=lambda s,n: str(s).ljust(n)
print(pad('effect',14), pad('n',6), pad('max"',12), pad('p50"',12), pad('p95"',12))
for e in EFFECTS:
    o=out['byEffectOverall'][e]
    print(pad(e,14), pad(o['n'],6), pad(f"{o['maxAbs']:.6f}",12), pad(f"{o['p50Abs']:.6f}",12), pad(f"{o['p95Abs']:.6f}",12))
print()
print('per-body maxima (arcsec):')
print(pad('body',9), ' '.join(pad(e,12) for e in EFFECTS))
for b in BODIES:
    print(pad(b,9), ' '.join(pad(f"{out['byEffectByBody'][e][b]['maxAbs']:.6f}",12) for e in EFFECTS))
print()
print('gravitational deflection, omitted by the prototype, binned by solar elongation:')
for k,v in out['deflectionByElongation'].items():
    print(f"  {k:14s} n={v['n']:6d} max={v['maxAbs']:.5f}\"  p50={v['p50Abs']:.5f}\"")
print()
print('light-time:', json.dumps(out['lightTime']))
