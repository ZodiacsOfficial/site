export const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
export function placement(lon: number): string {
  const normalized = ((lon % 360) + 360) % 360;
  return `${(normalized % 30).toFixed(2)}° ${signs[Math.floor(normalized / 30)]}`;
}
