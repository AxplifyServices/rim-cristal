export type MediaOwnerType =
  | 'PRODUCT'
  | 'HOMEPAGE_BROCHURE';

export type MediaSourceSlot =
  | 'PRODUCT_IMAGE_1'
  | 'PRODUCT_IMAGE_2'
  | 'PRODUCT_IMAGE_3'
  | 'PRODUCT_IMAGE_4'
  | 'PRODUCT_IMAGE_5'
  | 'BROCHURE_DESKTOP'
  | 'BROCHURE_MOBILE';

export type MediaVariantType =
  | 'THUMBNAIL'
  | 'CARD'
  | 'MOBILE'
  | 'TABLET'
  | 'DETAIL'
  | 'DESKTOP'
  | 'LARGE';

export type MediaProcessingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

export type PendingMediaVariant = {
  id: number;
  owner_type: MediaOwnerType;
  owner_id: number;
  source_slot: MediaSourceSlot;
  variant_type: MediaVariantType;
  original_url: string;
};

export type VariantPreset = {
  width: number;
  quality: number;
};

export type MediaProcessingResult = {
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    id: number;
    status: 'READY' | 'FAILED';
    variantType: MediaVariantType;
    url?: string;
    error?: string;
  }>;
};