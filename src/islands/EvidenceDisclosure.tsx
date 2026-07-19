import type { ComponentChildren } from 'preact';
import '../styles/evidence-disclosure.css';

interface EvidenceDisclosureProps {
  label: string;
  description?: string;
  variant?: 'quiet' | 'panel';
  className?: string;
  children: ComponentChildren;
}

export function EvidenceDisclosure({
  label,
  description,
  variant = 'quiet',
  className,
  children,
}: EvidenceDisclosureProps) {
  const classes = [
    'evidence-disclosure',
    `evidence-disclosure--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <details class={classes} data-evidence-disclosure data-evidence-variant={variant}>
      <summary>
        <span class="evidence-disclosure__summary">
          <strong>{label}</strong>
          {description && <small>{description}</small>}
        </span>
      </summary>
      <div class="evidence-disclosure__body">{children}</div>
    </details>
  );
}

export default EvidenceDisclosure;
