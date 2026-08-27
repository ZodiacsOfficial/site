const ACQUISITION_DISCLOSURE_WING =
  /^\/(?:astrofolio|terminal|registry|sdk|thesis|archive|disclosure)(?:\/|$)/u;

/**
 * Market, wallet, and acquisition disclosure belongs only to the Registry and
 * Astrofolio wing. Callers pass a locale-stripped pathname.
 */
export function footerAcquisitionDisclosureVisible(consumerPath) {
  return ACQUISITION_DISCLOSURE_WING.test(consumerPath);
}
