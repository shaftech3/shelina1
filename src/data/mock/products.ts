import type { Product } from '@/types';

/**
 * Demonstration products.
 *
 * ARCHITECTURAL RULE — READ BEFORE EDITING:
 * Every product declares its OWN `sizes` and `colors` arrays. There is no
 * shared size list, no shared colour list, and no validation against any
 * dictionary anywhere in this codebase. The value strings below are
 * deliberately inconsistent between products — numeric EU sizes, UK-prefixed
 * sizes, plain integers, and word sizes all coexist — precisely because the
 * admin will type whatever that product actually comes in.
 *
 * The set intentionally covers every branch the variant UI must handle:
 *   - prd-013  sizes but NO colours
 *   - prd-014  colours but NO sizes  (also: word sizes are absent entirely)
 *   - prd-015  neither sizes nor colours
 *   - prd-016  a single colour only
 *   - prd-017  word/free-text sizes ("Small", "Medium", "Large")
 *   - prd-010  an optional product video
 */
export const mockProducts: Product[] = [
  {
    id: 'prd-001',
    slug: 'aurelia-bow-slide',
    name: 'Aurelia Bow Slide',
    brand: 'Shelina Signature',
    categoryId: 'cat-ladies-chappals',
    price: 6490,
    salePrice: 4890,
    sku: 'SHE-AUR-001',
    images: [
      { src: '/images/products/p1-a.jpg', alt: 'Aurelia bow slide in blush leather, angled view', width: 1024, height: 1280 },
      { src: '/images/products/p1-b.jpg', alt: 'Aurelia bow slide pair, top view', width: 1024, height: 1280 },
    ],
    sizes: [
      { value: '36', available: true },
      { value: '37', available: true },
      { value: '38', available: true },
      { value: '39', available: false },
      { value: '40', available: true },
    ],
    colors: [
      { name: 'Blush', swatch: '#D8A7A2', available: true },
      { name: 'Ivory', swatch: '#F2EDE4', available: true },
      { name: 'Sand', swatch: '#D9C6AC', available: false },
    ],
    stockStatus: 'in-stock',
    stockCount: 14,
    featured: true,
    isNew: true,
    shortDescription: 'Softly knotted vamp with a gold ring detail and a cushioned quilted footbed.',
    description:
      'The Aurelia takes the everyday slide somewhere quieter. The vamp is knotted by hand from a single piece of glove-soft nappa, then finished with a slim gold ring at the centre. Underneath, a quilted footbed is layered over a flexible sole so the shoe moves with the foot rather than against it. Wear it with linen in the afternoon and with something sharper after dark.',
    status: 'active',
    tags: ['bestseller', 'summer'],
  },
  {
    id: 'prd-002',
    slug: 'meher-embroidered-flat',
    name: 'Meher Embroidered Flat',
    brand: 'Atelier Lahore',
    categoryId: 'cat-ladies-chappals',
    price: 5290,
    sku: 'ATL-MEH-002',
    images: [
      { src: '/images/products/p2-a.jpg', alt: 'Meher embroidered beige suede flat', width: 1024, height: 1280 },
    ],
    sizes: [
      { value: '35', available: true },
      { value: '36', available: true },
      { value: '37', available: true },
      { value: '38', available: true },
      { value: '39', available: true },
      { value: '40', available: true },
      { value: '41', available: false },
    ],
    colors: [
      { name: 'Beige', swatch: '#D9C6AC', available: true },
      { name: 'Charcoal', swatch: '#3A3A38', available: true },
    ],
    stockStatus: 'low-stock',
    stockCount: 3,
    shortDescription: 'Hand-embroidered vamp on soft suede with a whisper-thin sole.',
    description:
      'Each Meher vamp is embroidered by hand in Lahore, which means no two pairs carry exactly the same stitch density. The base is a brushed suede chosen for how it takes thread; the sole is kept deliberately thin so the shoe folds and travels well. Expect small irregularities in the metallic work — they are the point.',
    status: 'active',
  },
  {
    id: 'prd-003',
    slug: 'noor-block-heel',
    name: 'Noor Block Heel',
    brand: 'Shelina',
    categoryId: 'cat-ladies-shoes',
    price: 8990,
    salePrice: 7640,
    sku: 'SHE-NOO-003',
    images: [
      { src: '/images/products/p3-a.jpg', alt: 'Noor dusty rose block heel court shoe', width: 1024, height: 1024 },
    ],
    sizes: [
      { value: '36', available: true },
      { value: '37', available: true },
      { value: '38', available: true },
      { value: '39', available: true },
      { value: '40', available: false },
    ],
    colors: [
      { name: 'Dusty Rose', swatch: '#D29E9E', available: true },
      { name: 'Black', swatch: '#1C1A19', available: true },
    ],
    stockStatus: 'in-stock',
    stockCount: 21,
    featured: true,
    shortDescription: 'A 60mm block heel balanced for all-day wear.',
    description:
      'A court shoe built around the heel rather than the other way round. At 60mm the block sits directly under the ankle, which is what keeps it wearable from morning to evening. The topline is cut low at the sides and slightly higher at the back to stop slipping without gripping.',
    status: 'active',
  },
  {
    id: 'prd-004',
    slug: 'shahzad-oxford',
    name: 'Shahzad Oxford',
    brand: 'Shelina',
    categoryId: 'cat-gents-shoes',
    price: 12490,
    sku: 'SHE-SHA-004',
    images: [
      { src: '/images/products/p4-a.jpg', alt: 'Shahzad brown leather oxford shoe', width: 1024, height: 1280 },
    ],
    sizes: [
      { value: '39', available: true },
      { value: '40', available: true },
      { value: '41', available: true },
      { value: '42', available: true },
      { value: '43', available: true },
      { value: '44', available: false },
      { value: '45', available: true },
    ],
    colors: [
      { name: 'Chestnut', swatch: '#6B4326', available: true },
      { name: 'Black Coffee', swatch: '#2C231D', available: true },
    ],
    stockStatus: 'in-stock',
    stockCount: 9,
    featured: true,
    shortDescription: 'Goodyear-welted full grain leather with a hand-burnished toe.',
    description:
      'A closed-lacing oxford in full-grain calf, Goodyear-welted so the sole can be replaced rather than the shoe discarded. The toe is burnished by hand, which deepens the colour unevenly on purpose — the finish will continue to move as the shoe is worn.',
    status: 'active',
  },
  {
    id: 'prd-005',
    slug: 'drift-low-sneaker',
    name: 'Drift Low Sneaker',
    brand: 'Shelina Active',
    categoryId: 'cat-sneakers',
    price: 9750,
    salePrice: 8290,
    sku: 'SHA-DRI-005',
    images: [
      { src: '/images/products/p5-a.jpg', alt: 'Drift minimal white low sneaker', width: 1024, height: 1024 },
    ],
    // UK-prefixed strings — proof the size field is free text, not a number set.
    sizes: [
      { value: 'UK 6', available: true },
      { value: 'UK 7', available: true },
      { value: 'UK 8', available: true },
      { value: 'UK 9', available: false },
      { value: 'UK 10', available: true },
    ],
    colors: [
      { name: 'Optic White', swatch: '#F7F7F4', available: true },
      { name: 'Sky', swatch: '#2596BE', available: true },
    ],
    stockStatus: 'in-stock',
    stockCount: 30,
    isNew: true,
    shortDescription: 'Full-grain white leather upper on a lightweight cupsole.',
    description:
      'A low sneaker stripped back to its outline: no logos, no contrast panels, no visible branding. The upper is one piece of full-grain leather over a foam-backed lining, sitting on a cupsole light enough to wear all day.',
    status: 'active',
  },
  {
    id: 'prd-006',
    slug: 'peshawari-heritage',
    name: 'Peshawari Heritage',
    brand: 'Atelier Lahore',
    categoryId: 'cat-gents-chappals',
    price: 7290,
    sku: 'ATL-PES-006',
    images: [
      { src: '/images/products/p6-a.jpg', alt: 'Peshawari heritage tan leather chappal', width: 1024, height: 1024 },
    ],
    sizes: [
      { value: '7', available: true },
      { value: '8', available: true },
      { value: '9', available: true },
      { value: '10', available: true },
      { value: '11', available: false },
    ],
    colors: [
      { name: 'Tan', swatch: '#B47B4A', available: true },
      { name: 'Dark Brown', swatch: '#4A3427', available: true },
    ],
    stockStatus: 'pre-order',
    shortDescription: 'Double-sole construction, hand-stitched by third-generation artisans.',
    description:
      'The Peshawari is made the way it has been made for decades: two soles stitched together by hand, a broad vegetable-tanned strap across the front, and nothing else. Because each pair is stitched individually, allow a little variation in strap width between sizes.',
    status: 'active',
  },
  {
    id: 'prd-007',
    slug: 'lina-everyday-slide',
    name: 'Lina Everyday Slide',
    brand: 'Shelina',
    categoryId: 'cat-casual',
    price: 3990,
    sku: 'SHE-LIN-007',
    images: [
      { src: '/images/products/p1-b.jpg', alt: 'Lina everyday slide, pair top view', width: 1024, height: 1280 },
    ],
    sizes: [
      { value: '36', available: true },
      { value: '38', available: true },
      { value: '40', available: true },
    ],
    colors: [
      { name: 'Rose Beige', swatch: '#E0C4B8', available: true },
      { name: 'Stone', swatch: '#C9C6BD', available: true },
    ],
    stockStatus: 'out-of-stock',
    stockCount: 0,
    shortDescription: 'A featherweight slide with a moulded contour footbed.',
    description:
      'The lightest thing we make. A single moulded footbed, a soft padded strap, and very little else — intended for the walk between the car and everywhere else.',
    status: 'active',
  },
  {
    id: 'prd-008',
    slug: 'saira-court-shoe',
    name: 'Saira Court Shoe',
    brand: 'Shelina Signature',
    categoryId: 'cat-ladies-shoes',
    price: 10490,
    sku: 'SHE-SAI-008',
    images: [
      { src: '/images/products/p3-a.jpg', alt: 'Saira dusty rose court shoe', width: 1024, height: 1024 },
    ],
    sizes: [
      { value: '37', available: true },
      { value: '38', available: true },
      { value: '39', available: true },
    ],
    colors: [{ name: 'Dusty Rose', swatch: '#D29E9E', available: true }],
    stockStatus: 'in-stock',
    stockCount: 6,
    isNew: true,
    shortDescription: 'A pointed almond toe on a slender 70mm heel.',
    description:
      'An almond toe cut slightly longer than the foot, which is what gives the Saira its line. The 70mm heel is set marginally forward of the centre to shift weight off the ball of the foot.',
    status: 'active',
  },
  {
    id: 'prd-009',
    slug: 'everyday-comfort-sandal',
    name: 'Everyday Comfort Sandal',
    brand: 'Shelina',
    categoryId: 'cat-ladies-chappals',
    price: 4590,
    sku: 'SHE-EVE-009',
    images: [
      { src: '/images/products/p7-a.jpg', alt: 'Everyday comfort sandal in tan leather', width: 1024, height: 1280 },
    ],
    sizes: [
      { value: '36', available: true },
      { value: '37', available: true },
      { value: '38', available: true },
      { value: '39', available: true },
      { value: '40', available: false },
    ],
    colors: [
      { name: 'Tan', swatch: '#B47B4A', available: true },
      { name: 'Blush', swatch: '#D8A7A2', available: true },
    ],
    stockStatus: 'in-stock',
    stockCount: 18,
    featured: true,
    shortDescription: 'Wide crossover straps on a contoured, cushioned footbed.',
    description:
      'Two wide straps cross the foot and are stitched — not glued — into a contoured cork-and-foam footbed that takes the shape of the wearer over the first week or so.',
    status: 'active',
  },
  {
    id: 'prd-010',
    slug: 'urban-leather-loafer',
    name: 'Urban Leather Loafer',
    brand: 'Shelina',
    categoryId: 'cat-gents-shoes',
    price: 11290,
    salePrice: 9490,
    sku: 'SHE-URB-010',
    images: [
      { src: '/images/products/p8-a.jpg', alt: 'Urban loafer in dark brown leather', width: 1024, height: 1280 },
    ],
    /**
     * The only product in the mock set with a video. Everything about the
     * gallery's video handling is exercised by this one record — every other
     * product must render no video affordance at all.
     */
    video: {
      src: '/videos/p10-look.mp4',
      poster: '/videos/p10-look-poster.jpg',
      title: 'Urban Leather Loafer — a slow look around the pair',
    },
    sizes: [
      { value: '40', available: true },
      { value: '41', available: true },
      { value: '42', available: true },
      { value: '43', available: false },
      { value: '44', available: true },
    ],
    colors: [
      { name: 'Dark Brown', swatch: '#4A3427', available: true },
      { name: 'Black Coffee', swatch: '#2C231D', available: true },
    ],
    stockStatus: 'in-stock',
    stockCount: 12,
    isNew: true,
    shortDescription: 'A slim-profile loafer with minimal stitching and a flexible sole.',
    description:
      'Cut close to the foot with an apron seam worked by hand and almost no visible hardware. The sole is thinner than a traditional loafer, which makes the shoe fold naturally at the ball of the foot from the first wear.',
    status: 'active',
  },
  {
    id: 'prd-011',
    slug: 'signature-pointed-flat',
    name: 'Signature Pointed Flat',
    brand: 'Shelina Signature',
    categoryId: 'cat-ladies-shoes',
    price: 8290,
    sku: 'SHE-SIG-011',
    images: [
      { src: '/images/products/p9-a.jpg', alt: 'Signature pointed flat in black leather', width: 1024, height: 1280 },
    ],
    sizes: [
      { value: '36', available: true },
      { value: '37', available: true },
      { value: '38', available: true },
      { value: '39', available: true },
    ],
    colors: [
      { name: 'Black', swatch: '#1C1A19', available: true },
      { name: 'Ivory', swatch: '#F2EDE4', available: true },
    ],
    stockStatus: 'in-stock',
    stockCount: 11,
    isNew: true,
    featured: true,
    shortDescription: 'A clean pointed toe with a subtle gold hardware accent.',
    description:
      'A flat with the proportions of a court shoe. The toe is elongated, the topline scooped, and a small brushed-gold plate sits at the throat as the only ornament.',
    status: 'active',
  },
  {
    id: 'prd-012',
    slug: 'classic-leather-chappal',
    name: 'Classic Leather Chappal',
    brand: 'Atelier Lahore',
    categoryId: 'cat-gents-chappals',
    price: 6190,
    sku: 'ATL-CLA-012',
    images: [
      { src: '/images/products/p6-a.jpg', alt: 'Classic leather chappal in tan', width: 1024, height: 1024 },
    ],
    sizes: [
      { value: '8', available: true },
      { value: '9', available: true },
      { value: '10', available: true },
      { value: '11', available: true },
    ],
    colors: [{ name: 'Tan', swatch: '#B47B4A', available: true }],
    stockStatus: 'in-stock',
    stockCount: 25,
    isNew: true,
    shortDescription: 'An everyday chappal cut from vegetable-tanned leather.',
    description:
      'Vegetable-tanned leather over a stitched sole. It starts stiff and pale and ends up soft and considerably darker — the leather is undyed, so it takes its final colour from wear.',
    status: 'active',
  },

  /* ------------------------------------------------------------------ *
   * Variant edge cases. These exist to prove the UI branches correctly.
   * ------------------------------------------------------------------ */

  {
    id: 'prd-013',
    slug: 'hana-ankle-boot',
    name: 'Hana Ankle Boot',
    brand: 'Shelina Signature',
    categoryId: 'cat-ladies-shoes',
    price: 14900,
    salePrice: 11920,
    sku: 'SHE-HAN-013',
    images: [
      { src: '/images/products/p10-a.jpg', alt: 'Hana tan leather ankle boot, side view', width: 1024, height: 1280 },
      { src: '/images/products/p10-b.jpg', alt: 'Hana ankle boot rear three-quarter view showing the heel', width: 1024, height: 1280 },
      { src: '/images/products/p10-c.jpg', alt: 'Close detail of the Hana boot stitching and leather grain', width: 1024, height: 1280 },
    ],
    // SIZES BUT NO COLOURS — the PDP must not render a colour selector, and
    // Add to Cart must require only a size.
    sizes: [
      { value: '36', available: true },
      { value: '37', available: true },
      { value: '38', available: true },
      { value: '39', available: true },
      { value: '40', available: false },
      { value: '41', available: true },
    ],
    colors: [],
    stockStatus: 'in-stock',
    stockCount: 8,
    featured: true,
    isNew: true,
    shortDescription: 'A clean-lined ankle boot on a stacked block heel.',
    description:
      'Cut high on the ankle with an inside zip and no external hardware. The block heel is stacked and slightly tapered so the boot reads lighter than it is. Offered in a single tan leather this season.',
    status: 'active',
  },
  {
    id: 'prd-014',
    slug: 'atelier-house-slipper',
    name: 'Atelier House Slipper',
    brand: 'Atelier Lahore',
    categoryId: 'cat-casual',
    price: 3490,
    sku: 'ATL-HOU-014',
    images: [
      { src: '/images/products/p11-a.jpg', alt: 'Atelier house slipper in charcoal felt', width: 1024, height: 1280 },
    ],
    // NO SIZES, BUT COLOURS — one-size product. The PDP must not render a size
    // selector, and Add to Cart must require only a colour.
    sizes: [],
    colors: [
      { name: 'Charcoal', swatch: '#3A3A38', available: true },
      { name: 'Oatmeal', swatch: '#D9CFBE', available: true },
      { name: 'Deep Moss', swatch: '#4A5443', available: false },
    ],
    stockStatus: 'in-stock',
    stockCount: 40,
    shortDescription: 'One-size wool felt slipper with a suede sole.',
    description:
      'A packable house slipper in dense wool felt with a thin suede sole. Made in one size that gives across the width rather than in a size run.',
    status: 'active',
  },
  {
    id: 'prd-015',
    slug: 'shelina-care-kit',
    name: 'Leather Care Kit',
    brand: 'Shelina',
    categoryId: 'cat-casual',
    price: 2250,
    sku: 'SHE-CAR-015',
    images: [
      { src: '/images/products/p13-a.jpg', alt: 'Leather care kit: neutral cream, horsehair brush and cloth', width: 1024, height: 1280 },
    ],
    // NEITHER SIZES NOR COLOURS — Add to Cart must work immediately with no
    // variant selection required at all.
    sizes: [],
    colors: [],
    stockStatus: 'in-stock',
    stockCount: 60,
    shortDescription: 'Cream, brush and cloth for finished and vegetable-tanned leather.',
    description:
      'A neutral cream that works across the range, a horsehair brush, and a lint-free cloth. The cream is uncoloured so it will not shift the tone of undyed leather.',
    status: 'active',
  },
  {
    id: 'prd-016',
    slug: 'rafi-chukka-boot',
    name: 'Rafi Chukka Boot',
    brand: 'Shelina',
    categoryId: 'cat-gents-shoes',
    price: 13250,
    sku: 'SHE-RAF-016',
    images: [
      { src: '/images/products/p12-a.jpg', alt: 'Rafi chukka boot in coffee brown leather', width: 1024, height: 1280 },
    ],
    sizes: [
      { value: '40', available: true },
      { value: '41', available: true },
      { value: '42', available: true },
      { value: '43', available: true },
      { value: '44', available: true },
    ],
    // A SINGLE COLOUR — still requires an explicit choice, and the label must
    // never be hidden behind a swatch alone.
    colors: [{ name: 'Coffee', swatch: '#4B3524', available: true }],
    stockStatus: 'low-stock',
    stockCount: 2,
    shortDescription: 'Two-eyelet chukka on a crepe sole.',
    description:
      'A two-eyelet chukka in oiled coffee-brown calf on a natural crepe sole. The crepe is soft underfoot and grips well on smooth floors; it will pick up a patina at the edges.',
    status: 'active',
  },
  {
    id: 'prd-017',
    slug: 'travel-shoe-bag',
    name: 'Travel Shoe Bag',
    brand: 'Shelina',
    categoryId: 'cat-casual',
    price: 1650,
    sku: 'SHE-TRV-017',
    images: [
      { src: '/images/products/p14-a.jpg', alt: 'Travel shoe bag in natural cotton canvas', width: 1024, height: 1280 },
    ],
    // WORD SIZES — the clearest possible demonstration that sizes are strings.
    sizes: [
      { value: 'Small', available: true },
      { value: 'Medium', available: true },
      { value: 'Large', available: true },
    ],
    colors: [
      { name: 'Natural', swatch: '#E3DCCB', available: true },
      { name: 'Ink', swatch: '#2A2E33', available: true },
    ],
    stockStatus: 'in-stock',
    stockCount: 35,
    shortDescription: 'Drawstring cotton canvas bag for one pair.',
    description:
      'A plain drawstring bag in heavy cotton canvas, sized to hold a single pair without crushing the toe box. Small fits flats and slides, Medium fits most shoes, Large fits boots.',
    status: 'active',
  },
];
