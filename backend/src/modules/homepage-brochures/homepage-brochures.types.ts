export const BROCHURE_IMAGE_FITS = [
  'cover',
  'contain',
] as const;

export type BrochureImageFit =
  (typeof BROCHURE_IMAGE_FITS)[number];

export const BROCHURE_LINK_TARGETS = [
  '_self',
  '_blank',
] as const;

export type BrochureLinkTarget =
  (typeof BROCHURE_LINK_TARGETS)[number];

export type NormalizedBrochurePayload = {
  imageUrl: string;
  mobileImageUrl: string | null;

  altTextFr: string;
  altTextEn: string | null;

  linkUrl: string | null;
  linkTarget: BrochureLinkTarget;

  sortOrder: number;
  isActive: boolean;

  desktopFit: BrochureImageFit;
  desktopPositionX: number;
  desktopPositionY: number;
  desktopZoom: number;

  mobileFit: BrochureImageFit;
  mobilePositionX: number;
  mobilePositionY: number;
  mobileZoom: number;
};

export type BrochureReorderItem = {
  id: number;
  sortOrder: number;
};