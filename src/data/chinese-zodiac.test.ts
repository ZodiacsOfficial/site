import { describe, expect, it } from 'vitest';
import {
  CHINESE_ZODIAC_ANIMALS,
  chineseAnimalForCycleYear,
  chineseYearsForAnimal,
} from './chinese-zodiac';

describe('Chinese zodiac cycle data', () => {
  it('contains each branch and animal exactly once in canonical order', () => {
    expect(CHINESE_ZODIAC_ANIMALS).toHaveLength(12);
    expect(new Set(CHINESE_ZODIAC_ANIMALS.map((animal) => animal.slug)).size).toBe(12);
    expect(CHINESE_ZODIAC_ANIMALS.map((animal) => animal.name)).toEqual([
      'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
      'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
    ]);
  });

  it('anchors the sequence to known modern cycle years', () => {
    expect(chineseAnimalForCycleYear(2020).name).toBe('Rat');
    expect(chineseAnimalForCycleYear(2026).name).toBe('Horse');
    expect(chineseAnimalForCycleYear(2031).name).toBe('Pig');
  });

  it('produces twelve-year-spaced year tables', () => {
    const years = chineseYearsForAnimal('dragon');
    expect(years).toContain(2024);
    expect(years.every((year, index) => index === 0 || year - years[index - 1] === 12)).toBe(true);
  });
});
