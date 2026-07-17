import type { ComponentChildren } from 'preact';

interface NextActionCardProps {
  cue: ComponentChildren;
  title: ComponentChildren;
  body?: ComponentChildren;
  meta?: ComponentChildren;
  primary: ComponentChildren;
  secondary?: ComponentChildren;
  headingLevel?: 2 | 3;
  className?: string;
}

/**
 * Shared presentation for the single action the site recommends next.
 * Callers own the action elements so links and buttons keep their native
 * semantics; this component owns only hierarchy and layout.
 */
export function NextActionCard({
  cue,
  title,
  body,
  meta,
  primary,
  secondary,
  headingLevel = 2,
  className = '',
}: NextActionCardProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <div class={`next-action shell tinted ${className}`.trim()}>
      <div class="next-action__core core tinted">
        <div class="next-action__copy">
          <p class="next-action__cue mono">{cue}</p>
          <Heading class="next-action__title">{title}</Heading>
          {body && <p class="next-action__body">{body}</p>}
          {meta && <div class="next-action__meta">{meta}</div>}
        </div>
        <div class="next-action__actions">
          <div class="next-action__primary">{primary}</div>
          {secondary && <div class="next-action__secondary">{secondary}</div>}
        </div>
      </div>
    </div>
  );
}
