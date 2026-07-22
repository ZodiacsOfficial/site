import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Russian chart-result seams', () => {
  it('localizes an unlabeled shared birthplace', async () => {
    const source = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');
    const runtime = await readFile(new URL('../lib/i18n/ru-runtime/server.ts', import.meta.url), 'utf8');
    expect(source).toContain("russianCopy?.chart.sharedBirthplace ?? 'Shared birthplace'");
    expect(runtime).toContain("sharedBirthplace: 'Общее место рождения'");
  });

  it('marks deferred action-dock destinations before navigation', async () => {
    const source = await readFile(new URL('./ChartCalculator.tsx', import.meta.url), 'utf8');
    const runtime = await readFile(new URL('../lib/i18n/ru-runtime/server.ts', import.meta.url), 'utf8');
    expect(source).toContain('russianCopy?.chart.wheelActions ?? WHEEL_ACTION_COPY');
    expect(runtime).toContain("another: 'Прочитать другую карту — пока по-английски'");
    expect(runtime).toContain("compareMine: 'Сравнить с моей — пока по-английски'");
    expect(runtime).toContain("compareAdd: 'Добавить мою карту для сравнения — пока по-английски'");
  });
});
