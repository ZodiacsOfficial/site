import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * A birthplace longitude makes an early date need the local mean time table
 * and the zone's pinned history, and resolving without them throws. So every
 * production call that passes a longitude must follow an awaited
 * prepareLocalTime of the same date and zone in the same function, or sit in
 * a module that re-exports the preparation to the islands that await it; and
 * the longitude must be a place's `.lon`. Calls without a longitude keep the
 * host's clock, and each is listed with a reason.
 */
const root = resolve(process.cwd(), 'src');

const WITHOUT_LONGITUDE: Record<string, string> = {
  'lib/chart-date-certainty.ts': 'local midnights of a date on the zone clock; used only by tests',
  'lib/learning-source.ts': 'checks that a stored birth resolves at all; the chart itself goes through ChartCalculator',
  'islands/WalletChart.tsx': 'Registry scope, frozen for Phase 1; planets only, no angles',
};

/** Compute modules that re-export the preparation, and the islands that await it. */
const PREPARED_BY: Record<string, string[]> = {
  'islands/lunar-return/compute.ts': ['islands/LunarReturnCalculator.tsx'],
  'islands/solar-return/compute.ts': ['islands/SolarReturnCalculator.tsx'],
};

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const parse = (path: string, text: string) =>
  ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

function calls(node: ts.Node, name: string, found: ts.CallExpression[] = []): ts.CallExpression[] {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) found.push(node);
  ts.forEachChild(node, (child) => { calls(child, name, found); });
  return found;
}

function enclosingFunction(node: ts.Node): ts.Node {
  for (let at = node.parent; at; at = at.parent) if (ts.isFunctionLike(at)) return at;
  return node.getSourceFile();
}

/** Whether a prepareLocalTime call is awaited: directly, in an awaited Promise.all, or through a variable awaited later. */
function awaitedBefore(prepare: ts.CallExpression, before: number): boolean {
  let at: ts.Node = prepare;
  while (ts.isParenthesizedExpression(at.parent) || ts.isConditionalExpression(at.parent)
    || ts.isArrayLiteralExpression(at.parent)) at = at.parent;
  if (ts.isAwaitExpression(at.parent)) return at.parent.getStart() < before;
  if (ts.isCallExpression(at.parent) && at.parent.expression.getText() === 'Promise.all'
    && ts.isAwaitExpression(at.parent.parent)) return at.parent.parent.getStart() < before;
  if (ts.isVariableDeclaration(at.parent) && ts.isIdentifier(at.parent.name)) {
    const name = at.parent.name.text;
    let awaited = false;
    const scan = (node: ts.Node) => {
      if (ts.isAwaitExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name
        && node.getStart() < before) awaited = true;
      ts.forEachChild(node, scan);
    };
    scan(enclosingFunction(prepare));
    return awaited;
  }
  return false;
}

const longitudeOf = (call: ts.CallExpression): ts.Expression | null => {
  const options = call.arguments[3];
  if (!options || !ts.isObjectLiteralExpression(options)) return null;
  const property = options.properties.find((p) => p.name && ts.isIdentifier(p.name) && p.name.text === 'longitude');
  if (!property) return null;
  return ts.isPropertyAssignment(property) ? property.initializer : property.name as ts.Expression;
};

const sources = walk(root)
  .filter((path) => /\.(?:ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path))
  .map((path) => {
    const text = readFileSync(path, 'utf8');
    return { path: relative(root, path).split(sep).join('/'), file: parse(path, text) };
  })
  .filter(({ path, file }) => path !== 'lib/time/localToUtc.ts' && calls(file, 'resolveLocalToUtc').length > 0);

describe('callers of resolveLocalToUtc', () => {
  it('finds the production callers', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it('await prepareLocalTime of the same date before each call that passes a longitude', () => {
    const problems: string[] = [];
    for (const { path, file } of sources) {
      for (const call of calls(file, 'resolveLocalToUtc')) {
        const longitude = longitudeOf(call);
        if (!longitude) continue;
        const where = `${path}:${file.getLineAndCharacterOfPosition(call.getStart()).line + 1}`;
        if (!/\.lon$/.test(longitude.getText())) problems.push(`${where} passes ${longitude.getText()} as the longitude`);
        if (PREPARED_BY[path]) continue;
        const date = call.arguments[0].getText();
        const zone = call.arguments[2].getText();
        const scope = enclosingFunction(call);
        const prepared = calls(scope, 'prepareLocalTime')
          .some((prepare) => prepare.arguments[0]?.getText() === date && prepare.arguments[1]?.getText() === zone
            && awaitedBefore(prepare, call.getStart()));
        // A named helper is prepared for when every call of it follows an
        // awaited preparation in its caller (TransitTracker's natal helpers).
        const helper = ts.isFunctionDeclaration(scope) && scope.name ? scope.name.text : null;
        const uses = helper ? calls(file, helper) : [];
        const preparedByCallers = uses.length > 0 && uses.every((use) => calls(enclosingFunction(use), 'prepareLocalTime')
          .some((prepare) => prepare.arguments.length === 2 && awaitedBefore(prepare, use.getStart())));
        if (!prepared && !preparedByCallers) problems.push(`${where} has no awaited prepareLocalTime(${date}, ${zone}) before it`);
      }
    }
    for (const [module, islands] of Object.entries(PREPARED_BY)) {
      if (!/export \{ prepareLocalTime \}/.test(readFileSync(resolve(root, module), 'utf8'))) problems.push(`${module} does not re-export prepareLocalTime`);
      for (const island of islands) {
        const file = parse(island, readFileSync(resolve(root, island), 'utf8'));
        if (!calls(file, 'prepareLocalTime').some((prepare) => prepare.arguments.length === 2
          && awaitedBefore(prepare, Number.POSITIVE_INFINITY))) {
          problems.push(`${island} does not await prepareLocalTime`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('pass a longitude everywhere except the listed places', () => {
    const without = sources
      .filter(({ file }) => calls(file, 'resolveLocalToUtc').some((call) => !longitudeOf(call)))
      .map(({ path }) => path)
      .sort();
    expect(without).toEqual(Object.keys(WITHOUT_LONGITUDE).sort());
  });
});
