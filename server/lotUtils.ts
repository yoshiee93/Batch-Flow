export function generateLotNumber(prefix: string = 'LOT'): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const random = Math.random().toString(36).toUpperCase().slice(2, 6).replace(/[^A-Z0-9]/g, 'X');
  return `${prefix}-${dateStr}-${random}`;
}

export function generateBarcodeValue(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).toUpperCase().slice(2, 6).replace(/[^A-Z0-9]/g, 'X');
  return `BC${timestamp}${random}`;
}
