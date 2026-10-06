export const PRODUCTS = [
  // INDIVIDUAL ITEMS
  {
    id: 'pointers-tshirt',
    name: 'POINTERS Org Tee',
    category: 'Apparel',
    price: 349, // Updated from pricelist
    description: '100% combed cotton classic shirt featuring official CICS-POINTERS design.',
    tag: 'Popular',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    isBundle: false,
  },
  {
    id: 'pointers-lanyard',
    name: 'POINTERS Sublimated Lanyard',
    category: 'Accessories',
    price: 100, // Updated from pricelist
    description: 'High-quality satin lanyard with quick-release side buckle and metal hook.',
    tag: 'Essential',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    availableSizes: ['Standard'],
    isBundle: false,
  },
  {
    id: 'pointers-pin',
    name: 'POINTERS Button Pin',
    category: 'Accessories',
    price: 35, // Updated from pricelist
    description: 'Durable pinback button badge perfect for bags, lanyards, and jackets.',
    tag: 'Popular',
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
    availableSizes: ['One Size'],
    isBundle: false,
  },
  {
    id: 'pointers-keychain',
    name: 'POINTERS Acrylic Keychain',
    category: 'Accessories',
    price: 15, // Updated from pricelist
    description: 'Custom acrylic keychain featuring the official POINTERS logo.',
    tag: 'Popular',
    image: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80',
    availableSizes: ['One Size'],
    isBundle: false,
  },
  {
    id: 'pointers-sticker',
    name: 'POINTERS Sticker',
    category: 'Accessories',
    price: 15, // Updated from pricelist
    description: 'Waterproof vinyl sticker set featuring CS memes and POINTERS branding.',
    tag: 'New',
    image: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=800&q=80',
    availableSizes: ['One Size'],
    isBundle: false,
  },

  // BUNDLES
  {
    id: 'bundle-set-a',
    name: 'Bundle Set A (Complete Pack)',
    category: 'Bundles',
    price: 499, // Original value: ₱514
    originalPrice: 514,
    description: 'The ultimate package: T-Shirt + Lanyard + Pin + Keychain + Sticker.',
    tag: 'Best Value',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    items: ['T-Shirt', 'Lanyard', 'Pin', 'Keychain', 'Sticker'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    isBundle: true,
  },
  {
    id: 'bundle-set-b',
    name: 'Bundle Set B (Tee + Lanyard + Pin)',
    category: 'Bundles',
    price: 449, // Original value: ₱484
    originalPrice: 484,
    description: 'Essential merch combo containing T-Shirt, Lanyard, and Pin.',
    tag: 'Saver',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
    items: ['T-Shirt', 'Lanyard', 'Pin'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    isBundle: true,
  },
  {
    id: 'bundle-set-c',
    name: 'Bundle Set C (Tee + Lanyard + Keychain)',
    category: 'Bundles',
    price: 429, // Original value: ₱464
    originalPrice: 464,
    description: 'Daily tech combo including T-Shirt, Lanyard, and Keychain.',
    tag: 'Popular',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
    items: ['T-Shirt', 'Lanyard', 'Keychain'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    isBundle: true,
  },
  {
    id: 'bundle-set-d',
    name: 'Bundle Set D (Tee + Lanyard)',
    category: 'Bundles',
    price: 419, // Original value: ₱449
    originalPrice: 449,
    description: 'Starter duo pack featuring T-Shirt and Lanyard.',
    tag: 'Starter',
    image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
    items: ['T-Shirt', 'Lanyard'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    isBundle: true,
  },
];