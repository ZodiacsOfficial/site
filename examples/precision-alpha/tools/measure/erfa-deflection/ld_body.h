void eraLd(double bm, double p[3], double q[3], double e[3],
           double em, double dlim, double p1[3])

{
   int i;
   double qpe[3], qdqpe, w, eq[3], peq[3];


/* q . (q + e). */
   for (i = 0; i < 3; i++) {
      qpe[i] = q[i] + e[i];
   }
   qdqpe = eraPdp(q, qpe);

/* 2 x G x bm / ( em x c^2 x ( q . (q + e) ) ). */
   w = bm * ERFA_SRS / em / ERFA_GMAX(qdqpe,dlim);

/* p x (e x q). */
   eraPxp(e, q, eq);
   eraPxp(p, eq, peq);

/* Apply the deflection. */
   for (i = 0; i < 3; i++) {
      p1[i] = p[i] + w*peq[i];
   }

/* Finished. */

}
