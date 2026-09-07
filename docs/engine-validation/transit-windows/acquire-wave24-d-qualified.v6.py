#!/usr/bin/env python3
"""Preparation only. Disclosed GCC environment repair; three reviewed hashes.

Imports no application code; does not install, download, or change provider files.
Replays all 3414 historical D evaluations exactly before any new root work.
Preserves the earlier missing-Clang setup failure; allows one actual GCC build.
The original failed pack remains failed even when this qualified receipt completes.
"""
import argparse
import copy
import ctypes
import gzip
import hashlib
import importlib.metadata
import importlib.util
import json
import math
import os
from pathlib import Path
import platform
import sys
import time
import types


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_new(path, value):
    with Path(path).open('x') as handle:
        json.dump(value, handle, indent=2, allow_nan=False)
        handle.write('\n')


def verify_inputs(policy, args):
    verified = {}
    roots = {'v2': Path(args.v2_directory), 'v3': Path(args.v3_directory)}
    for item in policy['upstreamFiles']:
        path = roots[item['bundle']] / item['file']
        require(digest(path) == item['sha256'], 'Upstream bytes changed: ' + str(path))
        verified[item['role']] = path
    v2 = json.loads(verified['v2-raw'].read_text())
    v3 = json.loads(verified['v3-raw'].read_text())
    original = json.loads(verified['v2-policy'].read_text())
    require(v2['policy'] == original, 'Embedded v2 policy mismatch')
    require(v3['overallPackStatus'] == 'failed-incomplete' and v3['upstreamDRemainsFailed'], 'Upstream D failure not preserved')
    require(v3['cumulativeUniquePositionEvaluationCount'] == policy['cumulative']['upstreamPositions'], 'ID floor drift')
    require(v3['cumulativeElapsedSeconds'] == policy['cumulative']['upstreamElapsedSeconds'], 'Elapsed floor drift')
    for field in ['convention', 'clockPolicy', 'numerics', 'gates', 'eligibility']:
        require(original[field] == policy['frozenScientificFields'][field], 'Scientific field drift: ' + field)
    case = v2['cases']['D-Uranus2020']['input']
    require(case == policy['case'], 'Original D declaration changed')
    require(case == next(c for c in original['cases'] if c['id'] == 'D-Uranus2020'), 'D source declaration mismatch')
    require(case == next(c for c in v3['policy']['cases'] if c['id'] == 'D-Uranus2020'), 'D v3 declaration mismatch')
    require(v2['lastGeometryState']['margins'][25] == policy['originalFailedWitness'], 'Failed witness changed')
    track = v2['trajectories'][v2['cases']['D-Uranus2020']['trajectoryId']]
    require(track['body'] == 'Uranus' and track['basis'] == 'TT' and track['offset'] == 69.184, 'D trajectory convention changed')
    require(len(track['grid']) == 1461 and len(track['stations']) == 4 and len(track['branches']) == 5, 'D retained geometry changed')
    c_rows, wrappers = {}, {}
    with gzip.open(verified['v2-journal'], 'rt') as handle:
        for line in handle:
            row = json.loads(line)
            if row['type'] == 'position-c' and row.get('body') == 'Uranus':
                require(row['evaluationId'] not in c_rows, 'Duplicate retained C ID')
                c_rows[row['evaluationId']] = row
            elif row['type'] == 'position-wrapper':
                require(row['evaluationId'] not in wrappers, 'Duplicate retained wrapper ID')
                wrappers[row['evaluationId']] = row
    require(len(c_rows) == 3414, 'Retained Uranus count changed')
    cache = {}
    for identity, row in c_rows.items():
        wrapped = wrappers[identity]
        require(row['requestedFlags'] == row['returnedFlags'] == wrapped['returnedFlags'] == 258, 'Retained flags mismatch')
        require(row['warning'] == '' and row['values'] == wrapped['values'], 'Retained provider parity mismatch')
        require(len(row['values']) == 6 and all(math.isfinite(x) for x in row['values']), 'Retained nonfinite tuple')
        instant = row['instant']
        require(instant['basis'] == 'TT' and instant['clockJD'] == instant['jdTT'], 'Retained TT mismatch')
        require(track['start'] <= instant['clockJD'] <= track['end'], 'Retained clock escaped query')
        require(row['approvedClockBounds'] == [track['start'], track['end']], 'Retained query binding changed')
        key = ('Uranus', instant['clockJD'], 'TT', 69.184)
        require(key not in cache, 'Duplicate retained position clock')
        cache[key] = row
    for branch in track['branches']:
        rows = branch['samples']
        for sample in rows:
            row = c_rows[sample['evaluationId']]
            require(sample['clockJD'] == row['instant']['clockJD'] and sample['longitude'] == row['values'][0], 'Retained branch provenance mismatch')
        require(all(branch['direction'] * (b['unwrapped'] - a['unwrapped']) >= 0 for a, b in zip(rows, rows[1:])), 'Retained sampled direction mismatch')
    # Compiling verified text does not run its __main__ block or initialize Swiss.
    namespace = types.ModuleType('verified_wave24_v2_recipe')
    namespace.__file__ = str(verified['v2-recipe'])
    source = verified['v2-recipe'].read_bytes()
    exec(compile(source, str(verified['v2-recipe']), 'exec'), namespace.__dict__)
    require('swisseph' not in sys.modules, 'Provider imported during source-only preflight')
    return verified, v2, v3, original, case, track, cache, namespace


def make_acquisition(base, proposal, original, case, track, cache, manifest, journal):
    class DContinuation(base.Acquisition):
        # Numerical functions evaluate/stamp/bisect/level_root remain inherited.
        def __init__(self):
            runtime_policy = copy.deepcopy(original)
            runtime_policy['runtime']['reuseExecutable'] = str(Path(manifest['pythonExecutable']).absolute())
            runtime_policy['runtime']['ephemerisDirectory'] = str(Path(manifest['ephemerisDirectory']).resolve())
            runtime_policy['runtime']['extensionSHA256'] = manifest['extensionSHA256']
            super().__init__(runtime_policy, journal)
            self.historical_cache = dict(cache)
            self.cache = {}
            self.upstream_id_for_clock = {row['instant']['clockJD']: row['evaluationId'] for row in cache.values()}
            self.new_wrappers = {}
            self.concordance = {'status': 'not-started', 'requiredPositions': 3414, 'completedPositions': 0, 'mappings': [], 'current': None}
            self.replay_end_id = None
            self.next_id = proposal['cumulative']['upstreamPositions']
            self.new_started = time.monotonic()
            self.started = self.new_started - proposal['cumulative']['upstreamElapsedSeconds']
            self.stage = 'D-qualified-runtime-preflight'
            self.track = track
            self.qualified = {'roots': {}, 'thresholdMargins': [], 'exactMargins': [], 'membershipCells': [], 'components': []}

        def limit(self):
            super().limit()
            require(time.monotonic() - self.new_started <= proposal['limits']['maximumNewWallSeconds'], 'D-only wall limit reached')
            # Conservatively stop all work at the cap, including cache accesses.
            require(self.next_id - proposal['cumulative']['upstreamPositions'] < proposal['limits']['maximumNewPositions'], 'D-only position limit reached')
            if self.replay_end_id is not None:
                require(self.next_id - self.replay_end_id < proposal['limits']['maximumPostReplayPositions'], 'Post-concordance 600-position limit reached')

        def log(self, row):
            super().log(row)
            if row.get('type') == 'position-wrapper':
                self.new_wrappers[row['evaluationId']] = row

        def initialize(self):
            self.limit()
            runtime = proposal['runtimeIdentity']
            extension = Path(manifest['extensionPath']).resolve()
            ephe = Path(manifest['ephemerisDirectory']).resolve()
            require(sys.version_info[:2] == (3, 12), 'The separately reviewed build requires Python 3.12')
            require(Path(sys.executable).absolute() == Path(manifest['pythonExecutable']).absolute(), 'Use the reviewed runtime executable')
            require(len(manifest['extensionSHA256']) == 64 and all(x in '0123456789abcdef' for x in manifest['extensionSHA256']), 'Invalid approved new extension hash')
            require(digest(extension) == manifest['extensionSHA256'], 'Reviewed new extension hash mismatch before import')
            require(manifest['sourceArchiveSHA256'] == proposal['officialBuild']['sourceArchiveSHA256'], 'Official source identity mismatch')
            require(digest(manifest['sourceArchivePath']) == proposal['officialBuild']['sourceArchiveSHA256'], 'Official source archive bytes changed')
            require(manifest['sourceArchiveURL'] == proposal['officialBuild']['sourceArchiveURL'], 'Official source URL mismatch')
            require(manifest['buildRecipeId'] == proposal['officialBuild']['buildRecipeId'] and manifest['buildCount'] == 1, 'Only the predeclared single actual GCC build is eligible')
            require(manifest['buildAttemptCount'] == 2, 'Preserve the initial missing-Clang setup attempt and one actual GCC build')
            require(manifest['compilerEnvironment'] == proposal['officialBuild']['compilerEnvironment'], 'Compiler environment differs from the recorded repository recipe')
            require(manifest['customOptimizationFlags'] is False, 'Adaptive optimization or extra flags are outside this environment repair')
            require(manifest['priorProviderImports'] == 0 and manifest['priorProviderEvaluations'] == 0, 'Environment repair must precede all provider observation')
            for item in proposal['environmentRepair']['preservedFiles']:
                actual_path = manifest['environmentRepairFiles'][item['role']]
                require(digest(actual_path) == item['sha256'], 'Preserved setup failure or historical build provenance changed: ' + item['role'])
            for option in proposal['officialBuild']['requiredWheelOptions']:
                require(option in manifest['buildCommand'].split(), 'Recorded build command is missing its required offline option: ' + option)
            require(bool(manifest['buildCommand']) and bool(manifest['compilerIdentity']) and bool(manifest['pythonBuildIdentity']), 'Missing reviewed build provenance')
            require(manifest['distributionVersion'] == runtime['distributionVersion'] and manifest['swissVersion'] == runtime['swissVersion'], 'Manifest version mismatch')
            require(digest(manifest['wheelPath']) == manifest['wheelSHA256'], 'Reviewed wheel hash mismatch')
            require('swisseph' not in sys.modules, 'Provider imported before hash verification')
            spec = importlib.util.find_spec('swisseph')
            require(spec and spec.origin and Path(spec.origin).resolve() == extension, 'Import resolution does not select reviewed extension')
            for item in runtime['ephemerisFiles']:
                require(digest(ephe / item['path']) == item['sha256'], 'Pinned ephemeris hash mismatch')
            for name in runtime['optionalFilesExpectedAbsent']:
                require(not (ephe / name).exists(), 'Unreviewed optional time file: ' + name)
            self.runtime_receipt = {'verifiedBeforeProviderImport': {'extension': str(extension), 'sha256': digest(extension)}, 'manifest': manifest}
            self.log({'type': 'runtime-preimport', **self.runtime_receipt})
            os.environ['SE_EPHE_PATH'] = str(ephe)
            import swisseph as swe
            require(Path(swe.__file__).resolve() == extension and digest(swe.__file__) == manifest['extensionSHA256'], 'Imported extension changed')
            require(swe.version == runtime['swissVersion'], 'Swiss version mismatch')
            require(importlib.metadata.version('pyswisseph') == runtime['distributionVersion'], 'Distribution version mismatch')
            swe.set_ephe_path(str(ephe))
            self.swe = swe
            library = ctypes.CDLL(str(extension))
            dp = ctypes.POINTER(ctypes.c_double)
            library.swe_calc.argtypes = [ctypes.c_double, ctypes.c_int, ctypes.c_int, dp, ctypes.c_char_p]
            library.swe_calc.restype = ctypes.c_int
            library.swe_get_current_file_data.argtypes = [ctypes.c_int, dp, dp, ctypes.POINTER(ctypes.c_int)]
            library.swe_get_current_file_data.restype = ctypes.c_char_p
            self.library = library
            self.runtime_receipt.update(executable=sys.executable, python=sys.version, platform=platform.platform(), extension=str(extension), extensionSHA256=digest(extension), ephemerisDirectory=str(ephe), distributionVersion=runtime['distributionVersion'], swissVersion=swe.version)
            self.log({'type': 'runtime', 'receipt': self.runtime_receipt})
            for name in ['from', 'anchor', 'to']:
                clock = self.input(case[name], 'TT', 69.184)
                key = {'from': 'start', 'anchor': 'anchor', 'to': 'end'}[name]
                require(clock['clockJD'] == track[key], 'Retained query clock mismatch: ' + name)

        def replay_historical_d(self):
            self.stage = 'D-new-runtime-exact-historical-concordance'
            self.concordance['status'] = 'running'
            require(not self.cache and self.next_id == proposal['cumulative']['upstreamPositions'], 'Replay must begin with an empty new-runtime cache')
            for old in sorted(self.historical_cache.values(), key=lambda row: row['evaluationId']):
                old_id = old['evaluationId']
                self.concordance['current'] = {'upstreamEvaluationId': old_id, 'upstreamInstant': old['instant'], 'upstreamSixTuple': old['values'], 'expectedNewEvaluationId': self.next_id + 1}
                fresh = self.evaluate(track, old['instant']['clockJD'])
                wrapped = self.new_wrappers[fresh['evaluationId']]
                self.concordance['current'].update(newEvaluationId=fresh['evaluationId'], newInstant=fresh['instant'], newSixTuple=fresh['values'], newWrapperSixTuple=wrapped['values'])
                # Hex representations also preserve the distinction between +0 and -0.
                expected = [float(value).hex() for value in old['values']]
                require([float(value).hex() for value in fresh['values']] == expected, 'Historical six-tuple mismatch at upstream ID ' + str(old_id))
                require([float(value).hex() for value in wrapped['values']] == expected, 'Historical wrapper six-tuple mismatch at upstream ID ' + str(old_id))
                require(fresh['instant'] == old['instant'], 'Historical clock/UTC transport mismatch at upstream ID ' + str(old_id))
                self.concordance['mappings'].append({'upstreamEvaluationId': old_id, 'newEvaluationId': fresh['evaluationId'], 'clockJD': fresh['instant']['clockJD'], 'sixTupleHex': expected, 'clockTransportExactlyMatched': True})
                self.concordance['completedPositions'] += 1
            require(self.concordance['completedPositions'] == 3414 and len(self.cache) == 3414, 'Incomplete exact historical replay')
            require(self.next_id == proposal['cumulative']['upstreamPositions'] + 3414, 'Concordance must account for all 3414 new provider evaluations')
            self.replay_end_id = self.next_id
            self.concordance.update(status='all-historical-tuples-and-clocks-exactly-matched', current=None, replayEndEvaluationId=self.replay_end_id, firstPostReplayEvaluationId=self.replay_end_id + 1)
            self.log({'type': 'historical-concordance-complete', 'completedPositions': 3414, 'replayEndEvaluationId': self.replay_end_id})

        def existing_margin(self, name, jd, role, level):
            ev = self.evaluate(track, jd)
            margin = abs(base.delta(ev['values'][0], level))
            return {'point': name, 'clockJD': jd, 'evaluationId': ev['evaluationId'], 'upstreamEvaluationId': self.upstream_id_for_clock[jd], 'role': role, 'levelDegrees': level, 'circularMarginDegrees': margin, 'requiredGreaterThanDegrees': case['angularBudgetDegrees'] + self.p['numerics']['geometricResolutionDegrees']}

        def assemble_band(self, lower_id, upper_id, branch_id=None):
            a, b = sorted([self.qualified['roots'][lower_id], self.qualified['roots'][upper_id]], key=lambda x: x['estimate']['clockJD'])
            allowed = [a['lower']['productTransportMilliseconds'] - 1000, b['upper']['productTransportMilliseconds'] + 1000]
            out = {'boundaryRootIds': [a['id'], b['id']], 'rawOuterClockJDs': [a['lower']['clockJD'], b['upper']['clockJD']], 'allowedProductMilliseconds': allowed, 'formattingPaddingSeconds': 1, 'angularBudgetDegrees': case['angularBudgetDegrees']}
            require(a['upper']['clockJD'] < b['lower']['clockJD'], 'Envelope edge ordering unresolved')
            if branch_id is not None:
                branch = track['branches'][branch_id]
                edges = [self.stamp(x, 'TT', 69.184)['productTransportMilliseconds'] for x in [branch['start'], branch['end']]]
                require(edges[0] < allowed[0] < allowed[1] < edges[1], 'Padded root band reaches branch boundary')
                out.update(branchId=branch['id'], branchEndpointMilliseconds=edges)
            return out

        def acquire_d(self):
            self.initialize()
            self.replay_historical_d()
            self.stage = 'D-qualified-original-margins'
            T, B = case['targetLongitudeDegrees'], case['angularBudgetDegrees']
            points = [('query-start', track['start']), ('query-end', track['end'])]
            for turn in track['stations']:
                points += [(turn['id'] + ':resolution-left', turn['resolutionCellJD'][0]), (turn['id'] + ':best', turn['geometricBest']['clockJD']), (turn['id'] + ':resolution-right', turn['resolutionCellJD'][1])]
            for name, jd in points:
                for role, shift in [('lower-threshold', -3), ('upper-threshold', 3)]:
                    row = self.existing_margin(name, jd, role, T + shift)
                    self.qualified['thresholdMargins'].append(row)
                    require(row['circularMarginDegrees'] > row['requiredGreaterThanDegrees'], 'D threshold conditioning failed')
                row = self.existing_margin(name, jd, 'exact', T)
                row['conditioned'] = row['circularMarginDegrees'] > row['requiredGreaterThanDegrees']
                self.qualified['exactMargins'].append(row)
            failures = [x for x in self.qualified['exactMargins'] if not x['conditioned']]
            require(len(failures) == 3 and all(':turn:2:' in x['point'] for x in failures), 'Unexpected D exact-conditioning disposition')
            require(failures[0]['upstreamEvaluationId'] == proposal['originalFailedWitness']['evaluationId'] and failures[0]['circularMarginDegrees'] == proposal['originalFailedWitness']['circularMarginDegrees'], 'Original failed witness not retained')
            self.qualified['exactConditioningFailures'] = failures
            self.stage = 'D-qualified-predeclared-level-roots'
            for item in proposal['levelSchedule']:
                branch = track['branches'][item['branch']]
                require(item['id'] not in self.qualified['roots'], 'Duplicate scheduled root')
                root = self.level_root(track, branch, item['levelDegrees'], item['id'])
                root.update(levelDegrees=item['levelDegrees'], branchId=branch['id'], longitudeDirection=branch['direction'], purpose=item['purpose'])
                self.qualified['roots'][item['id']] = root
            require(len(self.qualified['roots']) == 21, 'Incomplete fixed schedule')
            threshold_specs = [('entry1', 'b1:L', 'b1:L-B', 'b1:L+B', 1), ('exit1', 'b1:U', 'b1:U-B', 'b1:U+B', 1), ('entry2', 'b2:U', 'b2:U-B', 'b2:U+B', 2), ('exit2', 'b3:U', 'b3:U-B', 'b3:U+B', 3)]
            thresholds = [{'name': name, 'rootId': root, 'band': self.assemble_band(lo, hi, bi), 'membershipDirection': 'entry' if name.startswith('entry') else 'exit'} for name, root, lo, hi, bi in threshold_specs]
            self.qualified['thresholds'] = thresholds
            for a, b in zip(thresholds, thresholds[1:]):
                require(a['band']['allowedProductMilliseconds'][1] < b['band']['allowedProductMilliseconds'][0], 'Threshold timing bands overlap')
            physical_ids = ['b1:L', 'b1:T', 'b1:U', 'b2:U', 'b2:T', 'b3:T', 'b3:U']
            physical = [self.qualified['roots'][x] for x in physical_ids]
            for a, b in zip(physical, physical[1:]):
                require(a['upper']['clockJD'] < b['lower']['clockJD'], 'Physical source roots unresolved or unordered')
            self.qualified['physicalRootIds'] = physical_ids
            first_exact = self.assemble_band('b1:T-B', 'b1:T+B', 1)
            require(thresholds[0]['band']['allowedProductMilliseconds'][1] < first_exact['allowedProductMilliseconds'][0] < first_exact['allowedProductMilliseconds'][1] < thresholds[1]['band']['allowedProductMilliseconds'][0], 'First exact band overlaps threshold bands')
            possible_exact = self.assemble_band('b2:T+B', 'b3:T+B')
            possible_minimum = self.assemble_band('b2:T+2B', 'b3:T+2B')
            exact_allowed = possible_exact['allowedProductMilliseconds']
            minimum_allowed = possible_minimum['allowedProductMilliseconds']
            require(thresholds[2]['band']['allowedProductMilliseconds'][1] < minimum_allowed[0] < exact_allowed[0] < exact_allowed[1] < minimum_allowed[1] < thresholds[3]['band']['allowedProductMilliseconds'][0], 'D uncertainty envelopes not nested inside component')
            for identity in ['b2:T', 'b3:T']:
                root = self.qualified['roots'][identity]
                require(exact_allowed[0] < root['lower']['productTransportMilliseconds'] <= root['upper']['productTransportMilliseconds'] < exact_allowed[1], 'Exact source root escaped uncertainty envelope')
            turns_inside = [x for x in track['stations'] if minimum_allowed[0] < x['geometricBest']['productTransportMilliseconds'] < minimum_allowed[1]]
            require(len(turns_inside) == 1 and turns_inside[0]['id'].endswith(':turn:2'), 'Uncertainty envelope includes another extremum')
            turn = turns_inside[0]
            require(turn['kind'] == 'minimum' and turn['longitudeDegrees'] > T - B, 'Connected possible-exact set has unreviewed topology')
            self.qualified['envelopes'] = {'firstConditionedExactBand': first_exact, 'secondPossibleExactRegion': {**possible_exact, 'sourceOrbLevelDegrees': B, 'conditionalMeaning': 'Every product exact root lies in this connected region if the original pointwise B allowance holds; no count equality asserted.'}, 'secondPossibleMinimumRegion': {**possible_minimum, 'sourceOrbLevelDegrees': 2 * B, 'conditionalMeaning': 'Any product component global minimizer lies in this set if the original uniform B allowance holds. Source minimum orb is zero. No single peak instant asserted.'}}
            self.stage = 'D-qualified-five-membership-witnesses'
            threshold_roots = [self.qualified['roots'][x['rootId']] for x in thresholds]
            edge_jds = [track['start']] + [x['estimate']['clockJD'] for x in threshold_roots] + [track['end']]
            for i, (lo, hi) in enumerate(zip(edge_jds, edge_jds[1:])):
                require(lo < hi, 'Zero-length membership cell')
                ev = self.evaluate(track, (lo + hi) / 2)
                orb = abs(base.delta(ev['values'][0], T))
                require(abs(orb - 3) > B + self.p['numerics']['geometricResolutionDegrees'], 'Membership witness lacks comparison margin')
                self.qualified['membershipCells'].append({'index': i, 'clockBoundsJD': [lo, hi], 'evaluationId': ev['evaluationId'], 'instant': ev['instant'], 'orbDegrees': orb, 'inside': orb < 3})
            require([x['inside'] for x in self.qualified['membershipCells']] == [False, True, False, True, False], 'Unexpected D membership topology')
            for i, (entry, exit_, exact_ids) in enumerate([(thresholds[0], thresholds[1], ['b1:T']), (thresholds[2], thresholds[3], ['b2:T', 'b3:T'])]):
                start = self.qualified['roots'][entry['rootId']]['estimate']
                end = self.qualified['roots'][exit_['rootId']]['estimate']
                self.qualified['components'].append({'id': 'D-component-' + str(i + 1), 'start': start, 'end': end, 'entry': entry, 'exit': exit_, 'startClipped': False, 'endClipped': False, 'sourceExactRootIds': exact_ids, 'membershipStatus': 'conditioned-source-complete-awaiting-review', 'exactTopologyStatus': 'conditioned-source-reference' if i == 0 else 'unresolved-cross-model-count', 'sourceGlobalMinimum': {'kind': 'exact', 'orbDegrees': 0, 'rootIds': exact_ids}, 'productGlobalMinimumClaim': 'subject-to-bounded-comparison' if i == 0 else 'uncertain-range-only-no-single-peak'})
            self.stage = 'D-qualified-crop-records'
            crops = []
            for name, lo, hi in [('first-half', track['start'], track['anchor']), ('second-half', track['anchor'], track['end'])]:
                boundaries = []
                for role, jd in [('start', lo), ('end', hi)]:
                    ev = self.evaluate(track, jd)
                    orb = abs(base.delta(ev['values'][0], T))
                    ms = ev['instant']['productTransportMilliseconds']
                    intersecting_thresholds = [x['name'] for x in thresholds if x['band']['allowedProductMilliseconds'][0] <= ms <= x['band']['allowedProductMilliseconds'][1]]
                    exact_ambiguous = orb <= B or exact_allowed[0] <= ms <= exact_allowed[1] or first_exact['allowedProductMilliseconds'][0] <= ms <= first_exact['allowedProductMilliseconds'][1]
                    boundaries.append({'edge': role, 'evaluationId': ev['evaluationId'], 'instant': ev['instant'], 'orbDegrees': orb, 'membershipAmbiguousWithinBudget': abs(orb - 3) <= B or bool(intersecting_thresholds), 'exactCountAmbiguousWithinBudget': exact_ambiguous, 'intersectingThresholds': intersecting_thresholds})
                portions = []
                for component in self.qualified['components']:
                    a, b = max(lo, component['start']['clockJD']), min(hi, component['end']['clockJD'])
                    if a >= b:
                        continue
                    exact_ids = [x for x in component['sourceExactRootIds'] if lo <= self.qualified['roots'][x]['estimate']['clockJD'] <= hi]
                    portions.append({'fullComponentId': component['id'], 'start': self.stamp(a, 'TT', 69.184), 'end': self.stamp(b, 'TT', 69.184), 'startClipped': a > component['start']['clockJD'], 'endClipped': b < component['end']['clockJD'], 'sourceExactRootIdsByEstimate': exact_ids, 'exactTopologyStatus': component['exactTopologyStatus'], 'fullQueryEnvelopeProvenance': 'secondPossibleMinimumRegion' if component['id'] == 'D-component-2' else 'firstConditionedExactBand', 'noCroppedPeakClaim': True})
                crops.append({'name': name, 'closedClockBoundsJD': [lo, hi], 'boundaries': boundaries, 'portions': portions, 'recombination': 'Deduplicate full source physical root identities, never rounded timestamps. Ambiguous crop exact counts are excluded from cross-model equality.'})
            require(all(not b['membershipAmbiguousWithinBudget'] for crop in crops for b in crop['boundaries']), 'D crop membership unexpectedly ambiguous')
            require(crops[0]['boundaries'][1]['exactCountAmbiguousWithinBudget'] and crops[1]['boundaries'][0]['exactCountAmbiguousWithinBudget'], 'Anchor exact ambiguity lost')
            self.qualified['crops'] = crops
            self.limit()
            self.stage = 'D-qualified-source-complete-original-pack-still-failed'

    return DContinuation()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--policy', required=True)
    parser.add_argument('--runtime-manifest', required=True)
    parser.add_argument('--v2-directory', required=True)
    parser.add_argument('--v3-directory', required=True)
    parser.add_argument('--output-directory', required=True)
    parser.add_argument('--approved-policy-sha256', required=True)
    parser.add_argument('--approved-wrapper-sha256', required=True)
    parser.add_argument('--approved-runtime-manifest-sha256', required=True)
    args = parser.parse_args()
    require(digest(args.policy) == args.approved_policy_sha256, 'Exact reviewed policy hash required')
    require(digest(__file__) == args.approved_wrapper_sha256, 'Exact reviewed wrapper hash required')
    require(digest(args.runtime_manifest) == args.approved_runtime_manifest_sha256, 'Exact reviewed runtime manifest hash required')
    proposal = json.loads(Path(args.policy).read_text())
    manifest = json.loads(Path(args.runtime_manifest).read_text())
    verified, v2, v3, original, case, track, cache, base = verify_inputs(proposal, args)
    directory = Path(args.output_directory).resolve()
    require(directory.is_dir(), 'Create the reviewed empty output directory first')
    paths = {k: directory / proposal['outputs'][k] for k in ['receipt', 'partial', 'journal', 'checksums']}
    require(all(not p.exists() for p in paths.values()), 'Refusing to overwrite prior receipt or journal')
    raw_file = paths['journal'].open('xb')
    journal = gzip.GzipFile(fileobj=raw_file, mode='wb', mtime=0)
    acquisition = make_acquisition(base, proposal, original, case, track, cache, manifest, journal)
    failure = None
    try:
        acquisition.acquire_d()
    except Exception as error:
        failure = {'stage': acquisition.stage, 'type': type(error).__name__, 'message': str(error), 'lastRecord': acquisition.last_record}
        acquisition.log({'type': 'failure', **failure})
    finally:
        journal.close()
        raw_file.close()
    result = {'schemaVersion': 6, 'runtimeRebuilt': True, 'compilerEnvironmentRepairDisclosed': True, 'runtimeIdentityChanged': manifest['extensionSHA256'] != proposal['runtimeIdentity']['historicalExtensionSHA256'], 'originalRuntimeByteIdentityClaimed': False, 'historicalConcordance': acquisition.concordance, 'replayPositionCount': acquisition.concordance['completedPositions'], 'postReplayPositionCount': None if acquisition.replay_end_id is None else acquisition.next_id - acquisition.replay_end_id, 'status': 'partial-source-failure' if failure else 'qualified-source-complete-awaiting-root-review', 'originalPackStatus': 'failed-incomplete', 'originalDExactTopologyGatePassed': False, 'trustedOriginalPack': False, 'numericalProductImplementationAuthorized': False, 'productEvaluations': 0, 'networkAcquisitions': 0, 'policy': proposal, 'approvedPolicySHA256': args.approved_policy_sha256, 'approvedWrapperSHA256': args.approved_wrapper_sha256, 'approvedRuntimeManifestSHA256': args.approved_runtime_manifest_sha256, 'upstreamFiles': [{'role': role, 'path': str(path), 'sha256': digest(path)} for role, path in verified.items()], 'retainedUranusTrajectory': track, 'originalFailedWitness': proposal['originalFailedWitness'], 'runtime': acquisition.runtime_receipt, 'clockInputs': acquisition.clock_records, 'loadedFiles': list(acquisition.loaded.values()), 'qualifiedD': acquisition.qualified, 'refinementsIncludingPending': list(acquisition.refinements.values()), 'upstreamPositionCount': proposal['cumulative']['upstreamPositions'], 'newPositionCount': acquisition.next_id - proposal['cumulative']['upstreamPositions'], 'cumulativePositionCount': acquisition.next_id, 'newElapsedSeconds': time.monotonic() - acquisition.new_started, 'cumulativeElapsedSeconds': time.monotonic() - acquisition.started, 'journal': {'path': str(paths['journal']), 'sha256': digest(paths['journal'])}, 'failure': failure}
    target = paths['partial'] if failure else paths['receipt']
    write_new(target, base.clean(result))
    with paths['checksums'].open('x') as handle:
        for path in [Path(args.policy), Path(__file__), Path(args.runtime_manifest), paths['journal'], target]:
            handle.write(digest(path) + '  ' + path.name + '\n')
    print(json.dumps({'status': result['status'], 'originalPackStatus': result['originalPackStatus'], 'receipt': str(target), 'receiptSHA256': digest(target), 'journalSHA256': digest(paths['journal']), 'newPositions': result['newPositionCount'], 'failure': failure}, allow_nan=False))
    return 1 if failure else 0


if __name__ == '__main__':
    sys.exit(main())
