export const SPEAKER_COLORS = [
  '#ef4444', // Red 500
  '#3b82f6', // Blue 500
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
  '#84cc16', // Lime 500
  '#6366f1', // Indigo 500
  '#f97316', // Orange 500
  '#14b8a6', // Teal 500
  '#d946ef', // Fuchsia 500
  '#eab308', // Yellow 500
  '#f43f5e', // Rose 500
  '#0ea5e9', // Sky 500
  '#22c55e', // Green 500
  '#a855f7', // Purple 500
  '#fca5a5', // Red 300
  '#93c5fd', // Blue 300
  '#6ee7b7', // Emerald 300
  '#fcd34d', // Amber 300
  '#c4b5fd', // Violet 300
  '#f9a8d4', // Pink 300
  '#67e8f9', // Cyan 300
  '#bef264', // Lime 300
  '#a5b4fc', // Indigo 300
  '#fdba74', // Orange 300
  '#5eead4', // Teal 300
  '#f0abfc', // Fuchsia 300
  '#fde047', // Yellow 300
  '#fda4af', // Rose 300
  '#7dd3fc', // Sky 300
  '#86efac', // Green 300
  '#d8b4fe', // Purple 300
  '#7f1d1d', // Red 900
  '#1e3a8a', // Blue 900
  '#064e3b', // Emerald 900
  '#78350f', // Amber 900
  '#4c1d95', // Violet 900
  '#831843', // Pink 900
  '#164e63', // Cyan 900
  '#365314', // Lime 900
  '#312e81', // Indigo 900
  '#7c2d12', // Orange 900
  '#134e4a', // Teal 900
  '#701a75', // Fuchsia 900
  '#713f12', // Yellow 900
  '#881337', // Rose 900
  '#0c4a6e', // Sky 900
  '#14532d', // Green 900
  '#581c87', // Purple 900
  '#94a3b8', // Slate 400
  '#a1a1aa', // Zinc 400
  '#9ca3af', // Gray 400
];

/**
 * Returns a color for a given index, cycling through the palette.
 * @param {number} index - The speaker index
 * @returns {string} Hex color code
 */
export const getSpeakerColor = (index) => {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
};

/**
 * Returns a color based on a string hash (consistent for same label).
 * @param {string} label - The text label to hash
 * @returns {string} Hex color code
 */
export const getSpeakerColorByLabel = (label) => {
  if (!label) return SPEAKER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[index];
};
