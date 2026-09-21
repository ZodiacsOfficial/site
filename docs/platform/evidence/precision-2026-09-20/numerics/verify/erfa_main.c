#include <stdio.h>
#include "erfa.h"
#include "erfam.h"
int main(void){
  double dp,de,dpa,dea;
  for (int i=0;i<=600;i++){
    double t = -1.5 + 3.0*i/600.0;          /* Julian centuries from J2000 */
    double jd = 2451545.0 + t*36525.0;
    eraNut00b(jd, 0.0, &dp, &de);
    eraNut00a(jd, 0.0, &dpa, &dea);
    printf("%.10f %.17g %.17g %.17g %.17g\n", t, dp/ERFA_DAS2R, de/ERFA_DAS2R, dpa/ERFA_DAS2R, dea/ERFA_DAS2R);
  }
  return 0;
}
