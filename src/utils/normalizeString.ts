/**
 * Normaliza un string eliminando acentos, convirtiendo a minúsculas y eliminando espacios extras
 * Útil para comparaciones de nombres de especialidades y departamentos
 */
export const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Elimina espacios múltiples
};
