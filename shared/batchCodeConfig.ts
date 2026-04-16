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
  const yy = String(date.getFullYear()).slice(-2);
  const start = new Date(date.getFullYear(), 0, 0);
  const julianDay = String(Math.floor((date.getTime() - start.getTime()) / 86400000)).padStart(3, '0');
  const js = date.getDay();
  const weekday = String(js === 0 ? 7 : js);
  return `${fruitCode}${processCode}${yy}${julianDay}${weekday}`;
}
