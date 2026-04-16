export const FRUIT_CODE_MAP: Record<string, string> = {
  'SW': 'Strawberry Whole',
  'SH': 'Strawberry Halved / Diced',
  'BW': 'Blueberry Whole',
  'RC': 'Raspberry Crumble',
  'PP': 'Passionfruit Pulp',
};

export const PROCESS_CODE_MAP: Record<string, string> = {
  '3': 'Fresh / IQF',
  '4': 'Freeze Dried',
  '6': 'Frozen',
};

export function buildBatchCode(fruitCode: string, processCode: string, date: Date): string {
  if (!fruitCode || fruitCode.length < 1 || fruitCode.length > 5) {
    throw new Error(`Invalid fruitCode "${fruitCode}": must be 1–5 characters`);
  }
  if (!processCode || !/^\d$/.test(processCode)) {
    throw new Error(`Invalid processCode "${processCode}": must be a single digit (0–9)`);
  }
  const yy = String(date.getUTCFullYear()).slice(-2);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const julianDay = String(Math.floor((date.getTime() - yearStart) / 86400000)).padStart(3, '0');
  const js = date.getUTCDay();
  const weekday = String(js === 0 ? 7 : js);
  return `${fruitCode}${processCode}${yy}${julianDay}${weekday}`;
}
