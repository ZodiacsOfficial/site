import type { ProfileChartRunInput } from './profile/profile-chart-handoff';

/** Private in-memory comparison only; excludes names, labels and update timestamps. */
export function learningInputIdentity(input: ProfileChartRunInput): string {
  return JSON.stringify([input.date, input.timeKnown, input.timeKnown ? input.time : '12:00',
    input.city.lat, input.city.lon, input.city.tz, input.houseSystem]);
}
