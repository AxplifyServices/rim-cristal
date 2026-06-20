export const PRODUCT_RUBRIQUES = [
  'Mobilier',
  'Luminaires',
  'Décoration',
  'Art mural',
  'Fleurs & Arrangements',
  'Arts de la table',
] as const;

export type ProductRubrique =
  (typeof PRODUCT_RUBRIQUES)[number];

export function isProductRubrique(
  value: unknown,
): value is ProductRubrique {
  return PRODUCT_RUBRIQUES.includes(
    value as ProductRubrique,
  );
}