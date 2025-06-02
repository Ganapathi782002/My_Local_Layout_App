/**
 * Generates a reasonably unique ID string.
 * It's based on Math.random() and timestamp.
 * @returns {string} A unique string ID.
 */
export const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};