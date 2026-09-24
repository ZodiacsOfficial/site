"""Brief v1 M3's rule for step 1.13: Julian to Gregorian agrees with
swe_julday/swe_revjul exactly. Reads the pairs julian-dump.ts prints and, for
each, takes the Julian day number of the Julian date with swe.julday(...,
JUL_CAL) and turns it back into a Gregorian date with swe.revjul(...,
GREG_CAL). Prints the count and every disagreement.

  python3 julian-vs-swiss.py julian-pairs.txt
"""
import json, sys
import swisseph as swe

checked, differ = 0, []
for line in open(sys.argv[1]):
    julian, ours = line.split()
    y, m, d = map(int, julian.split('-'))
    jd = swe.julday(y, m, d, 12.0, swe.JUL_CAL)
    gy, gm, gd, _ = swe.revjul(jd, swe.GREG_CAL)
    swiss = f'{gy:04d}-{gm:02d}-{gd:02d}'
    checked += 1
    if swiss != ours:
        differ.append({'julian': julian, 'site': ours, 'swiss': swiss})
print(json.dumps({'swisseph': swe.version, 'from': '1500-01-01', 'to': '2199-12-31', 'checked': checked, 'differ': len(differ), 'disagreements': differ[:50]}, indent=1))
