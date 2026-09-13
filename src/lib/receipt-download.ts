/** Call synchronously from an intentional click. No calculation, storage or network. */
export function downloadCalculationReceipt(envelopeJson: string): void {
  const url = URL.createObjectURL(new Blob([envelopeJson], { type: 'application/json;charset=utf-8' }));
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement('a');
    link.href = url;
    link.download = 'zodiacs-calculation-receipt.json';
    link.hidden = true;
    document.body.append(link);
    link.click();
  } finally {
    try {
      link?.remove();
    } finally {
      // Let the browser consume the click before releasing the temporary URL.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}
