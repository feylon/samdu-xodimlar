export const hexToRgbTriple = (hex: string): string => {
  const normalized = hex.replace('#', '').trim()
  const full = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '29 78 216'
  const value = Number.parseInt(full, 16)
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`
}

export const applyBrandColor = (hex: string) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--brand', hex)
  root.style.setProperty('--brand-rgb', hexToRgbTriple(hex))
}

export const readBrandColor = (): string => {
  if (typeof document === 'undefined') return '#1d4ed8'
  const value = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
  return value || '#1d4ed8'
}

export const withAlpha = (hex: string, alpha: number): string => `rgb(${hexToRgbTriple(hex)} / ${alpha})`

export const CHART_PALETTE = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b']
