// Shared source-of-truth for per-category preview photos served from
// public/preview-photos/{category}/. Used by both the onboarding phone
// preview (to show category-appropriate imagery while a partner is being
// onboarded) and the T22 admin item autofill (to seed items with photos).
// Keeping both consumers in sync prevents the "autofill uses file X,
// onboarding uses file Y" drift that cost us 30 minutes to debug.

const RAW: Record<string, string[]> = {
  baker: [
    "5Aop72ShQHGGGOLy0t7JLg.jpeg",
    "6VFsROUVS2mDLFhgdYcKvQ.png",
    "6riUhak2SuqoreAnSHkoGA.jpeg",
    "7F3T8p-zR_ihH3VEsh6HkA.png",
    "a3ln2zaiQSCNBo-bB7fbpA.jpeg",
  ],
  butcher: [
    "butcher1.jpg",
    "butcher2.jpeg",
    "butcher3.jpg",
    "premium_photo-1722686466966-d4290d91faab.jpeg",
    "premium_photo-1726869690878-85cd6cab7437.jpeg",
  ],
  alcohol: [
    "Screen-Shot-2022-09-15-at-1.58.19-PM.png",
    "Unknown-8.jpg.webp",
    "Woody-Creek-Mary-s-Select-Gin-ForWhiskeyLovers-1.png.webp",
    "spirit-works-gin.jpg.webp",
    "suntory-suntory-roku-gin-750ml.jpg",
  ],
  wine: [
    "21F6D2C8-B53E-45B9-ABB9-F77B0C802DB5_1184x1184.jpg",
    "4D69A66E-3862-4F24-913D-58AABC3F6668_1184x1184.jpg",
    "wine1.jpeg",
    "wine2.jpeg",
    "wine3.jpeg",
  ],
  cheese: [
    "camembert.jpeg",
    "cammebert.jpeg",
    "cheese1.jpg",
    "cheese2.jpg",
    "photo-1668094497457-29f4bd775c95.jpeg",
  ],
  provisions: [
    "5Aop72ShQHGGGOLy0t7JLg.jpeg",
    "6VFsROUVS2mDLFhgdYcKvQ.png",
    "6riUhak2SuqoreAnSHkoGA.jpeg",
    "7F3T8p-zR_ihH3VEsh6HkA.png",
    "9d3ada90-4914-493d-af7e-27183804e516.png",
  ],
  restaurant: [
    "Unknown.jpeg",
    "rintaro bento01.jpg",
    "rintaro bento03.jpg",
    "rintaro bento04.jpg",
    "unnamed-5.jpg",
  ],
};

export const CATEGORIES = Object.keys(RAW);

function encode(category: string, filename: string): string {
  return `/preview-photos/${category}/${encodeURIComponent(filename)}`;
}

// URL-encoded paths per category (some filenames contain spaces, like
// 'rintaro bento01.jpg' — without encodeURIComponent those 404).
export const CATEGORY_PHOTOS: Record<string, string[]> = Object.fromEntries(
  Object.entries(RAW).map(([cat, files]) => [cat, files.map((f) => encode(cat, f))]),
);

// Just the raw filenames, for consumers that want to assemble URLs differently.
// Key is category, value is array of filenames in insertion order.
export const CATEGORY_PHOTO_FILES: Record<string, string[]> = RAW;

// Generic fallback for an unknown business type — a mix across categories.
export const PREVIEW_PHOTOS: string[] = [
  CATEGORY_PHOTOS.baker[0],
  CATEGORY_PHOTOS.butcher[0],
  CATEGORY_PHOTOS.wine[0],
  CATEGORY_PHOTOS.cheese[0],
  CATEGORY_PHOTOS.provisions[0],
];

export function getPhotosForBusinessType(businessType: string): string[] {
  const t = businessType.toLowerCase();
  if (t.includes("baker") || t.includes("bread") || t.includes("pastry") || t.includes("boulangerie") || t.includes("patisserie")) {
    return CATEGORY_PHOTOS.baker;
  }
  if (t.includes("butcher") || t.includes("meat") || t.includes("charcuterie")) {
    return CATEGORY_PHOTOS.butcher;
  }
  if (t.includes("cheese") || t.includes("fromagerie") || t.includes("dairy")) {
    return CATEGORY_PHOTOS.cheese;
  }
  if (t.includes("wine") && !t.includes("bar")) {
    return CATEGORY_PHOTOS.wine;
  }
  if (t.includes("alcohol") || t.includes("spirit") || t.includes("distill") || t.includes("brewery") || t.includes("beer") || t.includes("wine bar") || t.includes("bottle shop") || t.includes("liquor")) {
    return CATEGORY_PHOTOS.alcohol;
  }
  if (t.includes("restaurant") || t.includes("bistro") || t.includes("cafe") || t.includes("diner") || t.includes("eatery") || t.includes("brasserie") || t.includes("tavern")) {
    return CATEGORY_PHOTOS.restaurant;
  }
  if (t.includes("provision") || t.includes("grocer") || t.includes("deli") || t.includes("market") || t.includes("farm") || t.includes("produce") || t.includes("pantry")) {
    return CATEGORY_PHOTOS.provisions;
  }
  return PREVIEW_PHOTOS;
}
