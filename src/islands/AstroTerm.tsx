import { useEffect, useRef } from 'preact/hooks';
import { resolveContextTerm } from '../data/context-help';
import { bindContextHelp } from '../lib/context-help-client';
import '../styles/context-help.css';

export interface AstroTermProps {
  /** Priority glossary slug or supported alias such as “Rx”. */
  term: string;
  label?: string;
  /** Stable, non-personal analytics surface such as “chart-inspector”. */
  surface?: string;
  /** Optional chart-specific sentence rendered locally; analytics receives no text. */
  whyItMatters?: string;
  className?: string;
}

function titleFromSlug(slug: string): string {
  const title = slug.replace(/-/g, ' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export default function AstroTerm({
  term,
  label,
  surface = 'inline',
  whyItMatters,
  className = '',
}: AstroTermProps) {
  const root = useRef<HTMLSpanElement>(null);
  const entry = resolveContextTerm(term);

  useEffect(() => {
    if (!root.current || !entry) return;
    return bindContextHelp(root.current);
  }, [entry]);

  if (!entry) {
    if (import.meta.env.DEV) console.warn(`AstroTerm could not resolve glossary term “${term}”.`);
    return <span className={className || undefined}>{label ?? term}</span>;
  }

  const title = titleFromSlug(entry.slug);
  const displayLabel = label ?? (term === entry.slug ? title : term);
  const rootClass = ['astro-term', className].filter(Boolean).join(' ');

  return (
    <span
      ref={root}
      className={rootClass}
      data-context-help-term={entry.slug}
      data-context-help-surface={surface}
    >
      <button
        className="astro-term__trigger"
        type="button"
        aria-expanded="false"
        data-context-help-trigger
      >
        {displayLabel}
      </button>
      <span
        className="astro-term__panel"
        role="note"
        aria-label={`${title} explained`}
        data-context-help-panel
        hidden
      >
        <span className="astro-term__eyebrow">In plain English</span>
        <strong className="astro-term__title">{title}</strong>
        <span className="astro-term__definition">{entry.plainDefinition}</span>
        {whyItMatters && <span className="astro-term__why">{whyItMatters}</span>}
        <a className="astro-term__link" href={`/learn/glossary/#${entry.slug}`}>
          Learn more about {title} →
        </a>
      </span>
    </span>
  );
}
