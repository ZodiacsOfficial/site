import { calculate, importNatalFile } from './calculate.mjs';
import { redactNatalEnvelope, serializeNatalEnvelope } from '@zodiacs/engine/receipt';

const byId = (id) => document.getElementById(id);
const fields = ['birthInstant', 'birthDate', 'timeKnown', 'latitude', 'longitude', 'houseSystem', 'transitInstant'];
const mode = document.body.dataset.example;
let activeEnvelope = null;
let operation = 0;
let downloadUrl = null;
let downloadTimer = null;
const resetResult = () => {
  activeEnvelope = null;
  byId('error').textContent = '';
  byId('receipt').textContent = '';
  byId('result').textContent = '';
  if (mode === 'natal') {
    byId('diagnostic').textContent = '';
    byId('exportEnvelope').disabled = true;
    byId('showDiagnostic').disabled = true;
  }
};
const renderEnvelope = (envelope) => {
  activeEnvelope = envelope;
  byId('receipt').textContent = JSON.stringify(envelope.receipt, null, 2);
  byId('result').textContent = JSON.stringify(envelope.result, null, 2);
  byId('exportEnvelope').disabled = false;
  byId('showDiagnostic').disabled = false;
};
const revokeDownload = () => {
  if (downloadTimer !== null) clearTimeout(downloadTimer);
  if (downloadUrl !== null) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
  downloadTimer = null;
};
const updateTime = () => {
  const unknown = byId('timeKnown').value === 'unknown';
  byId('birthInstant').disabled = unknown;
  byId('birthDate').disabled = !unknown;
};
byId('timeKnown').addEventListener('change', updateTime);
updateTime();
byId('calculate').disabled = false;
byId('calculate').addEventListener('click', () => {
  operation += 1; // A pending file read cannot replace this newer calculation.
  resetResult();
  if (mode === 'natal') byId('importFile').value = '';
  try {
    const input = Object.fromEntries(fields.map((field) => [field, byId(field)?.value]));
    const { receipt, envelope, ...result } = calculate(input, mode);
    if (mode === 'natal') renderEnvelope(envelope);
    else {
      byId('receipt').textContent = JSON.stringify(receipt, null, 2);
      byId('result').textContent = JSON.stringify(result, null, 2);
    }
    byId('status').textContent = 'Calculated locally. Change an input and calculate again, including after disconnecting the network.';
  } catch (error) {
    byId('status').textContent = 'No result. Correct the input and try again.';
    byId('error').textContent = error instanceof Error ? error.message : 'Calculation failed.';
  }
});

if (mode === 'natal') {
  byId('importEnvelope').disabled = false;
  byId('importFile').addEventListener('change', () => {
    operation += 1; // A new selection invalidates a previous asynchronous read.
    resetResult();
    byId('status').textContent = 'File selection changed. Select Import locally to validate and display it; no file has been uploaded.';
  });
  byId('importFile').addEventListener('cancel', () => {
    operation += 1;
    resetResult();
    byId('status').textContent = 'File selection cancelled. No result is active.';
  });
  byId('importEnvelope').addEventListener('click', async () => {
    const current = ++operation;
    const files = byId('importFile').files;
    const file = files?.length === 1 ? files[0] : null;
    byId('importFile').value = '';
    resetResult();
    byId('status').textContent = 'Reading a local file. No recalculation or upload is performed.';
    const parsed = await importNatalFile(file);
    if (current !== operation) return;
    if (!parsed.ok) {
      byId('status').textContent = 'No imported result. Choose a supported draft file and try again.';
      byId('error').textContent = `Import rejected (${parsed.code}). No previous chart is active.`;
      return;
    }
    renderEnvelope(parsed.envelope);
    byId('status').textContent = 'Imported stored result — unverified claims. No recalculation or provenance authentication was performed. Birth form values are unchanged; Calculate locally creates a new result from that form.';
  });
  byId('exportEnvelope').addEventListener('click', () => {
    if (!activeEnvelope) return;
    byId('error').textContent = '';
    try {
      const json = serializeNatalEnvelope(activeEnvelope);
      revokeDownload();
      downloadUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'zodiacs-natal-envelope-draft-v1.json';
      document.body.append(link);
      link.click();
      link.remove();
      downloadTimer = setTimeout(revokeDownload, 1000);
    } catch {
      revokeDownload();
      byId('error').textContent = 'Export failed. No file was prepared.';
    }
  });
  byId('showDiagnostic').addEventListener('click', () => {
    if (!activeEnvelope) return;
    byId('error').textContent = '';
    byId('diagnostic').textContent = '';
    try {
      byId('diagnostic').textContent = JSON.stringify(redactNatalEnvelope(activeEnvelope), null, 2);
    } catch {
      byId('error').textContent = 'Diagnostic unavailable for this result.';
    }
  });
  window.addEventListener('pagehide', revokeDownload);
}
