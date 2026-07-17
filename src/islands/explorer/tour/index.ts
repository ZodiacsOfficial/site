/**
 * The lazy tour module boundary — ChartCalculator loads this via dynamic
 * import() on "Read this chart, in order", so nothing here (controller,
 * card, copy, chapter logic) counts against any page's initial JS budget.
 */
export { default as ChartTour } from './ChartTour';
export type { ChartTourProps, TourVariant } from './ChartTour';
