// =============================================================================
// CORE DOMAIN TYPES
// =============================================================================

export type UserRole = 'guest' | 'customer' | 'admin' | 'superadmin' | 'delivery_boy';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  /** Initials used as avatar fallback when no avatarUrl is set */
  avatar: string;
  /** URL returned by the backend after avatar upload (replaces base64 storage) */
  avatarUrl?: string;
  dob?: string;
  gender?: string;
  preferences?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  has_password?: boolean;
}

export interface Review {
  id: string;
  product_id?: string;
  user_id?: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  avatar?: string;
  status?: string;
  title?: string;
  images?: string[];
  videos?: string[];
  is_verified_purchase?: boolean;
}

export interface ProductRatingSummary {
  average_rating: number;
  total_reviews: number;
  star_breakdown: { [key: number]: number };
}

export interface NutritionInfo {
  servingSize?: string;
  calories?: string;
  totalFat?: string;
  saturatedFat?: string;
  transFat?: string;
  cholesterol?: string;
  sodium?: string;
  totalCarb?: string;
  dietaryFiber?: string;
  totalSugars?: string;
  addedSugars?: string;
  protein?: string;
  [key: string]: string | undefined;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  slug?: string;
  category_id?: string;
  category: string;
  price: number;
  originalPrice?: number;
  weight: string;
  description: string;
  ingredients: string;
  rating: number;
  ratingsCount: number;
  badge?: 'Bestseller' | 'New' | 'Premium' | 'Limited' | 'Gift Hamper' | 'Signature' | string;

  image: string;
  hoverImage?: string;
  images?: string[];
  reviews: Review[];
  stock?: number;
  is_active?: boolean;
  is_available?: boolean;
  isAvailable?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isSample?: boolean;
  is_sample?: boolean;
  samplePrice?: number;
  sample_price?: number;
  nutrition?: NutritionInfo;
}

export interface CartItem {
  product: Product;
  quantity: number;
  id?: string;
  name?: string;
  price?: number;
  image?: string;
  sku?: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export type PaymentStatus =
  | 'Pending'
  | 'Processing'
  | 'Paid'
  | 'Failed'
  | 'Cancelled'
  | 'Refund Pending'
  | 'Refunded'
  | 'Partially Refunded';

export interface Order {
  id: string;
  user_id?: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  discount: number;
  coupon_code?: string;
  coupon_discount?: number;
  coins_used?: number;
  coin_discount?: number;
  coins_earned?: number;
  shipping: number;
  tax: number;
  status: OrderStatus | string;
  payment_status?: PaymentStatus | string;
  date: string;
  created_at?: string;
  shippingAddress: CustomerAddress;
  shipping_address?: CustomerAddress;
  deliveryOption: string;
  paymentMethod: string;
  payment_method?: string;
  customerName?: string;
  customerEmail?: string;
  invoice_url?: string;
  is_cancellable?: boolean;
  is_returnable?: boolean;
  delivered_at?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  customer_whatsapp_url?: string;
  owner_whatsapp_url?: string;

  // Dual-Mode Logistics & Fulfillment
  fulfillment_type?: 'LOCAL' | 'COURIER' | string;
  fulfillmentType?: string;
  shipping_provider?: string;
  shippingProvider?: string;
  fulfillment_status?: 'UNASSIGNED' | 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | string;
  fulfillmentStatus?: string;
  delivery_boy_id?: string | null;
  deliveryBoyId?: string | null;
  delivery_boy_name?: string | null;
  delivery_boy_phone?: string | null;
  deliveryBoyPhone?: string | null;
  store_location_id?: string | null;
  storeLocationId?: string | null;
  store_name?: string | null;
  storeName?: string | null;

  // Delivery OTP workflow
  delivery_otp?: string | null;
  delivery_otp_expires_at?: string | null;
  delivery_accepted_at?: string | null;
  delivery_rejected_at?: string | null;
  delivery_rejection_reason?: string | null;
  delivery_picked_at?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;

  // Authoritative immutable shipping snapshot
  shipping_name?: string;
  shipping_phone?: string;
  shipping_house_number?: string;
  shipping_street?: string;
  shipping_area?: string;
  shipping_landmark?: string;
  shipping_city?: string;
  shipping_district?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  shipping_latitude?: number | null;
  shipping_longitude?: number | null;
  shipping_formatted_address?: string | null;
  shipping_location_source?: string;
  shipping_location_verified?: boolean;
  shipping_delivery_charge?: number | null;
  shipping_confirmed_at?: string | null;
}

export interface DeliveryBoy {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  role: string;
  avatar_url?: string | null;
  created_at?: string | null;
  active_orders?: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  image: string;
  videoLink?: string;
  buttonText: string;
  link: string;
}

export interface SectionHeaderConfig {
  badge?: string;
  titleMain?: string;
  titleHighlight?: string;
  titleSuffix?: string;
  subtitle?: string;
}

export interface BestsellersSectionConfig {
  header: SectionHeaderConfig;
  bestsellersPart: {
    tag: string;
    title: string;
    titleHighlight: string;
    titleSuffix: string;
    description: string;
  };
  newArrivalsPart: {
    tag: string;
    title: string;
    titleHighlight: string;
    titleSuffix: string;
    description: string;
  };
}

export interface TasteSampleBulletConfig {
  title: string;
  desc: string;
}

export interface TasteSampleSectionConfig {
  badge: string;
  titleMain: string;
  titleHighlight: string;
  titleSuffix: string;
  subtitle: string;
  cardBadgeText: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  whyTitle: string;
  whySubtitle: string;
  whyBullets: TasteSampleBulletConfig[];
  selectedProductIds?: string[];
}

export interface LandingSectionsConfig {
  popularProducts: SectionHeaderConfig;
  bestsellersNewArrivals: BestsellersSectionConfig;
  tasteSample: TasteSampleSectionConfig;
  giftHampers: SectionHeaderConfig;
  boutique: SectionHeaderConfig;
  reviews: SectionHeaderConfig & { buttonText?: string };
  instagramReels: SectionHeaderConfig;
}

export const DEFAULT_LANDING_SECTIONS: LandingSectionsConfig = {
  popularProducts: {
    badge: 'Curated Selection',
    titleMain: 'Our Most',
    titleHighlight: 'Loved',
    titleSuffix: 'Creations',
    subtitle: 'Handpicked favorites that our chocolate lovers keep coming back for — each piece a testament to uncompromising quality and artisanal mastery.',
  },
  bestsellersNewArrivals: {
    header: {
      badge: 'Exclusive Showroom',
      titleMain: 'Bestsellers',
      titleHighlight: '&',
      titleSuffix: 'New Arrivals',
      subtitle: 'Indulge in our curated selections — showcasing both our legendary, time-honored classics and our latest avant-garde culinary creations.',
    },
    bestsellersPart: {
      tag: 'Connoisseur Choice',
      title: 'The Bestsellers',
      titleHighlight: '',
      titleSuffix: '',
      description: 'Artisanal icons that have won the hearts of fine chocolate lovers globally. Elegant, refined, and rich in depth.',
    },
    newArrivalsPart: {
      tag: 'Freshly Tempered',
      title: 'New Arrivals',
      titleHighlight: '',
      titleSuffix: '',
      description: 'Seasonal innovations and brand new releases straight from the kitchen. Discover fresh notes and modern textures.',
    },
  },
  tasteSample: {
    badge: 'Taste Our Collection',
    titleMain: 'Try a',
    titleHighlight: 'Sample Piece',
    titleSuffix: '',
    subtitle: 'Before you fall in love with an entire box, let one perfect piece do the talking — available across every chocolate variety in our store.',
    cardBadgeText: 'Sample Piece',
    ctaText: 'Explore All Varieties',
    ctaLink: '/shop',
    secondaryCtaText: 'Our Artisanal Story',
    secondaryCtaLink: '/our-story',
    whyTitle: 'Why We Offer A Sample Piece',
    whySubtitle: 'Pure passion, complete transparency, and total confidence in every bite.',
    whyBullets: [
      {
        title: 'Taste Before You Commit',
        desc: 'Every chocolate we craft carries a distinct personality. A sample piece lets you experience the full flavour journey — no guesswork, no regrets.',
      },
      {
        title: "Sourced from the World's Finest Cacao",
        desc: 'Our cacao is ethically sourced from single-origin plantations across Ecuador, Madagascar & Ghana — each origin telling a different taste story.',
      },
      {
        title: 'Crafted in Small, Artisanal Batches',
        desc: 'Every piece is tempered by hand in micro-batches, so the flavour profile stays vibrant, layered and unmistakably Chovique.',
      },
      {
        title: 'One Piece — Every Variety in Our Store',
        desc: 'We offer a sample piece across every chocolate variety we stock — because we believe the right truffle should find the right person.',
      },
    ],
    selectedProductIds: [],
  },
  giftHampers: {
    badge: 'Art of Giving',
    titleMain: 'Luxury Gift',
    titleHighlight: 'Hampers',
    titleSuffix: '',
    subtitle: 'Celebrate life’s most exquisite moments with Chovique’s bespoke gifting packages and presentation boxes.',
  },
  boutique: {
    badge: 'Featured Chocolates',
    titleMain: 'Explore Our',
    titleHighlight: 'Collection',
    titleSuffix: '',
    subtitle: 'Browse our complete range of handcrafted chocolates — from pure dark bars to chocolate gift boxes.',
  },
  reviews: {
    badge: 'Customer Love',
    titleMain: 'What Our',
    titleHighlight: 'Chocolate Lovers',
    titleSuffix: 'Say',
    subtitle: 'Real stories from real people who\'ve experienced the magic of Chovique chocolates.',
    buttonText: 'Share Your Experience',
  },
  instagramReels: {
    badge: 'Social Buzz',
    titleMain: 'Trending on',
    titleHighlight: 'Instagram',
    titleSuffix: '',
    subtitle: 'Hover to play our artisanal crafting process and delicious chocolate stories.',
  },
};

export interface StoryStep {
  num: string;
  title: string;
  desc: string;
}

export interface StoryValue {
  title: string;
  desc: string;
}

export interface StoryPageConfig {
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  video_url: string;
  story_badge: string;
  story_title: string;
  story_paragraph1: string;
  story_paragraph2: string;
  feature1_title: string;
  feature1_desc: string;
  feature2_title: string;
  feature2_desc: string;
  vision_title: string;
  vision_text: string;
  mission_title: string;
  mission_text: string;
  steps: StoryStep[];
  values: StoryValue[];
}

export const DEFAULT_STORY_PAGE_CONFIG: StoryPageConfig = {
  hero_badge: 'Heritage & Passion',
  hero_title: 'The Chovique Story',
  hero_subtitle: 'Crafting sensory journeys through the purity of cacao since 2020.',
  hero_image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1600&q=80',
  video_url: 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4',
  story_badge: 'Our Beginnings',
  story_title: 'Born from a Love of Pure Cacao',
  story_paragraph1: 'Chovique was founded on a simple realization: chocolate should be an experience, not just a sweet. Frustrated by highly processed, sugar-laden confectionery, our founders set out on a global quest to source authentic, single-origin cacao.',
  story_paragraph2: 'We believe that the best chocolate is a partnership between nature and the chocolatier. By respecting the unique flavor profiles of beans from Madagascar, Ghana, and Ecuador, we celebrate the true heritage of cocoa.',
  feature1_title: '100% Traceable',
  feature1_desc: 'Direct relationship with farmers to ensure equity.',
  feature2_title: 'Micro-Batch Production',
  feature2_desc: 'Ensuring unmatched precision and quality control.',
  vision_title: 'Our Vision',
  vision_text: 'To establish a global standard for luxury chocolate that elevates the growers, honors the Earth, and transforms chocolate consumption into an art form. We envision a future where chocolate is valued as deeply as fine wine, celebrated for its complex terroir and therapeutic purity.',
  mission_title: 'Our Mission',
  mission_text: 'To curate extraordinary bean-to-bar masterpieces through sustainable direct-trade partnerships, hand-tempered craftsmanship, and transparent sourcing. We dedicate ourselves to continuous culinary innovation, ensuring that every box of Chovique delivers unmatched premium luxury.',
  steps: [
    {
      num: '01',
      title: 'Sourcing & Selection',
      desc: 'Single-origin cocoa beans hand-selected from sustainable farms for their exceptional flavor profiles.',
    },
    {
      num: '02',
      title: 'Roasting & Grinding',
      desc: 'Slow-roasted at precise temperatures to unlock deep, complex flavors and ground into silky smooth cocoa liquor.',
    },
    {
      num: '03',
      title: 'Tempering & Molding',
      desc: 'Hand-tempered for that perfect snap and glossy finish, then molded into our signature creations.',
    },
    {
      num: '04',
      title: 'Finishing & Packaging',
      desc: 'Each piece is inspected, adorned with premium toppings, and nestled into our signature luxury packaging.',
    },
  ],
  values: [
    {
      title: 'Sustainable Sourcing',
      desc: 'We partner directly with family-owned farms, ensuring fair wages, ethical labor, and ecological preservation.',
    },
    {
      title: 'Artisanal Mastery',
      desc: 'Our chocolates are tempered and decorated by hand in small batches by master chocolatiers.',
    },
    {
      title: 'Pure Ingredients',
      desc: 'Zero artificial preservatives, emulsifiers, or palm oil. Only pure cocoa butter, organic sugars, and natural infusions.',
    },
  ],
};

export interface ContactPageConfig {
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  badge_1: string;
  badge_2: string;
  badge_3: string;
  phone: string;
  whatsapp: string;
  email: string;
  support_hours: string;
  address: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export const DEFAULT_CONTACT_PAGE_CONFIG: ContactPageConfig = {
  hero_badge: 'CONTACT US',
  hero_title: "We're Here to Help!",
  hero_subtitle: 'Have questions about your order, our products, or gifting? Our team is here to make your chocolate experience smooth and delightful.',
  hero_image: '/assets/contact-hero.png',
  badge_1: 'Replies within 24 Hours',
  badge_2: 'Dedicated Support',
  badge_3: 'Reliable & Quick Assistance',
  phone: '+91 83098 54870',
  whatsapp: '+91 83098 54870',
  email: 'support@chovique.com',
  support_hours: 'Mon - Sat: 10:00 AM - 8:00 PM | Sunday: 11:00 AM - 6:00 PM',
  address: '42, MG Road, Indiranagar, Bangalore, Karnataka 560038',
  instagram: 'https://instagram.com',
  facebook: 'https://facebook.com',
  twitter: 'https://x.com',
};


export interface OfflineSale {
  id: string;
  receipt_id?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_method?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total_amount?: number;
  status?: string;
  payment_status?: string;
  received_amount?: number;
  receipt_number?: string;
  card_type?: string;
  card_last4?: string;
  transaction_id?: string;
  upi_id?: string;
  bank_name?: string;
  account_holder?: string;
  items?: Array<{
    id: string;
    product_id?: string;
    product_name: string;
    sku?: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
  /** camelCase — matches backend OfflineSaleResponse */
  productName: string;
  quantity: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  total?: number;
  totalPrice?: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  receiptUrl?: string;
}

export interface SupportTicket {
  id: string;
  ticket_number?: string;
  order_id?: string;
  orderId?: string;
  customerId?: string;
  customer_id?: string;
  customerName?: string;
  subject: string;
  category: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Pending' | string;
  messages: Array<{
    id: string;
    sender: 'user' | 'support';
    text: string;
    timestamp: string;
  }>;
  statusChangeCount?: number;
  adminNotes?: string;
  customerResolutionFeedback?: 'Resolved' | 'Not Resolved';
  date: string;
  notified: boolean;
}

export interface CustomerAddress {
  id: string;
  title: string;
  type?: string;
  name: string;
  house_number?: string | null;
  houseNumber?: string | null;
  street: string;
  area?: string | null;
  landmark?: string | null;
  city: string;
  district?: string | null;
  state: string;
  zip: string;
  pincode?: string | null;
  phone: string;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
  formattedAddress?: string | null;
  google_place_id?: string | null;
  googlePlaceId?: string | null;
  location_source?: 'GOOGLE_PLACE' | 'CURRENT_LOCATION' | 'MANUAL' | 'SAVED_ADDRESS' | string;
  locationSource?: string;
  location_verified?: boolean;
  locationVerified?: boolean;
  isDefault: boolean;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// LOGISTICS & SHIPPING DOMAIN TYPES (VERSION 2)
// =============================================================================

export type FulfillmentMode = 'LOCAL' | 'COURIER';

export interface StoreLocation {
  id: string;
  name: string;
  house_number?: string | null;
  street: string;
  area?: string | null;
  city: string;
  district?: string | null;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
  phone?: string | null;
  is_primary: boolean;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryServiceArea {
  id: string;
  store_location_id?: string | null;
  pincode: string;
  city: string;
  district?: string | null;
  state: string;
  delivery_mode: 'LOCAL' | 'COURIER' | 'UNAVAILABLE' | string;
  delivery_charge: number;
  free_delivery_threshold?: number | null;
  same_day_available: boolean;
  estimated_delivery: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  store_location?: StoreLocation | null;
}

export interface ShippingCalculateRequest {
  pincode: string;
  subtotal?: number;
  cart_total?: number;
  city?: string;
  district?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ShippingCalculateResponse {
  serviceable: boolean;
  is_serviceable?: boolean;
  fulfillment_type: 'LOCAL' | 'COURIER';
  fulfillment_mode?: 'LOCAL' | 'COURIER';
  shipping_provider: string;
  delivery_charge: number;
  free_delivery_applied: boolean;
  is_free_delivery?: boolean;
  service_area?: string | null;
  estimated_delivery: string;
  estimated_delivery_text?: string;
  message: string;
  origin_store?: string | null;
  origin_store_id?: string | null;
}

export interface SupportNotification {
  id: string;
  title?: string;
  message?: string;
  text: string;
  date: string;
  read: boolean;
  is_read?: boolean;
  type: 'order' | 'support' | 'reward' | 'coupon' | 'general' | string;
  referenceId?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at?: string;
}

export interface UserCoupon {
  id?: string;
  code: string;
  name?: string;
  description?: string;
  desc?: string;
  coupon_type?: string;
  discount_type?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | string;
  discount_percent?: number;
  discount_amount?: number;
  discountPercent?: number;
  maximum_discount_amount?: number;
  minimum_order_amount?: number;
  start_at?: string;
  expires_at?: string;
  startDate?: string;
  expiryDate?: string;
  start_date?: string;
  expiry_date?: string;
  expiresAt?: string;
  startAt?: string;
  startsAt?: string;
  end_date?: string;
  endDate?: string;
  begin_date?: string;
  beginDate?: string;
  valid_until?: string;
  validUntil?: string;
  valid_from?: string;
  validFrom?: string;
  exp?: string;
  is_active?: boolean;
  status?: string;
}

// =============================================================================
// HOME PAGE TYPES
// =============================================================================

export interface Testimonial {
  id?: string;
  user_id?: string;
  author: string;
  title?: string;
  text: string;
  stars?: number;
  rating?: number;
  initials?: string;
  avatar_url?: string;
  status?: 'pending' | 'approved' | 'rejected';
  is_active?: boolean;
  created_at?: string;
}

export interface HomeStats {
  happy_customers: number;
  products_available: number;
  orders_delivered: number;
  customer_rating_percent: number;
  unique_flavors?: number;
  countries_shipped?: number;
  five_star_reviews_percent?: number;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export interface InstagramReel {
  id: string;
  video_url?: string;
  videoUrl?: string;
  instagram_url?: string;
  instagramUrl?: string;
  account_name?: string;
  accountName?: string;
  likes?: number | string;
  comments?: number | string;
  views?: number | string;
  title?: string;
  is_active?: boolean;
}

export interface HomePageData {
  banners: Banner[];
  featured_products: Product[];
  bestsellers: Product[];
  new_arrivals: Product[];
  testimonials: Testimonial[];
  stats: HomeStats;
  contact: ContactInfo;
}

export interface StoreConfig {
  standard_shipping_charge: number;
  free_shipping_min_order: number;
  gst_rate: number;
  cod_enabled: boolean;
  minimum_order_value: number;
  maximum_cod_order_value: number;
  base_currency: string;
  store_front_name: string;
}


// =============================================================================
// CATEGORY TYPES
// =============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  image_url?: string;
  is_active: boolean;
  sort_order?: number;
}

// =============================================================================
// CHECKOUT / PAYMENT TYPES
// =============================================================================

/** Response from POST /checkout/initiate */
export interface CheckoutInitiateResponse {
  razorpay_order_id: string;
  amount: number;         // in paise (INR * 100)
  currency: string;       // 'INR'
  order_id: string;       // Chovique internal order ID
  key_id: string;         // Razorpay key to use on frontend
}

/** Payload for POST /payments/verify */
export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id: string;       // Chovique internal order ID
}

// =============================================================================
// ADMIN TYPES
// =============================================================================

/** System user record returned from /admin/users */
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  role: 'customer' | 'admin' | 'superadmin';
  avatar_url?: string;
  avatar?: string;
  avatarUrl?: string;
  /** Permissions object — derived from role on the backend */
  permissions: {
    viewAnalytics: boolean;
    manageUsers: boolean;
    configureThemes: boolean;
    exportData: boolean;
  };
}

// =============================================================================
// FORGOT / RESET PASSWORD PAYLOADS
// =============================================================================

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  expires_in?: number;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
}

// =============================================================================
// API REQUEST PAYLOAD TYPES
// =============================================================================

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SendOtpPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
  fullName: string;
  password: string;
}

export interface SendOtpResponse {
  message: string;
  email: string;
  expires_in: number;
}

export interface OrderPayload {
  items?: Array<{
    product_id: string;
    quantity: number;
  }>;
  shipping_address: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  delivery_option: string;
  payment_method: string;
  coupon_code?: string;
  coins_to_use?: number;
}

export interface ProductUpdatePayload {
  name?: string;
  category_id?: string;
  category?: Product['category'];
  price?: number;
  weight?: string;
  stock?: number;
  badge?: Product['badge'];
  description?: string;
  ingredients?: string;
  nutrition?: NutritionInfo;
  is_available?: boolean;
  isAvailable?: boolean;
  is_sample?: boolean;
  isSample?: boolean;
  sample_price?: number;
  samplePrice?: number;
  rating?: number;
}

export interface ProfileUpdatePayload {
  name?: string;
  full_name?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  preferences?: string;
}

export interface CreateTicketPayload {
  category: SupportTicket['category'];
  description: string;
  order_id?: string;
  orderId?: string;
}

export interface TicketFeedbackPayload {
  feedback: 'Resolved' | 'Not Resolved';
}

export interface ResolveTicketPayload {
  admin_notes?: string;
}

export interface OfflineSalePayload {
  product_name: string;
  quantity: number;
  total_price: number;
  payment_method: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/** Auth response from /auth/login, /auth/verify-otp, /auth/google, /auth/set-password.
 *  The backend delivers the JWTs as httpOnly cookies (not readable from JS) —
 *  the JSON body only carries the message and user profile. */
export interface AuthResponse {
  message: string;
  user: User;
  access_token?: string;
  refresh_token?: string;
}

export interface GoogleAuthResponse {
  message: string;
  user: User;
  access_token?: string;
  refresh_token?: string;
  require_otp?: boolean;
  email?: string;
  expires_in?: number;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Coupon validation response from /coupons/validate */
export interface CouponValidationResponse {
  valid: boolean;
  code: string;
  discount_type?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | string;
  /** Percentage discount, e.g. 40 for 40% off */
  discount_percent?: number;
  /** Flat amount discount (₹), if applicable */
  discount_amount?: number;
  maximum_discount_amount?: number;
  calculated_discount?: number;
  message: string;
}

/** Avatar upload response */
export interface AvatarUploadResponse {
  avatar_url: string;
}

/** CSV import response */
export interface ImportSalesResponse {
  imported: number;
  skipped: number;
  message: string;
}

/** Customer details response for admin inspection */
export interface CustomerDetailsResponse {
  user: User;
  total_spent: number;
  total_orders: number;
  recent_orders: Order[];
  support_tickets: SupportTicket[];
}

/** Contact form submission response */
export interface ContactMessageResponse {
  message: string;
}

// =============================================================================
// QUERY PARAM TYPES (used by ShopPage → productService.getProducts)
// =============================================================================

/** Mirrors the ShopPage filter/sort/pagination state for clean API mapping */
export interface ProductQueryParams {
  search?: string;
  category?: string;
  availability?: string;
  price_min?: number;
  price_max?: number;
  min_rating?: number;
  sort?: string;
  page?: number;
  per_page?: number;
}
