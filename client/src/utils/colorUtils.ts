/**
 * colorUtils.ts
 * Curated color palettes and helper utilities
 */

export const PRESET_COLORS = [
  '#ffffff', // Pure White
  '#f87171', // Red
  '#fb923c', // Orange
  '#facc15', // Yellow
  '#4ade80', // Green
  '#38bdf8', // Sky Blue
  '#818cf8', // Indigo
  '#c084fc', // Purple
  '#f472b6', // Pink
  '#94a3b8', // Slate Grey
  '#000000', // Black
];

export const HIGHLIGHTER_COLORS = [
  '#fef08a', // Yellow
  '#86efac', // Green
  '#7dd3fc', // Cyan
  '#f9a8d4', // Pink
  '#c4b5fd', // Violet
  '#fdba74', // Orange
];

export const BRUSH_SIZES = [2, 4, 8, 14, 24, 36];
export const FONT_SIZES = [14, 18, 24, 32, 48, 64];

export function getRandomColor(): string {
  const colors = [
    '#3B82F6',
    '#10B981',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#06B6D4',
    '#F97316',
    '#14B8A6',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
