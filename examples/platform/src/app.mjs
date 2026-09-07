import { calculate } from './calculate.mjs';

const byId = (id) => document.getElementById(id);
const fields = ['birthInstant', 'birthDate', 'timeKnown', 'latitude', 'longitude', 'houseSystem', 'transitInstant'];
const mode = document.body.dataset.example;
const updateTime = () => {
  const unknown = byId('timeKnown').value === 'unknown';
  byId('birthInstant').disabled = unknown;
  byId('birthDate').disabled = !unknown;
};
byId('timeKnown').addEventListener('change', updateTime);
updateTime();
byId('calculate').disabled = false;
byId('calculate').addEventListener('click', () => {
  byId('error').textContent = '';
  byId('receipt').textContent = '';
  byId('result').textContent = '';
  try {
    const input = Object.fromEntries(fields.map((field) => [field, byId(field)?.value]));
    const { receipt, ...result } = calculate(input, mode);
    byId('receipt').textContent = JSON.stringify(receipt, null, 2);
    byId('result').textContent = JSON.stringify(result, null, 2);
    byId('status').textContent = 'Calculated locally. Change an input and calculate again, including after disconnecting the network.';
  } catch (error) {
    byId('status').textContent = 'No result. Correct the input and try again.';
    byId('error').textContent = error instanceof Error ? error.message : 'Calculation failed.';
  }
});
