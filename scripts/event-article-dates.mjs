/** Event dates must agree with their publication receipt, including absence. */
export function eventArticleDateFailures(article, published) {
  if (!published) return ['event Article has no publication receipt'];
  const failures = [];
  const day = published.lastModified;
  const instant = `${day}T00:00:00.000Z`;
  const parsed = Date.parse(instant);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed)
    || new Date(parsed).toISOString() !== instant) {
    failures.push('event receipt has an invalid lastModified');
  }
  if (article.dateModified !== instant) failures.push('event Article.dateModified differs from its publication receipt');
  if (published.publishedAt === undefined) {
    if (Object.hasOwn(article, 'datePublished')) failures.push('event Article invents an undocumented datePublished');
  } else if (article.datePublished !== published.publishedAt) {
    failures.push('event Article.datePublished differs from its publication receipt');
  }
  return failures;
}
