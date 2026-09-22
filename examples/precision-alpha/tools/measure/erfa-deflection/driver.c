/* Drive the PINNED eraLd, compiled from liberfa's own source.
 * Only the two helpers ld.c calls are supplied, verbatim in behaviour. */
#include <stdio.h>
#include <stdlib.h>
#define ERFA_SRS 1.97412574336e-8
#define ERFA_GMAX(A,B) (((A) > (B)) ? (A) : (B))
static double eraPdp(double a[3], double b[3]) {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}
static void eraPxp(double a[3], double b[3], double axb[3]) {
  double xa=a[0], ya=a[1], za=a[2], xb=b[0], yb=b[1], zb=b[2];
  axb[0] = ya*zb - za*yb; axb[1] = za*xb - xa*zb; axb[2] = xa*yb - ya*xb;
}
#include "ld_body.h"
int main(int argc, char **argv) {
  /* bm px py pz qx qy qz ex ey ez em dlim */
  double bm = atof(argv[1]);
  double p[3] = {atof(argv[2]), atof(argv[3]), atof(argv[4])};
  double q[3] = {atof(argv[5]), atof(argv[6]), atof(argv[7])};
  double e[3] = {atof(argv[8]), atof(argv[9]), atof(argv[10])};
  double em = atof(argv[11]), dlim = atof(argv[12]);
  double p1[3];
  eraLd(bm, p, q, e, em, dlim, p1);
  printf("%.17g %.17g %.17g\n", p1[0], p1[1], p1[2]);
  return 0;
}
