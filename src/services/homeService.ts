/**
 * Home Service — landing page content.
 *
 * FastAPI endpoints (all public, no auth required):
 *   GET /home             → HomePageData (aggregated)
 *   GET /home/banners     → Banner[]
 *   GET /home/testimonials → Testimonial[]
 *   GET /home/stats       → HomeStats
 *   GET /home/contact     → ContactInfo
 *   GET /home/reels       → InstagramReel[]
 */

import { apiGet, apiPost } from '../lib/api';
import type { Banner, Testimonial, HomeStats, ContactInfo, InstagramReel, HomePageData, StoreConfig, FooterConfig } from '../types';

export const homeService = {
  /** Aggregated home page data — banners + featured products + testimonials + stats + contact */
  getHomePage: (): Promise<HomePageData> =>
    apiGet<HomePageData>('/home'),

  /** Store configuration (public settings like shipping, tax, etc.) */
  getStoreConfig: (): Promise<StoreConfig> =>
    apiGet<StoreConfig>('/home/store-config'),

  /** Active hero banner slides */
  getBanners: (): Promise<Banner[]> =>
    apiGet<Banner[]>('/home/banners'),

  /** Customer testimonials */
  getTestimonials: (): Promise<Testimonial[]> =>
    apiGet<Testimonial[]>('/home/testimonials'),

  /** Site stats (customers, flavors, countries, rating %) */
  getStats: (): Promise<HomeStats> =>
    apiGet<HomeStats>('/home/stats'),

  /** Contact info (address, phone, email, social links) */
  getContact: (): Promise<ContactInfo> =>
    apiGet<ContactInfo>('/home/contact'),

  /** Theme configuration */
  getTheme: (): Promise<any> =>
    apiGet<any>('/home/theme'),

  /** Instagram-style reels/videos */
  getReels: (): Promise<InstagramReel[]> =>
    apiGet<InstagramReel[]>('/home/reels'),

  /** Customizable landing page sections copy */
  getLandingSections: (): Promise<any> =>
    apiGet<any>('/home/landing-sections'),

  /** Customizable Our Story page config */
  getStoryPageConfig: (): Promise<any> =>
    apiGet<any>('/home/story-page'),

  /** Customizable Contact Us page config */
  getContactPageConfig: (): Promise<any> =>
    apiGet<any>('/home/contact-page'),

  /** Customizable Footer CMS config */
  getFooterConfig: (): Promise<FooterConfig> =>
    apiGet<FooterConfig>('/home/footer-config'),

  /** Submit a customer testimonial (pending admin approval) */
  submitTestimonial: (payload: { author: string; text: string; title?: string; rating?: number }): Promise<Testimonial> =>
    apiPost<Testimonial>('/home/testimonials', payload),
};



