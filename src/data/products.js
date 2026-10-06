const teeDesigns = [
  { name: 'Version A', label: 'Version A · Magenta sleeves', imagePath: 'Tshirt_1' },
  { name: 'Version B', label: 'Version B · Monochrome cream', imagePath: 'Tshirt_2' },
  { name: 'Version C', label: 'Version C · Computer science student', imagePath: 'Tshirt_3' },
  { name: 'Version D', label: 'Version D · No sleep, code, eat, repeat', imagePath: 'Tshirt_4' },
]

const lanyardDesigns = [
  { name: 'Version A', label: 'Version A · Kompsay waves', imagePath: 'IDLace_2' },
  { name: 'Version B', label: 'Version B · MSU cloud', imagePath: 'IDLace_1' },
]

const pinsDesigns = [
  { name: 'Pin A', label: 'Pin A · Kompsay', imagePath: 'pins' },
  { name: 'Pin B', label: 'Pin B · Computer Science', imagePath: 'pins' },
  { name: 'Pin C', label: 'Pin C · POinters Logo', imagePath: 'pins' },
  { name: 'Pin D', label: 'Pin D · Iskolar ng Bayan at Teknolohiya', imagePath: 'pins' },
]
const keychainsDesigns = [
  { name: 'V1', label: 'V1 · Crying Cat Typing Meme', imagePath: 'keychains' },
  { name: 'V2', label: 'V2 · The Code Doesn\'t Work / Works Why?', imagePath: 'keychains' },
  { name: 'V3', label: 'V3 · Studying Cat Drawing', imagePath: 'keychains' },
  { name: 'V4', label: 'V4 · Frieren C++ Programming', imagePath: 'keychains' },
  { name: 'V5', label: 'V5 · Progress Over Perfection', imagePath: 'keychains' },
  { name: 'V6', label: 'V6 · Go Study!', imagePath: 'keychains' },
  { name: 'V7', label: 'V7 · I Need To Pass Meme', imagePath: 'keychains' },
]

const stickersDesigns = [
  { name: 'Sticker', label: 'Sticker · Tech Vinyl', imagePath: 'Stickers' },
]
// TAMA (walang extension at hiwalay sa bawat bundle):
const bundleADesigns = [{ name: 'Bundle A', label: 'Bundle A · Complete Pack', imagePath: 'setA' }]
const bundleBDesigns = [{ name: 'Bundle B', label: 'Bundle B · T-Shirt + Lanyard + Pins', imagePath: 'setB' }]
const bundleCDesigns = [{ name: 'Bundle C', label: 'Bundle C · T-Shirt + Lanyard + Keychain', imagePath: 'setC' }]
const bundleDDesigns = [{ name: 'Bundle D', label: 'Bundle D · T-Shirt + Lanyard', imagePath: 'setD' }]
const bundleComponents = {
  'PTR-BNDL-A': [
    { sku: 'PTR-TEE-01', label: 'T-shirt' },
    { sku: 'PTR-LAN-02', label: 'Lanyard' },
    { sku: 'PTR-PIN-04', label: 'Pin' },
    { sku: 'PTR-KEY-03', label: 'Keychain' },
    { sku: 'PTR-STK-05', label: 'Stickers pack' },
  ],
  'PTR-BNDL-B': [
    { sku: 'PTR-TEE-01', label: 'T-shirt' },
    { sku: 'PTR-LAN-02', label: 'Lanyard' },
    { sku: 'PTR-PIN-04', label: 'Pin' },
  ],
  'PTR-BNDL-C': [
    { sku: 'PTR-TEE-01', label: 'T-shirt' },
    { sku: 'PTR-LAN-02', label: 'Lanyard' },
    { sku: 'PTR-KEY-03', label: 'Keychain' },
  ],
  'PTR-BNDL-D': [
    { sku: 'PTR-TEE-01', label: 'T-shirt' },
    { sku: 'PTR-LAN-02', label: 'Lanyard' },
  ],
}

export const PRODUCT_FALLBACK = [
  {
    sku: 'PTR-TEE-01',
    name: 'Official MSU-POINTERS T-Shirt',
    shortName: 'Official MSU-POINTERS T-Shirt',
    category: 'apparel',
    type: 'apparel',
    price: 349,
    compareAtPrice: 349,
    meta: '240 GSM',
    description: 'Made with cotton of a low-poly Dino and DCS back illustration.',
    sizes: ['S', 'M', 'L', 'XL'],
    designs: teeDesigns,
    discountEligible: true,
  },
  {
    sku: 'PTR-LAN-02',
    name: 'MSU-POINTERS Lanyard',
    shortName: 'MSU-POINTERS Woven Lanyard',
    category: 'wearables',
    type: 'wearable',
    price: 100,
    compareAtPrice: 100,
    meta: '1 INCH WIDTH',
    description: 'Flex your CS pride everyday! High-quality woven POINTERS lanyard with heavy-duty metal clip and side-release buckle.',
    designs: lanyardDesigns,
    discountEligible: true,
  },
  {
    sku: 'PTR-PIN-04',
    name: 'Button Badges (44mm)',
    shortName: 'Button Badge (44mm)',
    category: 'accessories',
    type: 'accessory',
    price: 35,
    compareAtPrice: 35,
    meta: '44MM · VELVET MATTE',
    description: 'Scratch-resistant velvet-touch finish with rust-proof safety-pin backing.',
    designs:pinsDesigns,
    discountEligible: true,
  },
  {
    sku: 'PTR-KEY-03',
    name: 'Acrylic Keychains',
    shortName: 'Acrylic Keychain',
    category: 'accessories',
    type: 'accessory',
    price: 15,
    compareAtPrice: 15,
    meta: '3MM ACRYLIC',
    description: 'Clear acrylic frame keychain with custom inserted graphics and a durable stainless-steel keyring.',
    designs: keychainsDesigns,
    discountEligible: true,
  },
  {
    sku: 'PTR-STK-05',
    name: '5 Stickers Pack',
    shortName: 'Tech Vinyl Decals',
    category: 'accessories',
    type: 'accessory',
    price: 15,
    compareAtPrice: 15,
    meta: 'DIE-CUT VINYL',
    description: 'High-quality printed sticker paper decals, perfect for notebooks, gadgets, and everyday campus use.',
    designs: stickersDesigns,
    discountEligible: true,
  },
  {
    sku: 'PTR-BNDL-A',
    name: 'Bundle Set A · Complete Pack',
    shortName: 'Bundle Set A',
    category: 'bundles',
    type: 'bundle',
    price: 499,
    compareAtPrice: 514,
    meta: '5-PIECE BUNDLE',
    description: 'T-shirt, lanyard, pin, keychain, and stickers. Bundle price from the DCS price list.',
    bundleItems: bundleComponents['PTR-BNDL-A'],
  // <-- Dito ilagay ang pangalan ng iisang image file mo (halimbawa: Bundle_Set_A)
    designs: bundleADesigns,
    sizes: ['S', 'M', 'L', 'XL'],
    discountEligible: false,
  },
  {
    sku: 'PTR-BNDL-B',
    name: 'Bundle Set B · T-Shirt + Lanyard + Pins',
    shortName: 'Bundle Set B',
    category: 'bundles',
    type: 'bundle',
    price: 449,
    compareAtPrice: 484,
    meta: '3-PIECE BUNDLE',
    description: 'T-shirt, lanyard, and pins. Bundle price from the DCS price list.',
    bundleItems: bundleComponents['PTR-BNDL-B'],
    designs: bundleBDesigns,
    sizes: ['S', 'M', 'L', 'XL'],
    discountEligible: false,
  },
  {
    sku: 'PTR-BNDL-C',
    name: 'Bundle Set C · T-Shirt + Lanyard + Keychain',
    shortName: 'Bundle Set C',
    category: 'bundles',
    type: 'bundle',
    price: 429,
    compareAtPrice: 464,
    meta: '3-PIECE BUNDLE',
    description: 'T-shirt, lanyard, and keychain. Bundle price from the DCS price list.',
    bundleItems: bundleComponents['PTR-BNDL-C'],
    designs: bundleCDesigns,
    sizes: ['S', 'M', 'L', 'XL'],
    discountEligible: false,
  },
  {
    sku: 'PTR-BNDL-D',
    name: 'Bundle Set D · T-Shirt + Lanyard',
    shortName: 'Bundle Set D',
    category: 'bundles',
    type: 'bundle',
    price: 419,
    compareAtPrice: 449,
    meta: '2-PIECE BUNDLE',
    description: 'T-shirt and lanyard. Bundle price from the DCS price list.',
    bundleItems: bundleComponents['PTR-BNDL-D'],
    designs: bundleDDesigns,
    sizes: ['S', 'M', 'L', 'XL'],
    discountEligible: false,
  },
]

export function normalizeCatalog(products, variants) {
  const productOrder = new Map(PRODUCT_FALLBACK.map((product, index) => [product.sku, index]))
  const fallbackMap = new Map(PRODUCT_FALLBACK.map((product) => [product.sku, product]))
  
  const variantsBySku = new Map()
  for (const variant of variants) {
    if (!variantsBySku.has(variant.product_sku)) variantsBySku.set(variant.product_sku, [])
    variantsBySku.get(variant.product_sku).push({
      name: variant.name,
      label: variant.label,
      imagePath: variant.image_path,
    })
  }

  return [...products]
    .sort((first, second) =>
      (productOrder.get(first.sku) ?? Number.MAX_SAFE_INTEGER)
      - (productOrder.get(second.sku) ?? Number.MAX_SAFE_INTEGER))
    .map((product) => {
      const fallbackItem = fallbackMap.get(product.sku)
      const dbVariants = variantsBySku.get(product.sku) ?? []

      return {
        sku: product.sku,
        name: product.name.replace(/\bTee\b/g, 'T-Shirt'),
        shortName: product.short_name.replace(/\bTee\b/g, 'T-Shirt'),
        category: product.category,
        type: product.product_type,
        price: Number(product.price),
        compareAtPrice: Number(product.compare_at_price ?? product.price),
        meta: product.meta,
        description: product.description,
        sizes: (product.sizes ?? []).filter((size) => size !== '2XL'),
        bundleItems: product.bundle_items ?? [],
        // Gamitin ang DB variants kung mayroon, kung wala ay babalik sa local designs
        designs: dbVariants.length > 0 ? dbVariants : (fallbackItem?.designs ?? []),
        discountEligible: product.discount_eligible,
      }
    })
}