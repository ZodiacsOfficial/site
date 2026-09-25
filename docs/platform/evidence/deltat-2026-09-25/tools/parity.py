"""The Python twin (lib.Model on ../table.json) against the TypeScript module:
same seconds and σ to 1e-9 s and the same segment on a grid from −3000 to 3000,
densified around every join. The replay and hindcast tools use the twin, so
this is what lets their numbers stand for the module. Writes outputs/parity.json.

    DELTAT_SOURCES=<dir> python3 tools/parity.py [module]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402


def main():
    table = lib.load_table()
    twin = lib.Model(table)
    ys = [-3000 + 0.37 * k for k in range(int(6000 / 0.37))]
    for j in [-720, 640, 1620, 1941, 1956, twin.obs_y, twin.pred_y] + [p[0] for p in table['sigma']['points']]:
        ys += [j + d for d in (-1e-6, 0, 1e-6, -0.01, 0.01, 0.5, -0.5)]
    ys += [twin.obs_y + 0.001 * k for k in range(-500, 1500)]
    uts = [(y - 2000) * 365.25 for y in ys]
    ts = lib.ts_model(uts, sys.argv[1] if len(sys.argv) > 1 else None)
    worst_s = worst_sig = 0.0
    seg_bad = 0
    for i, ut in enumerate(uts):
        y = 2000 + ut / 365.25
        worst_s = max(worst_s, abs(twin.seconds(y) - ts['seconds'][i]))
        worst_sig = max(worst_sig, abs(twin.sigma(y) - ts['sigma'][i]))
        seg_bad += twin.segment(y) != ts['segment'][i]
    assert ts['table']['digest'] == table['digest'] and ts['table']['version'] == table['version'], ts['table']
    assert list(ts['table']['knots']) == table['knots']['encoded']
    out = {'module': os.path.basename(ts['module']), 'points': len(uts), 'maxSecondsDiff': worst_s, 'maxSigmaDiff': worst_sig,
           'segmentMismatches': seg_bad, 'tableDigest': table['digest']}
    lib.dump(out, 'parity.json')
    print(out)
    assert worst_s < 1e-9 and worst_sig < 1e-9 and seg_bad == 0


if __name__ == '__main__':
    main()
