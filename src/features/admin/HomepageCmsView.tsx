import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
  BarChart3,
  Video,
  ArrowRight,
  Sliders,
  Zap,
  Loader2,
  Upload,
  Gem,
  Database,
  RefreshCw,
  Users,
  ShoppingBag,
  Package,
  Star,
  Eye,
  Heart,
  Quote,
  CheckCircle2,
  MessageSquarePlus,
  BookOpen,
  Mail,
  PhoneCall,
  Target,
  Leaf,
  Award,
  Truck,
  Clock,
  ShieldCheck,
  Headphones,
  Globe,
  Share2,
} from 'lucide-react';

const InstagramGradientIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
import { useApp } from '../../app/providers';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getImageUrl } from '../../utils/imageUrl';
import { adminService } from '../../services/adminService';
import { homeService } from '../../services/homeService';
import { renderSocialIcon, renderBenefitIcon } from '../../components/Footer';
import type { Banner, LandingSectionsConfig, InstagramReel, StoryPageConfig, ContactPageConfig, Testimonial, FooterConfig } from '../../types';
import { DEFAULT_LANDING_SECTIONS, DEFAULT_STORY_PAGE_CONFIG, DEFAULT_CONTACT_PAGE_CONFIG, DEFAULT_FOOTER_CONFIG } from '../../types';

interface HomepageCmsViewProps {
  addToast?: (type: any, message: string, title?: string) => void;
  addLogEntry?: (action: string, category?: any) => void;
}

// Preset redirect destination options for banners
export const BANNER_REDIRECT_PRESETS = [
  { label: '🛍️ Shop All Products (/shop)', value: '/shop', defaultCta: 'Explore Collection' },
  { label: '⭐ Popular Products Section (#popular)', value: '#popular', defaultCta: 'View Loved Creations' },
  { label: '🏆 The Bestsellers Section (#best-sellers)', value: '#best-sellers', defaultCta: 'Shop Bestsellers' },
  { label: '✨ New Arrivals Section (#new-arrivals)', value: '#new-arrivals', defaultCta: 'Discover New' },
  { label: '🎁 Luxury Gift Hampers (#luxury-gift-hampers)', value: '#luxury-gift-hampers', defaultCta: 'View Gift Sets' },
  { label: '🍫 Boutique Collection (#store)', value: '#store', defaultCta: 'Explore Boutique' },
  { label: '💬 Customer Reviews (#reviews)', value: '#reviews', defaultCta: 'Read Customer Love' },
  { label: '📱 Instagram Reels & Stories (#instagram-reels)', value: '#instagram-reels', defaultCta: 'Watch Stories' },
  { label: '📖 Our Story & Crafting Process (/our-story)', value: '/our-story', defaultCta: 'Our Artisanal Story' },
  { label: '✉️ Contact Us Page (/contact)', value: '/contact', defaultCta: 'Contact Us' },
  { label: '🏷️ Categories Page (/categories)', value: '/categories', defaultCta: 'Browse Categories' },
  { label: '🔗 Custom URL / Route...', value: 'custom', defaultCta: 'Learn More' },
];

export const HomepageCmsView: React.FC<HomepageCmsViewProps> = ({ addToast, addLogEntry }) => {
  const {
    banners,
    updateBanner,
    refreshBanners,
    addBanner,
    deleteBannerState,
    landingSections,
    updateLandingSections,
    products,
    footerConfig,
    updateFooterConfigState,
    refreshFooterConfig,
  } = useApp();

  // Active sub-tab inside Website CMS: 'banners' | 'sections' | 'story' | 'contact' | 'stats' | 'reels' | 'footer'
  const [cmsTab, setCmsTab] = useState<'banners' | 'sections' | 'story' | 'contact' | 'stats' | 'reels' | 'footer'>('banners');

  // Mobile viewport detection for responsive tab layout
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Footer CMS State ---
  const [footerForm, setFooterForm] = useState<FooterConfig>(() => ({
    ...DEFAULT_FOOTER_CONFIG,
    ...(footerConfig || {}),
  }));
  const [isSavingFooter, setIsSavingFooter] = useState(false);
  const [footerSaveSuccess, setFooterSaveSuccess] = useState(false);
  const [activeFooterSubTab, setActiveFooterSubTab] = useState<'social' | 'brand' | 'nav' | 'benefits' | 'legal'>('social');

  // New social link input state
  const [newSocialPlatform, setNewSocialPlatform] = useState('instagram');
  const [newSocialName, setNewSocialName] = useState('Instagram');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  // Sync footer form when footerConfig changes
  useEffect(() => {
    if (footerConfig) {
      setFooterForm({
        ...DEFAULT_FOOTER_CONFIG,
        ...footerConfig,
        social_links: Array.isArray(footerConfig.social_links) ? footerConfig.social_links : DEFAULT_FOOTER_CONFIG.social_links,
        nav_columns: Array.isArray(footerConfig.nav_columns) ? footerConfig.nav_columns : DEFAULT_FOOTER_CONFIG.nav_columns,
        concierge: footerConfig.concierge ? { ...DEFAULT_FOOTER_CONFIG.concierge, ...footerConfig.concierge } : DEFAULT_FOOTER_CONFIG.concierge,
        benefits: Array.isArray(footerConfig.benefits) ? footerConfig.benefits : DEFAULT_FOOTER_CONFIG.benefits,
        legal_links: Array.isArray(footerConfig.legal_links) ? footerConfig.legal_links : DEFAULT_FOOTER_CONFIG.legal_links,
        payment_badges: Array.isArray(footerConfig.payment_badges) ? footerConfig.payment_badges : DEFAULT_FOOTER_CONFIG.payment_badges,
      });
    }
  }, [footerConfig]);

  // Handle save footer config
  const handleSaveFooter = async () => {
    setIsSavingFooter(true);
    try {
      await adminService.updateFooterConfig(footerForm);
      updateFooterConfigState(footerForm);
      if (refreshFooterConfig) await refreshFooterConfig();
      setFooterSaveSuccess(true);
      setTimeout(() => setFooterSaveSuccess(false), 3000);
      if (addToast) {
        addToast('success', 'Footer content saved and updated live across the entire store!', 'Footer CMS Saved');
      }
      if (addLogEntry) {
        addLogEntry('Updated Website Footer content management configuration', 'setting');
      }
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to save footer configuration.';
      if (addToast) addToast('error', msg, 'Save Failed');
    } finally {
      setIsSavingFooter(false);
    }
  };

  // Handle reset footer to defaults
  const handleResetFooter = () => {
    if (!window.confirm('Reset all footer configuration back to default values?')) return;
    setFooterForm(JSON.parse(JSON.stringify(DEFAULT_FOOTER_CONFIG)));
    if (addToast) addToast('info', 'Footer reset to default copy. Click "Save Changes" to publish.', 'Reset Footer');
  };


  // --- Our Story Page State ---
  const [storyForm, setStoryForm] = useState<StoryPageConfig>(DEFAULT_STORY_PAGE_CONFIG);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [storySaveSuccess, setStorySaveSuccess] = useState(false);
  const [activeStorySubTab, setActiveStorySubTab] = useState<'hero' | 'story' | 'vision' | 'steps' | 'values'>('hero');

  // --- Contact Page State ---
  const [contactForm, setContactForm] = useState<ContactPageConfig>(DEFAULT_CONTACT_PAGE_CONFIG);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveSuccess, setContactSaveSuccess] = useState(false);
  const [activeContactSubTab, setActiveContactSubTab] = useState<'hero' | 'channels' | 'social'>('hero');

  // --- Banner State ---
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const selectedBanner = banners && banners.length > 0 ? (banners[selectedSlideIdx] || banners[0]) : null;

  // Add Banner Modal
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [newBannerData, setNewBannerData] = useState({
    title: '',
    subtitle: '',
    tag: '',
    buttonText: 'Explore Collection',
    link: '/shop',
    image_url: '',
  });
  const [newBannerLinkPreset, setNewBannerLinkPreset] = useState('/shop');
  const [newBannerImageFile, setNewBannerImageFile] = useState<File | null>(null);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [bannerCreateError, setBannerCreateError] = useState('');
  const newBannerFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Banner Modal
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editBannerData, setEditBannerData] = useState({
    title: '',
    subtitle: '',
    tag: '',
    buttonText: '',
    link: '',
  });
  const [editBannerLinkPreset, setEditBannerLinkPreset] = useState('/shop');
  const [editBannerImageFile, setEditBannerImageFile] = useState<File | null>(null);
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);
  const [editBannerError, setEditBannerError] = useState('');
  const editBannerFileInputRef = useRef<HTMLInputElement>(null);

  // --- Landing Sections State ---
  const [sectionsForm, setSectionsForm] = useState<LandingSectionsConfig>(() => ({
    tasteSample: { ...DEFAULT_LANDING_SECTIONS.tasteSample, ...(landingSections?.tasteSample || {}) },
    popularProducts: { ...DEFAULT_LANDING_SECTIONS.popularProducts, ...(landingSections?.popularProducts || {}) },
    bestsellersNewArrivals: {
      header: { ...DEFAULT_LANDING_SECTIONS.bestsellersNewArrivals.header, ...(landingSections?.bestsellersNewArrivals?.header || {}) },
      bestsellersPart: { ...DEFAULT_LANDING_SECTIONS.bestsellersNewArrivals.bestsellersPart, ...(landingSections?.bestsellersNewArrivals?.bestsellersPart || {}) },
      newArrivalsPart: { ...DEFAULT_LANDING_SECTIONS.bestsellersNewArrivals.newArrivalsPart, ...(landingSections?.bestsellersNewArrivals?.newArrivalsPart || {}) },
    },
    giftHampers: { ...DEFAULT_LANDING_SECTIONS.giftHampers, ...(landingSections?.giftHampers || {}) },
    boutique: { ...DEFAULT_LANDING_SECTIONS.boutique, ...(landingSections?.boutique || {}) },
    reviews: { ...DEFAULT_LANDING_SECTIONS.reviews, ...(landingSections?.reviews || {}) },
    instagramReels: { ...DEFAULT_LANDING_SECTIONS.instagramReels, ...(landingSections?.instagramReels || {}) },
  }));

  const [activeSectionSubTab, setActiveSectionSubTab] = useState<'tasteSample' | 'popular' | 'bestsellers' | 'gifts' | 'boutique' | 'reviews' | 'reels'>('tasteSample');
  const [isSavingSections, setIsSavingSections] = useState(false);
  const [sectionsSaveSuccess, setSectionsSaveSuccess] = useState(false);

  // Sync sections form whenever landingSections changes from backend
  useEffect(() => {
    if (landingSections) {
      setSectionsForm({
        tasteSample: { ...DEFAULT_LANDING_SECTIONS.tasteSample, ...(landingSections.tasteSample || {}) },
        popularProducts: { ...DEFAULT_LANDING_SECTIONS.popularProducts, ...(landingSections.popularProducts || {}) },
        bestsellersNewArrivals: {
          header: { ...DEFAULT_LANDING_SECTIONS.bestsellersNewArrivals.header, ...(landingSections.bestsellersNewArrivals?.header || {}) },
          bestsellersPart: { ...DEFAULT_LANDING_SECTIONS.bestsellersNewArrivals.bestsellersPart, ...(landingSections.bestsellersNewArrivals?.bestsellersPart || {}) },
          newArrivalsPart: { ...DEFAULT_LANDING_SECTIONS.bestsellersNewArrivals.newArrivalsPart, ...(landingSections.bestsellersNewArrivals?.newArrivalsPart || {}) },
        },
        giftHampers: { ...DEFAULT_LANDING_SECTIONS.giftHampers, ...(landingSections.giftHampers || {}) },
        boutique: { ...DEFAULT_LANDING_SECTIONS.boutique, ...(landingSections.boutique || {}) },
        reviews: { ...DEFAULT_LANDING_SECTIONS.reviews, ...(landingSections.reviews || {}) },
        instagramReels: { ...DEFAULT_LANDING_SECTIONS.instagramReels, ...(landingSections.instagramReels || {}) },
      });
    }
  }, [landingSections]);

  // --- Site Stats State ---
  const [siteStats, setSiteStats] = useState({
    happy_customers: 50000,
    unique_flavors: 120,
    countries_shipped: 15,
    five_star_reviews_percent: 98,
  });
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [statsSavedSuccess, setStatsSavedSuccess] = useState(false);
  const [isFetchingDbStats, setIsFetchingDbStats] = useState(false);
  const [dbStatsSnapshot, setDbStatsSnapshot] = useState<{
    happy_customers: number;
    unique_flavors: number;
    countries_shipped: number;
    five_star_reviews_percent: number;
    total_orders?: number;
  } | null>(null);

  useEffect(() => {
    homeService.getStats()
      .then((data) => {
        if (data) {
          setSiteStats({
            happy_customers: data.happy_customers || 50000,
            unique_flavors: data.unique_flavors || 120,
            countries_shipped: data.countries_shipped || 15,
            five_star_reviews_percent: data.five_star_reviews_percent || 98,
          });
        }
      })
      .catch((err) => console.error('Failed to load site stats:', err));

    // Fetch initial DB counts for preview badges
    adminService.fetchLiveDbStats()
      .then((data) => {
        if (data) {
          setDbStatsSnapshot({
            happy_customers: data.happy_customers ?? 0,
            unique_flavors: data.products_available ?? data.unique_flavors ?? 0,
            countries_shipped: data.orders_delivered ?? data.countries_shipped ?? 0,
            five_star_reviews_percent: data.customer_rating_percent ?? data.five_star_reviews_percent ?? 98,
            total_orders: data.total_orders,
          });
        }
      })
      .catch(() => {});

    // Load Our Story and Contact Page configs
    homeService.getStoryPageConfig()
      .then((data) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setStoryForm((prev) => ({
            ...prev,
            ...data,
            steps: Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : prev.steps,
            values: Array.isArray(data.values) && data.values.length > 0 ? data.values : prev.values,
          }));
        }
      })
      .catch((err) => console.error('Failed to load story page config:', err));

    homeService.getContactPageConfig()
      .then((data) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setContactForm((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => console.error('Failed to load contact page config:', err));
  }, []);

  const handleSaveStoryPage = async () => {
    setIsSavingStory(true);
    try {
      await adminService.updateStoryPageConfig(storyForm);
      setStorySaveSuccess(true);
      setTimeout(() => setStorySaveSuccess(false), 3000);
      if (addToast) {
        addToast('success', 'Our Story page content saved and live!', 'Our Story Updated');
      }
      if (addLogEntry) {
        addLogEntry('Updated Our Story page customizable narrative and process', 'setting');
      }
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to save Our Story page.';
      if (addToast) addToast('error', msg, 'Save Failed');
    } finally {
      setIsSavingStory(false);
    }
  };

  const handleSaveContactPage = async () => {
    setIsSavingContact(true);
    try {
      await adminService.updateContactPageConfig(contactForm);
      setContactSaveSuccess(true);
      setTimeout(() => setContactSaveSuccess(false), 3000);
      if (addToast) {
        addToast('success', 'Contact Us page details saved and live!', 'Contact Updated');
      }
      if (addLogEntry) {
        addLogEntry('Updated Contact Us page helpline, address, and channels', 'setting');
      }
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to save Contact Us page.';
      if (addToast) addToast('error', msg, 'Save Failed');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Media upload & reset states for Our Story and Contact Us
  const [isUploadingStoryHeroImage, setIsUploadingStoryHeroImage] = useState(false);
  const [isUploadingStoryVideo, setIsUploadingStoryVideo] = useState(false);
  const [isUploadingContactHeroImage, setIsUploadingContactHeroImage] = useState(false);
  const [storyVideoFetchSuccess, setStoryVideoFetchSuccess] = useState(false);
  const [storyImageFetchSuccess, setStoryImageFetchSuccess] = useState(false);
  const [contactImageFetchSuccess, setContactImageFetchSuccess] = useState(false);

  // Hidden file input refs
  const storyHeroImageInputRef = useRef<HTMLInputElement>(null);
  const storyVideoInputRef = useRef<HTMLInputElement>(null);
  const contactHeroImageInputRef = useRef<HTMLInputElement>(null);

  // Reset Our Story to default
  const handleResetStoryToDefaults = () => {
    if (!window.confirm('Reset Our Story page content to default original values?')) return;
    setStoryForm(JSON.parse(JSON.stringify(DEFAULT_STORY_PAGE_CONFIG)));
    if (addToast) addToast('info', 'Our Story reset to default values. Click "Save & Publish" to update live.', 'Reset Story');
  };

  // Reset Contact Us to default
  const handleResetContactToDefaults = () => {
    if (!window.confirm('Reset Contact Us page content to default original values?')) return;
    setContactForm(JSON.parse(JSON.stringify(DEFAULT_CONTACT_PAGE_CONFIG)));
    if (addToast) addToast('info', 'Contact details reset to default values. Click "Save & Publish" to update live.', 'Reset Contact');
  };

  // Reset Live Stats to default
  const handleResetStatsToDefaults = () => {
    if (!window.confirm('Reset Homepage Counter Numbers to default values?')) return;
    setSiteStats({
      happy_customers: 50000,
      unique_flavors: 120,
      countries_shipped: 15,
      five_star_reviews_percent: 98,
    });
    if (addToast) addToast('info', 'Homepage counter stats reset to default values. Click "Save & Publish" below to update live.', 'Reset Stats');
  };

  // Upload Story Hero Image to Cloud / S3 Bucket
  const handleUploadStoryHeroImage = async (file: File) => {
    setIsUploadingStoryHeroImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await adminService.uploadCmsImage(fd);
      if (res?.image_url) {
        setStoryForm((prev) => ({ ...prev, hero_image: res.image_url }));
        setStoryImageFetchSuccess(true);
        setTimeout(() => setStoryImageFetchSuccess(false), 3000);
        if (addToast) addToast('success', 'Our Story hero image uploaded to cloud storage successfully!', 'Image Uploaded');
      }
    } catch (err: any) {
      console.error('Failed to upload story hero image:', err);
      const msg = err?.detail || err?.message || 'Failed to upload image to bucket.';
      if (addToast) addToast('error', msg, 'Upload Error');
    } finally {
      setIsUploadingStoryHeroImage(false);
    }
  };

  // Upload Story Video to Cloud / S3 Bucket
  const handleUploadStoryVideo = async (file: File) => {
    setIsUploadingStoryVideo(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      const res = await adminService.uploadCmsVideo(fd);
      if (res?.video_url) {
        setStoryForm((prev) => ({ ...prev, video_url: res.video_url }));
        setStoryVideoFetchSuccess(true);
        setTimeout(() => setStoryVideoFetchSuccess(false), 3000);
        if (addToast) addToast('success', 'Our Story crafting video uploaded to cloud storage bucket!', 'Video Uploaded');
      }
    } catch (err: any) {
      console.error('Failed to upload story video:', err);
      const msg = err?.detail || err?.message || 'Failed to upload video to bucket.';
      if (addToast) addToast('error', msg, 'Upload Error');
    } finally {
      setIsUploadingStoryVideo(false);
    }
  };

  // Upload Contact Hero Image to Cloud / S3 Bucket
  const handleUploadContactHeroImage = async (file: File) => {
    setIsUploadingContactHeroImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await adminService.uploadCmsImage(fd);
      if (res?.image_url) {
        setContactForm((prev) => ({ ...prev, hero_image: res.image_url }));
        setContactImageFetchSuccess(true);
        setTimeout(() => setContactImageFetchSuccess(false), 3000);
        if (addToast) addToast('success', 'Contact hero image uploaded to cloud storage successfully!', 'Image Uploaded');
      }
    } catch (err: any) {
      console.error('Failed to upload contact hero image:', err);
      const msg = err?.detail || err?.message || 'Failed to upload image to bucket.';
      if (addToast) addToast('error', msg, 'Upload Error');
    } finally {
      setIsUploadingContactHeroImage(false);
    }
  };

  // --- Instagram Reels State ---
  const [cmsReels, setCmsReels] = useState<InstagramReel[]>([]);
  const [showAddReelModal, setShowAddReelModal] = useState(false);
  const [addReelTab, setAddReelTab] = useState<'url' | 'upload'>('url');
  const [addReelUrl, setAddReelUrl] = useState('');
  const [isFetchingAddReel, setIsFetchingAddReel] = useState(false);
  const [addReelMeta, setAddReelMeta] = useState<{ account_name: string; video_url: string | null; instagram_url: string; shortcode: string } | null>(null);
  const [addReelCaption, setAddReelCaption] = useState('');
  const [addReelAccount, setAddReelAccount] = useState('');
  const [addReelVideoFile, setAddReelVideoFile] = useState<File | null>(null);
  const [addReelVideoFilePreview, setAddReelVideoFilePreview] = useState<string | null>(null);
  const [addReelError, setAddReelError] = useState('');
  const [addReelSuccess, setAddReelSuccess] = useState('');
  const [isPublishingReel, setIsPublishingReel] = useState(false);

  // Edit Reel Modal State
  const [editingReel, setEditingReel] = useState<InstagramReel | null>(null);
  const [editReelUrl, setEditReelUrl] = useState('');
  const [isFetchingEditReel, setIsFetchingEditReel] = useState(false);
  const [editReelMeta, setEditReelMeta] = useState<{ account_name: string; video_url: string | null; instagram_url: string; shortcode: string } | null>(null);
  const [editReelCaption, setEditReelCaption] = useState('');
  const [editReelAccount, setEditReelAccount] = useState('');
  const [editReelVideoFile, setEditReelVideoFile] = useState<File | null>(null);
  const [editReelVideoFilePreview, setEditReelVideoFilePreview] = useState<string | null>(null);
  const [editReelError, setEditReelError] = useState('');
  const [editReelSuccess, setEditReelSuccess] = useState('');
  const [isUpdatingReel, setIsUpdatingReel] = useState(false);
  const [cmsTestimonials, setCmsTestimonials] = useState<Testimonial[]>([]);

  const handleAddReelFileChange = (file: File | null) => {
    setAddReelVideoFile(file);
    if (addReelVideoFilePreview) {
      URL.revokeObjectURL(addReelVideoFilePreview);
    }
    if (file) {
      setAddReelVideoFilePreview(URL.createObjectURL(file));
      setAddReelError('');
      setAddReelSuccess(`Selected video file: ${file.name}`);
    } else {
      setAddReelVideoFilePreview(null);
    }
  };

  const handleEditReelFileChange = (file: File | null) => {
    setEditReelVideoFile(file);
    if (editReelVideoFilePreview) {
      URL.revokeObjectURL(editReelVideoFilePreview);
    }
    if (file) {
      setEditReelVideoFilePreview(URL.createObjectURL(file));
      setEditReelError('');
      setEditReelSuccess(`Selected replacement video: ${file.name}`);
    } else {
      setEditReelVideoFilePreview(null);
    }
  };

  const handleFetchAddReel = async () => {
    const trimmed = addReelUrl.trim();
    if (!trimmed) {
      setAddReelError('Please enter a valid Instagram Reel URL.');
      return;
    }
    setIsFetchingAddReel(true);
    setAddReelError('');
    setAddReelSuccess('');
    try {
      const meta = await adminService.fetchReelMeta(trimmed);
      setAddReelMeta(meta);
      setAddReelSuccess(`Found reel video for ${meta.account_name || 'creator'}! Ready to publish.`);
      if (meta.account_name) {
        setAddReelAccount(meta.account_name);
      }
      if (!addReelCaption && meta.account_name) {
        setAddReelCaption(`Crafted by ${meta.account_name}`);
      }
    } catch (err: any) {
      setAddReelError(err?.detail || err?.message || 'Failed to fetch reel video from Instagram URL.');
    } finally {
      setIsFetchingAddReel(false);
    }
  };

  const handlePublishReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addReelTab === 'url' && !addReelMeta && !addReelUrl.trim()) {
      setAddReelError('Please enter and fetch an Instagram Reel URL first.');
      return;
    }
    if (addReelTab === 'upload' && !addReelVideoFile) {
      setAddReelError('Please choose a video file to upload.');
      return;
    }
    setIsPublishingReel(true);
    setAddReelError('');
    try {
      const fd = new FormData();
      const finalUrl = addReelMeta?.instagram_url || addReelUrl.trim();
      const finalVid = addReelMeta?.video_url || '';
      const finalAccount = addReelAccount.trim() || addReelMeta?.account_name || '@choviqueofficial';
      const finalTitle = addReelCaption.trim() || finalAccount || 'Instagram Reel';

      fd.append('title', finalTitle);
      if (finalUrl) fd.append('instagram_url', finalUrl);
      if (finalVid && !addReelVideoFile) fd.append('video_url', finalVid);
      if (addReelVideoFile) fd.append('video', addReelVideoFile);
      fd.append('account_name', finalAccount);
      fd.append('likes', '0');
      fd.append('comments', '0');
      fd.append('views', '0 views');
      fd.append('is_active', 'true');

      await adminService.createReel(fd);
      fetchCmsReels();
      setShowAddReelModal(false);
      setAddReelUrl('');
      setAddReelMeta(null);
      setAddReelCaption('');
      setAddReelAccount('');
      handleAddReelFileChange(null);
      setAddReelSuccess('');
      setAddReelError('');
      if (addToast) addToast('success', 'Instagram reel added and published successfully!', 'Reel Published');
      if (addLogEntry) addLogEntry(`Added new Instagram reel: ${finalTitle}`, 'setting');
    } catch (err: any) {
      setAddReelError(err?.detail || err?.message || 'Failed to publish reel.');
    } finally {
      setIsPublishingReel(false);
    }
  };

  const handleOpenEditReel = (reel: InstagramReel) => {
    setEditingReel(reel);
    setEditReelUrl(reel.instagramUrl || reel.videoUrl || '');
    setEditReelCaption(reel.title || '');
    setEditReelAccount(reel.accountName || '');
    setEditReelMeta(reel.videoUrl ? {
      account_name: reel.accountName || '',
      video_url: reel.videoUrl,
      instagram_url: reel.instagramUrl || '',
      shortcode: '',
    } : null);
    handleEditReelFileChange(null);
    setEditReelError('');
    setEditReelSuccess('');
  };

  const handleFetchEditReel = async () => {
    const trimmed = editReelUrl.trim();
    if (!trimmed) {
      setEditReelError('Please enter a valid Instagram Reel URL.');
      return;
    }
    setIsFetchingEditReel(true);
    setEditReelError('');
    setEditReelSuccess('');
    try {
      const meta = await adminService.fetchReelMeta(trimmed);
      setEditReelMeta(meta);
      if (meta.account_name) setEditReelAccount(meta.account_name);
      setEditReelSuccess(`Refreshed reel video from Instagram! Ready to save.`);
    } catch (err: any) {
      setEditReelError(err?.detail || err?.message || 'Failed to fetch reel video from Instagram URL.');
    } finally {
      setIsFetchingEditReel(false);
    }
  };

  const handleSaveEditReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReel) return;
    setIsUpdatingReel(true);
    setEditReelError('');
    try {
      const fd = new FormData();
      const finalUrl = editReelMeta?.instagram_url || editReelUrl.trim();
      const finalVid = editReelMeta?.video_url || editingReel.videoUrl || '';
      const finalAccount = editReelAccount.trim() || editReelMeta?.account_name || editingReel.accountName || '@choviqueofficial';
      const finalTitle = editReelCaption.trim() || editingReel.title || finalAccount || 'Instagram Reel';

      fd.append('title', finalTitle);
      if (finalUrl) fd.append('instagram_url', finalUrl);
      if (finalVid && !editReelVideoFile) fd.append('video_url', finalVid);
      if (editReelVideoFile) fd.append('video', editReelVideoFile);
      if (finalAccount) fd.append('account_name', finalAccount);
      fd.append('likes', '0');
      fd.append('comments', '0');
      fd.append('views', '0 views');

      await adminService.updateReel(editingReel.id, fd);
      fetchCmsReels();
      setEditingReel(null);
      handleEditReelFileChange(null);
      if (addToast) addToast('success', 'Instagram reel updated successfully!', 'Reel Updated');
      if (addLogEntry) addLogEntry(`Updated Instagram reel: ${finalTitle}`, 'setting');
    } catch (err: any) {
      setEditReelError(err?.detail || err?.message || 'Failed to update reel.');
    } finally {
      setIsUpdatingReel(false);
    }
  };

  const fetchCmsReels = () => {
    homeService.getReels()
      .then((data) => {
        if (Array.isArray(data)) setCmsReels(data);
      })
      .catch((err) => console.error('Failed to load reels:', err));
  };

  const fetchCmsTestimonials = () => {
    homeService.getTestimonials()
      .then((data) => {
        if (Array.isArray(data)) setCmsTestimonials(data);
      })
      .catch((err) => console.error('Failed to load testimonials:', err));
  };

  useEffect(() => {
    fetchCmsReels();
    fetchCmsTestimonials();
  }, []);

  // Open Edit Banner Modal & populate data
  const handleOpenEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setEditBannerData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      tag: banner.tag || '',
      buttonText: banner.buttonText || '',
      link: banner.link || '/shop',
    });
    setEditBannerImageFile(null);
    setEditBannerError('');

    // Detect preset dropdown value
    const match = BANNER_REDIRECT_PRESETS.find((p) => p.value === banner.link);
    setEditBannerLinkPreset(match ? match.value : 'custom');
  };

  // Save Banner Edit
  const handleSaveBannerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    if (!editBannerData.title.trim()) {
      setEditBannerError('Banner title is required.');
      return;
    }

    setIsUpdatingBanner(true);
    setEditBannerError('');

    try {
      let updatedImage = editingBanner.image;

      // 1. If a new image was chosen, upload to storage first
      if (editBannerImageFile) {
        const formData = new FormData();
        formData.append('image', editBannerImageFile);
        const imgRes = await adminService.uploadBannerImage(editingBanner.id, formData);
        if (imgRes && imgRes.image_url) {
          updatedImage = imgRes.image_url;
        }
      }

      const payload: any = {
        title: editBannerData.title.trim(),
        subtitle: editBannerData.subtitle.trim(),
        tag: editBannerData.tag.trim(),
        button_text: editBannerData.buttonText.trim() || 'Explore Collection',
        link: editBannerData.link.trim() || '/shop',
        image: updatedImage,
      };

      // 2. Update fields in backend
      await adminService.updateBanner(editingBanner.id, payload);

      // 3. Immediately refresh global state from backend
      if (refreshBanners) {
        await refreshBanners();
      }

      if (addToast) {
        addToast('success', `Banner "${editBannerData.title}" updated successfully!`, 'Banner Saved');
      }
      if (addLogEntry) {
        addLogEntry(`Updated banner slide: "${editBannerData.title}"`, 'setting');
      }

      setEditingBanner(null);
      setEditBannerImageFile(null);
    } catch (err: any) {
      console.error('Failed to update banner:', err);
      const msg = err?.detail || err?.message || 'Failed to update banner.';
      setEditBannerError(msg);
      if (addToast) addToast('error', msg, 'Update Failed');
    } finally {
      setIsUpdatingBanner(false);
    }
  };

  // Create brand new banner hero slide
  const handleCreateNewBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerData.title.trim()) {
      setBannerCreateError('Please enter a heading/title for the banner slide.');
      return;
    }
    setIsCreatingBanner(true);
    setBannerCreateError('');

    try {
      const formData = new FormData();
      formData.append('title', newBannerData.title.trim());
      formData.append('subtitle', newBannerData.subtitle.trim() || '');
      formData.append('tag', newBannerData.tag.trim() || '');
      formData.append('button_text', newBannerData.buttonText.trim() || 'Explore Collection');
      formData.append('link', newBannerData.link.trim() || '/shop');

      if (newBannerImageFile) {
        formData.append('image', newBannerImageFile);
      } else if (newBannerData.image_url) {
        formData.append('image_url', newBannerData.image_url.trim());
      }

      const created = await adminService.createBanner(formData);
      if (addBanner) addBanner(created);
      if (refreshBanners) await refreshBanners();

      if (addToast) {
        addToast('success', `New banner "${created.title}" published!`, 'Banner Created');
      }
      if (addLogEntry) {
        addLogEntry(`Created new banner hero slide: "${created.title}"`, 'setting');
      }

      setNewBannerData({
        title: '',
        subtitle: '',
        tag: '',
        buttonText: 'Explore Collection',
        link: '/shop',
        image_url: '',
      });
      setNewBannerLinkPreset('/shop');
      setNewBannerImageFile(null);
      setShowAddBannerModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create banner slide.';
      setBannerCreateError(msg);
      if (addToast) addToast('error', msg, 'Create Failed');
    } finally {
      setIsCreatingBanner(false);
    }
  };

  // Delete hero banner slide
  const handleDeleteBanner = async (bannerId: string, bannerTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete banner "${bannerTitle}"?`)) return;
    try {
      await adminService.deleteBanner(bannerId);
      if (deleteBannerState) deleteBannerState(bannerId);
      if (refreshBanners) await refreshBanners();
      if (selectedSlideIdx >= Math.max(0, (banners?.length || 1) - 1)) {
        setSelectedSlideIdx(Math.max(0, (banners?.length || 1) - 2));
      }
      if (addToast) addToast('success', `Banner "${bannerTitle}" deleted.`, 'Banner Removed');
      if (addLogEntry) addLogEntry(`Deleted banner slide: "${bannerTitle}"`, 'setting');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete banner.';
      alert(msg);
    }
  };

  // Save all Landing Page section copy
  const handleSaveLandingSections = async () => {
    setIsSavingSections(true);
    try {
      await updateLandingSections(sectionsForm);
      setSectionsSaveSuccess(true);
      setTimeout(() => setSectionsSaveSuccess(false), 3500);
      if (addToast) {
        addToast('success', 'All landing page section texts saved and updated live!', 'Sections Updated');
      }
      if (addLogEntry) {
        addLogEntry('Updated landing page section titles and copy', 'setting');
      }
    } catch (err: any) {
      console.error('Failed to save landing sections:', err);
      const msg = err?.detail || err?.message || 'Failed to save sections.';
      if (addToast) addToast('error', msg, 'Save Error');
    } finally {
      setIsSavingSections(false);
    }
  };

  // Reset a section to defaults
  const handleResetSection = (sectionKey: keyof LandingSectionsConfig) => {
    if (!window.confirm(`Reset "${sectionKey}" section text to original default copy?`)) return;
    setSectionsForm((prev) => ({
      ...prev,
      [sectionKey]: JSON.parse(JSON.stringify(DEFAULT_LANDING_SECTIONS[sectionKey])),
    }));
    if (addToast) addToast('info', `Reset "${sectionKey}" to defaults. Click "Save Changes" to publish.`, 'Reset');
  };

  // Save site stats
  const handleSaveSiteStats = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingStats(true);
    try {
      const payload = {
        happy_customers: Number(siteStats.happy_customers || 0),
        products_available: Number(siteStats.unique_flavors || 0),
        orders_delivered: Number(siteStats.countries_shipped || 0),
        customer_rating_percent: Number(siteStats.five_star_reviews_percent || 0),
        unique_flavors: Number(siteStats.unique_flavors || 0),
        countries_shipped: Number(siteStats.countries_shipped || 0),
        five_star_reviews_percent: Number(siteStats.five_star_reviews_percent || 0),
      };
      await adminService.updateSiteStats(payload);
      setStatsSavedSuccess(true);
      setTimeout(() => setStatsSavedSuccess(false), 3000);
      if (addToast) addToast('success', 'Homepage metrics updated successfully and published live.', 'Stats Saved');
      if (addLogEntry) addLogEntry('Saved updated homepage counter targets', 'setting');
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to save site stats.';
      if (addToast) addToast('error', msg, 'Stats Error');
    } finally {
      setIsSavingStats(false);
    }
  };

  // Fetch real-time metrics directly from database
  const handleFetchFromDatabase = async () => {
    setIsFetchingDbStats(true);
    try {
      const data = await adminService.fetchLiveDbStats();
      if (data) {
        const snapshot = {
          happy_customers: data.happy_customers ?? 0,
          unique_flavors: data.products_available ?? data.unique_flavors ?? 0,
          countries_shipped: data.orders_delivered ?? data.countries_shipped ?? 0,
          five_star_reviews_percent: data.customer_rating_percent ?? data.five_star_reviews_percent ?? 98,
          total_orders: data.total_orders,
        };
        setDbStatsSnapshot(snapshot);
        setSiteStats({
          happy_customers: snapshot.happy_customers,
          unique_flavors: snapshot.unique_flavors,
          countries_shipped: snapshot.countries_shipped,
          five_star_reviews_percent: snapshot.five_star_reviews_percent,
        });
        if (addToast) {
          addToast(
            'success',
            `Live database counts loaded! (${snapshot.happy_customers} customers, ${snapshot.unique_flavors} active products, ${snapshot.countries_shipped} delivered orders, ${snapshot.five_star_reviews_percent}% customer rating).`,
            'Database Metrics Fetched'
          );
        }
        if (addLogEntry) {
          addLogEntry('Fetched live metric counts from PostgreSQL database', 'setting');
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch stats from database:', err);
      const msg = err?.detail || err?.message || 'Could not fetch database metrics.';
      if (addToast) addToast('error', msg, 'Database Fetch Error');
    } finally {
      setIsFetchingDbStats(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="section-label">Website Content Management</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)', margin: '4px 0 0 0', lineHeight: 1.2 }}>
            Website CMS
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--beige)', fontSize: '0.9rem' }}>
            Fully customize hero banners, landing page sections, brand story narrative, contact channels, live metrics, and media across the store.
          </p>
        </div>
      </div>

      {/* Main CMS Navigation Tabs — Single line on desktop, clean wrapped grid on mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(7, minmax(0, 1fr))',
          gap: '8px',
          background: 'rgba(26, 16, 10, 0.85)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '12px',
          padding: '6px',
          marginBottom: '28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
          width: '100%',
        }}
      >
        <button
          onClick={() => setCmsTab('banners')}
          style={{
            background: cmsTab === 'banners' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.18) 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: cmsTab === 'banners' ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: cmsTab === 'banners' ? 'var(--gold)' : '#ffffff',
            boxShadow: cmsTab === 'banners' ? '0 4px 14px rgba(212, 175, 55, 0.25)' : 'none',
            padding: '10px 8px',
            borderRadius: '8px',
            fontWeight: cmsTab === 'banners' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Image size={15} color={cmsTab === 'banners' ? 'var(--gold)' : 'var(--cream)'} />
          <span>Hero Banners ({banners?.length || 0})</span>
        </button>

        <button
          onClick={() => setCmsTab('sections')}
          style={{
            background: cmsTab === 'sections' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.18) 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: cmsTab === 'sections' ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: cmsTab === 'sections' ? 'var(--gold)' : '#ffffff',
            boxShadow: cmsTab === 'sections' ? '0 4px 14px rgba(212, 175, 55, 0.25)' : 'none',
            padding: '10px 8px',
            borderRadius: '8px',
            fontWeight: cmsTab === 'sections' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Layers size={15} color={cmsTab === 'sections' ? 'var(--gold)' : 'var(--cream)'} />
          <span>Landing Sections</span>
        </button>

        <button
          onClick={() => setCmsTab('story')}
          style={{
            background: cmsTab === 'story' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.18) 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: cmsTab === 'story' ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: cmsTab === 'story' ? 'var(--gold)' : '#ffffff',
            boxShadow: cmsTab === 'story' ? '0 4px 14px rgba(212, 175, 55, 0.25)' : 'none',
            padding: '10px 8px',
            borderRadius: '8px',
            fontWeight: cmsTab === 'story' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <BookOpen size={15} color={cmsTab === 'story' ? 'var(--gold)' : 'var(--cream)'} />
          <span>Our Story</span>
        </button>

        <button
          onClick={() => setCmsTab('contact')}
          style={{
            background: cmsTab === 'contact' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.18) 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: cmsTab === 'contact' ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: cmsTab === 'contact' ? 'var(--gold)' : '#ffffff',
            boxShadow: cmsTab === 'contact' ? '0 4px 14px rgba(212, 175, 55, 0.25)' : 'none',
            padding: '10px 8px',
            borderRadius: '8px',
            fontWeight: cmsTab === 'contact' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Mail size={15} color={cmsTab === 'contact' ? 'var(--gold)' : 'var(--cream)'} />
          <span>Contact Us</span>
        </button>

        <button
          onClick={() => setCmsTab('stats')}
          style={{
            background: cmsTab === 'stats' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.18) 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: cmsTab === 'stats' ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: cmsTab === 'stats' ? 'var(--gold)' : '#ffffff',
            boxShadow: cmsTab === 'stats' ? '0 4px 14px rgba(212, 175, 55, 0.25)' : 'none',
            padding: '10px 8px',
            borderRadius: '8px',
            fontWeight: cmsTab === 'stats' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <BarChart3 size={15} color={cmsTab === 'stats' ? 'var(--gold)' : 'var(--cream)'} />
          <span>Live Stats</span>
        </button>

        <button
          onClick={() => setCmsTab('reels')}
          style={{
            background: cmsTab === 'reels' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.18) 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: cmsTab === 'reels' ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: cmsTab === 'reels' ? 'var(--gold)' : '#ffffff',
            boxShadow: cmsTab === 'reels' ? '0 4px 14px rgba(212, 175, 55, 0.25)' : 'none',
            padding: '10px 8px',
            borderRadius: '8px',
            fontWeight: cmsTab === 'reels' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Video size={15} color={cmsTab === 'reels' ? 'var(--gold)' : 'var(--cream)'} />
          <span>Instagram Reels ({cmsReels?.length || 0})</span>
        </button>

        <button
          onClick={() => setCmsTab('footer')}
          style={{
            background: cmsTab === 'footer' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.18) 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: cmsTab === 'footer' ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: cmsTab === 'footer' ? 'var(--gold)' : '#ffffff',
            boxShadow: cmsTab === 'footer' ? '0 4px 14px rgba(212, 175, 55, 0.25)' : 'none',
            padding: '10px 8px',
            borderRadius: '8px',
            fontWeight: cmsTab === 'footer' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Sliders size={15} color={cmsTab === 'footer' ? 'var(--gold)' : 'var(--cream)'} />
          <span>Footer CMS</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: HERO CAROUSEL BANNERS MANAGEMENT
          ========================================================================= */}
      {cmsTab === 'banners' && (
        <div>
          {/* Add Banner Modal / Expandable Form */}
          <AnimatePresence>
            {showAddBannerModal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: '30px' }}
              >
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--gold)', background: 'rgba(26,13,0,0.92)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Add New Hero Carousel Banner
                    </h3>
                    <button onClick={() => setShowAddBannerModal(false)} style={{ background: 'none', border: 'none', color: 'var(--beige)', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateNewBanner} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <Input
                      label="Main Heading / Title"
                      required
                      placeholder="e.g. Handcrafted Chocolate Masterpieces"
                      value={newBannerData.title}
                      onChange={(e) => setNewBannerData({ ...newBannerData, title: e.target.value })}
                    />
                    <Input
                      label="Subtitle Description"
                      required
                      placeholder="e.g. Made with single-origin Ghanaian cocoa..."
                      value={newBannerData.subtitle}
                      onChange={(e) => setNewBannerData({ ...newBannerData, subtitle: e.target.value })}
                    />
                    <Input
                      label="Category Tag Badge"
                      required
                      placeholder="e.g. Artisanal Series"
                      value={newBannerData.tag}
                      onChange={(e) => setNewBannerData({ ...newBannerData, tag: e.target.value })}
                    />
                    <Input
                      label="Button CTA Label"
                      required
                      placeholder="e.g. Explore Collection"
                      value={newBannerData.buttonText}
                      onChange={(e) => setNewBannerData({ ...newBannerData, buttonText: e.target.value })}
                    />

                    {/* Redirect Link DROPDOWN */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                        Redirect Destination Page:
                      </label>
                      <select
                        value={newBannerLinkPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewBannerLinkPreset(val);
                          if (val !== 'custom') {
                            const found = BANNER_REDIRECT_PRESETS.find((p) => p.value === val);
                            setNewBannerData((prev) => ({
                              ...prev,
                              link: val,
                              buttonText: prev.buttonText || (found ? found.defaultCta : 'Explore'),
                            }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.45)',
                          border: '1px solid var(--gold)',
                          color: 'var(--cream)',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      >
                        {BANNER_REDIRECT_PRESETS.map((preset) => (
                          <option key={preset.value} value={preset.value} style={{ background: '#111', color: '#fff' }}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Direct URL input (always editable or when custom selected) */}
                    <div>
                      <Input
                        label="Target Link URL / Anchor"
                        required
                        placeholder="/shop or #popular"
                        value={newBannerData.link}
                        onChange={(e) => {
                          setNewBannerData({ ...newBannerData, link: e.target.value });
                          const found = BANNER_REDIRECT_PRESETS.find((p) => p.value === e.target.value);
                          setNewBannerLinkPreset(found ? found.value : 'custom');
                        }}
                      />
                    </div>

                    {/* Image Upload */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600 }}>Banner Slide Image File:</span>
                      <input
                        ref={newBannerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewBannerImageFile(e.target.files?.[0] || null)}
                        style={{ marginTop: '8px', background: 'rgba(0,0,0,0.4)', color: 'var(--cream)', padding: '8px', width: '100%', borderRadius: '6px', border: '1px solid var(--glass-border)' }}
                      />
                      {newBannerImageFile && (
                        <p style={{ color: 'var(--gold)', fontSize: '0.8rem', marginTop: '4px' }}>
                          ✓ Selected: {newBannerImageFile.name} ({(newBannerImageFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>

                    {bannerCreateError && (
                      <p style={{ gridColumn: 'span 2', color: 'var(--rose-gold)', fontSize: '0.85rem', margin: 0 }}>
                        {bannerCreateError}
                      </p>
                    )}

                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <Button variant="gold" type="submit" glow disabled={isCreatingBanner}>
                        {isCreatingBanner ? 'Creating Banner Slide...' : 'Create & Publish Banner'}
                      </Button>
                      <Button variant="glass" type="button" onClick={() => setShowAddBannerModal(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Banner Slides List & Live Interactive Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {/* Slide Selector Cards */}
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', margin: 0, fontSize: '1.1rem' }}>
                    Current Banners ({banners?.length || 0})
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--beige)' }}>Click slide to view &amp; edit</span>
                </div>
                <Button
                  variant="gold"
                  size="sm"
                  glow
                  onClick={() => setShowAddBannerModal(!showAddBannerModal)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {showAddBannerModal ? <X size={14} /> : <Plus size={14} />}
                  <span>{showAddBannerModal ? 'Close Form' : 'Add New Banner'}</span>
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {banners?.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    onClick={() => setSelectedSlideIdx(idx)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: selectedSlideIdx === idx ? 'rgba(var(--gold-rgb), 0.16)' : 'rgba(255,255,255,0.03)',
                      border: selectedSlideIdx === idx ? '1px solid var(--gold)' : '1px solid var(--glass-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Slide {idx + 1}
                        </span>
                        <h5 style={{ margin: '3px 0 0 0', color: 'var(--cream)', fontWeight: 600, fontSize: '0.9rem' }}>
                          {b.title}
                        </h5>
                      </div>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--beige)' }}>
                        {b.tag}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gold)', opacity: 0.9 }}>
                        CTA: {b.buttonText} → <code style={{ color: 'var(--cream)', fontSize: '0.72rem' }}>{b.link}</code>
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditBanner(b);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--gold)',
                            background: 'rgba(var(--gold-rgb), 0.15)',
                            border: '1px solid rgba(var(--gold-rgb), 0.4)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                          }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBanner(b.id, b.title);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: 'var(--rose-gold)',
                            background: 'rgba(231,76,60,0.12)',
                            border: '1px solid rgba(231,76,60,0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slide Preview & Quick Actions */}
            {selectedBanner && (
              <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Slide {selectedSlideIdx + 1} Preview &amp; Configuration
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.3rem', margin: '4px 0 0 0' }}>
                      {selectedBanner.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setSelectedSlideIdx(Math.max(0, selectedSlideIdx - 1))}
                      disabled={selectedSlideIdx === 0}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        color: selectedSlideIdx === 0 ? 'rgba(255,255,255,0.2)' : 'var(--gold)',
                        cursor: selectedSlideIdx === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setSelectedSlideIdx(Math.min((banners?.length || 1) - 1, selectedSlideIdx + 1))}
                      disabled={selectedSlideIdx === (banners?.length || 1) - 1}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        color: selectedSlideIdx === (banners?.length || 1) - 1 ? 'rgba(255,255,255,0.2)' : 'var(--gold)',
                        cursor: selectedSlideIdx === (banners?.length || 1) - 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <p style={{ color: 'var(--beige)', fontSize: '0.9rem', marginBottom: '16px', lineHeight: 1.5 }}>
                  {selectedBanner.subtitle}
                </p>

                {/* Banner Image Preview */}
                {selectedBanner.image && (
                  <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', height: '200px', border: '1px solid var(--glass-border)', position: 'relative' }}>
                    <img
                      src={getImageUrl(selectedBanner.image)}
                      alt={selectedBanner.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--gold)' }}>
                      CTA: {selectedBanner.buttonText} → {selectedBanner.link}
                    </div>
                  </div>
                )}

                {/* Redirect Link Info Box */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--beige)' }}>Customer Click Destination:</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 600 }}>{selectedBanner.link}</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                  <Button
                    variant="gold"
                    glow
                    onClick={() => handleOpenEditBanner(selectedBanner)}
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    <Edit2 size={16} /> Edit Slide &amp; Redirect Link
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* EDIT BANNER MODAL */}
          <AnimatePresence>
            {editingBanner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.85)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '20px',
                }}
                onClick={() => setEditingBanner(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#16141a',
                    border: '1px solid var(--gold)',
                    borderRadius: '16px',
                    padding: '28px',
                    width: '100%',
                    maxWidth: '680px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Modify Banner Carousel
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', margin: '2px 0 0 0', fontSize: '1.4rem' }}>
                        Edit Banner Slide
                      </h3>
                    </div>
                    <button
                      onClick={() => setEditingBanner(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--beige)', cursor: 'pointer' }}
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveBannerEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input
                      label="Banner Heading / Title"
                      required
                      value={editBannerData.title}
                      onChange={(e) => setEditBannerData({ ...editBannerData, title: e.target.value })}
                    />

                    <Input
                      label="Subtitle / Description"
                      required
                      value={editBannerData.subtitle}
                      onChange={(e) => setEditBannerData({ ...editBannerData, subtitle: e.target.value })}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <Input
                        label="Category Tag (e.g. Artisanal Series)"
                        required
                        value={editBannerData.tag}
                        onChange={(e) => setEditBannerData({ ...editBannerData, tag: e.target.value })}
                      />

                      <Input
                        label="Button Label (CTA)"
                        required
                        value={editBannerData.buttonText}
                        onChange={(e) => setEditBannerData({ ...editBannerData, buttonText: e.target.value })}
                      />
                    </div>

                    {/* REDIRECT LINK DROPDOWN */}
                    <div style={{ background: 'rgba(var(--gold-rgb), 0.06)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(var(--gold-rgb), 0.25)' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold)', marginBottom: '8px' }}>
                        🎯 Button Redirect Link / Destination:
                      </label>
                      <select
                        value={editBannerLinkPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditBannerLinkPreset(val);
                          if (val !== 'custom') {
                            const found = BANNER_REDIRECT_PRESETS.find((p) => p.value === val);
                            setEditBannerData((prev) => ({
                              ...prev,
                              link: val,
                              buttonText: prev.buttonText || (found ? found.defaultCta : 'Explore'),
                            }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#0d0d12',
                          border: '1px solid var(--gold)',
                          color: 'var(--cream)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          cursor: 'pointer',
                          marginBottom: '10px',
                        }}
                      >
                        {BANNER_REDIRECT_PRESETS.map((preset) => (
                          <option key={preset.value} value={preset.value} style={{ background: '#111', color: '#fff' }}>
                            {preset.label}
                          </option>
                        ))}
                      </select>

                      <Input
                        label="Custom Link URL / Route (automatically synced with dropdown):"
                        required
                        placeholder="/shop or #popular"
                        value={editBannerData.link}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditBannerData({ ...editBannerData, link: val });
                          const match = BANNER_REDIRECT_PRESETS.find((p) => p.value === val);
                          setEditBannerLinkPreset(match ? match.value : 'custom');
                        }}
                      />
                    </div>

                    {/* Image preview & replacement */}
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                        Banner Image:
                      </span>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '120px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                          <img
                            src={editBannerImageFile ? URL.createObjectURL(editBannerImageFile) : getImageUrl(editingBanner.image)}
                            alt={editingBanner.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <input
                            ref={editBannerFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => setEditBannerImageFile(e.target.files?.[0] || null)}
                            style={{ display: 'none' }}
                          />
                          <Button
                            variant="glass"
                            type="button"
                            size="sm"
                            onClick={() => editBannerFileInputRef.current?.click()}
                          >
                            {editBannerImageFile ? `Change Image (${editBannerImageFile.name})` : 'Choose New Image (Optional)'}
                          </Button>
                          {editBannerImageFile && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gold)', marginTop: '4px' }}>
                              ✓ New file selected: {(editBannerImageFile.size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {editBannerError && (
                      <p style={{ color: 'var(--rose-gold)', fontSize: '0.85rem', margin: 0 }}>
                        {editBannerError}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <Button variant="gold" type="submit" glow disabled={isUpdatingBanner} style={{ flex: 1 }}>
                        {isUpdatingBanner ? 'Saving Changes...' : 'Save & Update Banner'}
                      </Button>
                      <Button variant="glass" type="button" onClick={() => setEditingBanner(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* =========================================================================
          TAB 2: LANDING PAGE SECTIONS TEXT CUSTOMIZATION
          ========================================================================= */}
      {cmsTab === 'sections' && (
        <div>
          {/* Sub-selector for sections — clean responsive grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(7, minmax(0, 1fr))',
              gap: '8px',
              marginBottom: '24px',
              background: 'rgba(26, 16, 10, 0.75)',
              padding: '8px',
              borderRadius: '10px',
              border: '1px solid rgba(212, 175, 55, 0.22)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            {[
              { id: 'tasteSample', num: '2', title: 'Sample Piece' },
              { id: 'popular', num: '3', title: 'Popular' },
              { id: 'bestsellers', num: '4', title: 'Bestsellers & New' },
              { id: 'gifts', num: '5', title: 'Gift Hampers' },
              { id: 'boutique', num: '6', title: 'Boutique' },
              { id: 'reviews', num: '7', title: 'Reviews' },
              { id: 'reels', num: '8', title: 'Reels' },
            ].map((s) => {
              const isActive = activeSectionSubTab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSectionSubTab(s.id as any)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '6px',
                    background: isActive ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(184, 134, 11, 0.16) 100%)' : 'rgba(255, 255, 255, 0.05)',
                    border: isActive ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isActive ? 'var(--gold)' : '#ffffff',
                    boxShadow: isActive ? '0 2px 8px rgba(212, 175, 55, 0.2)' : 'none',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.68rem', opacity: 0.75, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Sec {s.num}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', fontWeight: 600 }}>
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section 2: Taste Our Sample Piece (NEW) */}
          {activeSectionSubTab === 'tasteSample' && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      SECTION 2 • 2ND ON LANDING
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Taste Our Sample Piece Section CMS
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                    Fully customize the section heading, the sample product card (left side), and the "Why We Offer A Sample Piece" story with interactive bullets (right side).
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button variant="glass" size="sm" onClick={() => handleResetSection('tasteSample')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} /> Reset to Defaults
                  </Button>
                </div>
              </div>

              {/* 1. SECTION HEADINGS */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  1. Main Section Heading & Eyebrow
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  <Input
                    label="Eyebrow Badge"
                    placeholder="Taste Our Collection"
                    value={sectionsForm.tasteSample?.badge || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, badge: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Title (Before Highlight)"
                    placeholder="Try a"
                    value={sectionsForm.tasteSample?.titleMain || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, titleMain: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Highlighted Text (Gold Shimmer)"
                    placeholder="Sample Piece"
                    value={sectionsForm.tasteSample?.titleHighlight || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, titleHighlight: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Title Suffix (Optional)"
                    placeholder="e.g. Today"
                    value={sectionsForm.tasteSample?.titleSuffix || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, titleSuffix: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--cream)', marginBottom: '6px', fontWeight: 600 }}>
                    Section Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={sectionsForm.tasteSample?.subtitle || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, subtitle: e.target.value },
                      })
                    }
                    placeholder="Before you fall in love with an entire box, let one perfect piece do the talking..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--cream)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* 2. LEFT SIDE: SAMPLE CARD & CTAS */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  2. Left Column: Sample Product Card & Actions
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                  <Input
                    label="Card Badge Pill Text"
                    placeholder="Sample Piece"
                    value={sectionsForm.tasteSample?.cardBadgeText || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, cardBadgeText: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Primary CTA Text"
                    placeholder="Explore All Varieties"
                    value={sectionsForm.tasteSample?.ctaText || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, ctaText: e.target.value },
                      })
                    }
                  />
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--cream)', marginBottom: '6px', fontWeight: 600 }}>
                      Primary CTA Destination
                    </label>
                    <select
                      value={sectionsForm.tasteSample?.ctaLink || '/shop'}
                      onChange={(e) =>
                        setSectionsForm({
                          ...sectionsForm,
                          tasteSample: { ...sectionsForm.tasteSample, ctaLink: e.target.value },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    >
                      {BANNER_REDIRECT_PRESETS.map((p) => (
                        <option key={p.value} value={p.value} style={{ background: '#1a1008', color: '#fff' }}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Secondary CTA Text"
                    placeholder="Our Artisanal Story"
                    value={sectionsForm.tasteSample?.secondaryCtaText || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, secondaryCtaText: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Secondary CTA Destination"
                    placeholder="/our-story"
                    value={sectionsForm.tasteSample?.secondaryCtaLink || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, secondaryCtaLink: e.target.value },
                      })
                    }
                  />
                </div>

                {/* Product Showcase Picker */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} color="var(--gold)" /> Showcase Chocolates in Sample Carousel
                    </label>
                    <span style={{ fontSize: '0.78rem', color: '#2ecc71', background: 'rgba(46, 204, 113, 0.15)', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {products.filter((p) => Boolean(p.isSample || (p as any).is_sample)).length} sample tasting piece(s) active
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--beige)', margin: '0 0 12px 0' }}>
                    Chocolates marked as <strong>"Sample Tasting Piece"</strong> in the Admin Product Catalog will automatically display in the landing page showcase. You can also select specific items below to pin or feature them.
                  </p>
                  
                  {/* Current Active Sample Pieces Quick Preview */}
                  {products.filter((p) => Boolean(p.isSample || (p as any).is_sample)).length > 0 && (
                    <div style={{ marginBottom: '12px', background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                        Live in Sample Section:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {products
                          .filter((p) => Boolean(p.isSample || (p as any).is_sample))
                          .map((p) => {
                            const tastingPrice = p.samplePrice ?? (p as any).sample_price ?? Math.round(p.price * 0.1);
                            return (
                              <div
                                key={p.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: 'rgba(0,0,0,0.4)',
                                  border: '1px solid rgba(46, 204, 113, 0.4)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.78rem',
                                  color: 'var(--cream)',
                                }}
                              >
                                <img
                                  src={getImageUrl(p.image)}
                                  alt=""
                                  style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549007953-2f2dc0b24019?auto=format&fit=crop&w=60&q=80';
                                  }}
                                />
                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                <span style={{ background: '#2ecc71', color: '#000', fontSize: '0.68rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                                  ₹{tastingPrice} Tasting
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: '6px' }}>
                    {products.map((p) => {
                      const isSampleFlag = Boolean(p.isSample || (p as any).is_sample);
                      const isSelected = sectionsForm.tasteSample?.selectedProductIds?.includes(p.id);
                      const tastingPrice = p.samplePrice ?? (p as any).sample_price;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const current = sectionsForm.tasteSample?.selectedProductIds || [];
                            const next = isSelected ? current.filter((id) => id !== p.id) : [...current, p.id];
                            setSectionsForm({
                              ...sectionsForm,
                              tasteSample: { ...sectionsForm.tasteSample, selectedProductIds: next },
                            });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            background: isSelected
                              ? 'rgba(var(--gold-rgb), 0.25)'
                              : isSampleFlag
                              ? 'rgba(46, 204, 113, 0.15)'
                              : 'rgba(255,255,255,0.05)',
                            border: isSelected
                              ? '1px solid var(--gold)'
                              : isSampleFlag
                              ? '1px solid rgba(46, 204, 113, 0.4)'
                              : '1px solid var(--glass-border)',
                            color: isSelected ? 'var(--gold)' : 'var(--cream)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <img
                            src={getImageUrl(p.image)}
                            alt=""
                            style={{ width: '18px', height: '18px', objectFit: 'cover', borderRadius: '3px' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549007953-2f2dc0b24019?auto=format&fit=crop&w=60&q=80';
                            }}
                          />
                          <span>{p.name}</span>
                          {isSampleFlag && (
                            <span style={{ fontSize: '0.65rem', background: '#2ecc71', color: '#000', padding: '1px 4px', borderRadius: '2px', fontWeight: 700 }}>
                              SAMPLE {tastingPrice ? `₹${tastingPrice}` : ''}
                            </span>
                          )}
                          {isSelected && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. RIGHT SIDE: "WHY WE OFFER" & 4 BULLETS */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  3. Right Column: "Why We Offer A Sample Piece" Content
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                  <Input
                    label="Why Header Title"
                    placeholder="Why We Offer A Sample Piece"
                    value={sectionsForm.tasteSample?.whyTitle || ''}
                    onChange={(e) =>
                      setSectionsForm({
                        ...sectionsForm,
                        tasteSample: { ...sectionsForm.tasteSample, whyTitle: e.target.value },
                      })
                    }
                  />
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--cream)', marginBottom: '6px', fontWeight: 600 }}>
                      Why Intro Paragraph
                    </label>
                    <textarea
                      rows={2}
                      value={sectionsForm.tasteSample?.whySubtitle || ''}
                      onChange={(e) =>
                        setSectionsForm({
                          ...sectionsForm,
                          tasteSample: { ...sectionsForm.tasteSample, whySubtitle: e.target.value },
                        })
                      }
                      placeholder="At Chovique, we believe extraordinary chocolate deserves an extraordinary introduction..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* 4 Interactive Bullets */}
                <h5 style={{ color: 'var(--cream)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px', letterSpacing: '0.5px' }}>
                  The 4 Interactive Taste Experience Bullets
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {(sectionsForm.tasteSample?.whyBullets || DEFAULT_LANDING_SECTIONS.tasteSample.whyBullets).map((b, bIdx) => (
                    <div
                      key={bIdx}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, background: 'rgba(var(--gold-rgb), 0.15)', padding: '2px 6px', borderRadius: '3px' }}>
                          POINT #{bIdx + 1}
                        </span>
                      </div>
                      <Input
                        label="Point Title"
                        value={b.title || ''}
                        onChange={(e) => {
                          const updated = [...(sectionsForm.tasteSample?.whyBullets || DEFAULT_LANDING_SECTIONS.tasteSample.whyBullets)];
                          updated[bIdx] = { ...updated[bIdx], title: e.target.value };
                          setSectionsForm({
                            ...sectionsForm,
                            tasteSample: { ...sectionsForm.tasteSample, whyBullets: updated },
                          });
                        }}
                      />
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--beige)', marginBottom: '4px' }}>
                          Point Description
                        </label>
                        <textarea
                          rows={2}
                          value={b.desc || ''}
                          onChange={(e) => {
                            const updated = [...(sectionsForm.tasteSample?.whyBullets || DEFAULT_LANDING_SECTIONS.tasteSample.whyBullets)];
                            updated[bIdx] = { ...updated[bIdx], desc: e.target.value };
                            setSectionsForm({
                              ...sectionsForm,
                              tasteSample: { ...sectionsForm.tasteSample, whyBullets: updated },
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: 'var(--cream)',
                            fontSize: '0.8rem',
                            outline: 'none',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. REALISTIC LIVE PREVIEW */}
              <div style={{ background: 'linear-gradient(160deg, #0D090A 0%, #1A0D00 45%, #2C1503 100%)', border: '1px solid var(--gold)', borderRadius: '10px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '0.7rem', color: 'var(--gold)', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.3)', fontWeight: 600 }}>
                  LIVE PREVIEW (CUSTOMER VIEW)
                </span>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={11} /> {sectionsForm.tasteSample?.badge || 'Taste Our Collection'}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.4rem', margin: '6px 0 4px 0' }}>
                    {sectionsForm.tasteSample?.titleMain || 'Try a'}{' '}
                    <span style={{ background: 'var(--gradient-gold-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {sectionsForm.tasteSample?.titleHighlight || 'Sample Piece'}
                    </span>
                    {sectionsForm.tasteSample?.titleSuffix ? ` ${sectionsForm.tasteSample.titleSuffix}` : ''}
                  </h3>
                  <p style={{ color: 'var(--beige)', fontSize: '0.8rem', maxWidth: '600px', margin: '0 auto', opacity: 0.85 }}>
                    {sectionsForm.tasteSample?.subtitle}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'center' }}>
                  {/* Preview Left: Card */}
                  {(() => {
                    const sampleProduct = products.find((p) => Boolean(p.isSample || (p as any).is_sample)) || products[0];
                    if (!sampleProduct) {
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.3)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', color: 'var(--beige)' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem' }}>No products available in database.</p>
                          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Add products in the Catalog tab to preview this card.</span>
                        </div>
                      );
                    }
                    const tastingPrice = sampleProduct.samplePrice ?? (sampleProduct as any).sample_price;
                    return (
                      <div style={{ background: 'linear-gradient(145deg, rgba(30,17,8,0.9) 0%, rgba(15,8,3,0.95) 100%)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '16px', position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                        <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--gold)', color: '#000', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={10} /> {sectionsForm.tasteSample?.cardBadgeText || 'Sample Piece'}
                        </span>
                        {sampleProduct.image ? (
                          <img
                            src={getImageUrl(sampleProduct.image)}
                            alt={sampleProduct.name}
                            style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '180px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', fontSize: '0.8rem' }}>
                            No Image
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ color: 'var(--cream)', fontSize: '0.95rem', margin: '0 0 2px 0' }}>
                              {sampleProduct.name}
                            </h4>
                            <span style={{ color: 'var(--gold)', fontSize: '0.9rem', fontWeight: 700 }}>
                              {tastingPrice ? `₹${tastingPrice}` : (sampleProduct.price ? `₹${sampleProduct.price}` : 'Sample Piece')}
                            </span>
                          </div>
                          <span style={{ background: 'var(--gold)', color: '#000', fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px', borderRadius: '4px' }}>
                            Taste Now
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Preview Right: Why */}
                  <div>
                    <span style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {sectionsForm.tasteSample?.whyTitle || 'Why We Offer A Sample Piece'}
                    </span>
                    <p style={{ color: 'var(--cream)', fontSize: '0.82rem', margin: '6px 0 14px 0', opacity: 0.9 }}>
                      {sectionsForm.tasteSample?.whySubtitle}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(sectionsForm.tasteSample?.whyBullets || DEFAULT_LANDING_SECTIONS.tasteSample.whyBullets).slice(0, 2).map((b, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <Gem size={14} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <p style={{ color: 'var(--cream)', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{b.title}</p>
                            <p style={{ color: 'var(--beige)', fontSize: '0.75rem', margin: '2px 0 0 0', opacity: 0.8 }}>{b.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <span style={{ background: 'var(--gold)', color: '#000', padding: '8px 14px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
                        {sectionsForm.tasteSample?.ctaText || 'Explore All Varieties'}
                      </span>
                      <span style={{ border: '1px solid var(--glass-border)', color: 'var(--cream)', padding: '8px 14px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {sectionsForm.tasteSample?.secondaryCtaText || 'Our Story'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Popular Products */}
          {activeSectionSubTab === 'popular' && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      SECTION 3 • 3RD ON LANDING
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Section 3: Popular Products Header
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                    Controls the badge eyebrow, main heading with highlighted gold text, and descriptive subtitle for the customer favorites showcase.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button variant="glass" size="sm" onClick={() => handleResetSection('popularProducts')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} /> Reset to Defaults
                  </Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Input
                  label="Section Eyebrow / Badge"
                  placeholder="Curated Selection"
                  value={sectionsForm.popularProducts.badge || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    popularProducts: { ...sectionsForm.popularProducts, badge: e.target.value },
                  })}
                />
                <Input
                  label="Title (Before Highlight)"
                  placeholder="Our Most"
                  value={sectionsForm.popularProducts.titleMain || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    popularProducts: { ...sectionsForm.popularProducts, titleMain: e.target.value },
                  })}
                />
                <Input
                  label="Highlighted Text (Gold Shimmer)"
                  placeholder="Loved"
                  value={sectionsForm.popularProducts.titleHighlight || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    popularProducts: { ...sectionsForm.popularProducts, titleHighlight: e.target.value },
                  })}
                />
                <Input
                  label="Title Suffix (After Highlight)"
                  placeholder="Creations"
                  value={sectionsForm.popularProducts.titleSuffix || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    popularProducts: { ...sectionsForm.popularProducts, titleSuffix: e.target.value },
                  })}
                />
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                    Subtitle / Paragraph Description:
                  </label>
                  <textarea
                    rows={3}
                    value={sectionsForm.popularProducts.subtitle || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      popularProducts: { ...sectionsForm.popularProducts, subtitle: e.target.value },
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Rich Live Preview Card */}
              <div style={{ marginTop: '8px', padding: '24px', background: 'linear-gradient(145deg, #120A05 0%, #1A1008 100%)', borderRadius: '12px', border: '1px solid var(--gold)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={11} /> LIVE PREVIEW (CUSTOMER VIEW)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.75 }}>
                    Renders in Section 3 on the landing page
                  </span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  {sectionsForm.popularProducts.badge && (
                    <span className="section-label" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: '6px' }}>
                      {sectionsForm.popularProducts.badge}
                    </span>
                  )}
                  <h2 className="section-title" style={{ fontSize: '1.8rem', margin: '4px 0 8px 0' }}>
                    {sectionsForm.popularProducts.titleMain}{' '}
                    <span className="gold">{sectionsForm.popularProducts.titleHighlight}</span>{' '}
                    {sectionsForm.popularProducts.titleSuffix}
                  </h2>
                  <p className="section-subtitle" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '0.85rem' }}>
                    {sectionsForm.popularProducts.subtitle}
                  </p>
                </div>

                {/* Popular Product Cards Preview */}
                {(() => {
                  const popularPreview = products
                    .filter((p) => p.badge === 'Bestseller' || p.badge === 'Premium')
                    .concat(products.filter((p) => p.badge !== 'Bestseller' && p.badge !== 'Premium'))
                    .slice(0, 3);
                  if (popularPreview.length === 0) {
                    return (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.3)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', color: 'var(--beige)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No products available in database.</p>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Add products in the Catalog tab to preview popular cards.</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                      {popularPreview.map((item) => (
                        <div key={item.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '8px', padding: '12px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--gold)', opacity: 0.85 }}>
                            <Heart size={14} fill="var(--gold)" />
                          </span>
                          {item.image ? (
                            <img src={getImageUrl(item.image)} alt={item.name} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                          ) : (
                            <div style={{ width: '100%', height: '110px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', fontSize: '0.8rem' }}>No Image</div>
                          )}
                          <div style={{ color: 'var(--cream)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.85rem' }}>₹{item.price}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--beige)', border: '1px solid rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '3px' }}>Taste Now</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Section 4: Bestsellers & New Arrivals (2 Parts) */}
          {activeSectionSubTab === 'bestsellers' && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      SECTION 4 • 4TH ON LANDING
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Section 4: Bestsellers &amp; New Arrivals (Main Showroom + 2 Columns)
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                    Controls the main dual-showroom heading, plus Part 1 (The Bestsellers column) and Part 2 (New Arrivals column). Changes reflect immediately in the live preview below.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button variant="glass" size="sm" onClick={() => handleResetSection('bestsellersNewArrivals')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} /> Reset to Defaults
                  </Button>
                </div>
              </div>

              {/* Main Header Form */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Sparkles size={16} color="var(--gold)" />
                  <h4 style={{ color: 'var(--gold)', margin: 0, fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    1. Overall Showroom Header
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <Input
                    label="Showroom Eyebrow / Badge"
                    placeholder="Exclusive Showroom"
                    value={sectionsForm.bestsellersNewArrivals.header.badge || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      bestsellersNewArrivals: {
                        ...sectionsForm.bestsellersNewArrivals,
                        header: { ...sectionsForm.bestsellersNewArrivals.header, badge: e.target.value },
                      },
                    })}
                  />
                  <Input
                    label="Title Part 1"
                    placeholder="Bestsellers"
                    value={sectionsForm.bestsellersNewArrivals.header.titleMain || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      bestsellersNewArrivals: {
                        ...sectionsForm.bestsellersNewArrivals,
                        header: { ...sectionsForm.bestsellersNewArrivals.header, titleMain: e.target.value },
                      },
                    })}
                  />
                  <Input
                    label="Highlighted Middle Character/Word"
                    placeholder="&"
                    value={sectionsForm.bestsellersNewArrivals.header.titleHighlight || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      bestsellersNewArrivals: {
                        ...sectionsForm.bestsellersNewArrivals,
                        header: { ...sectionsForm.bestsellersNewArrivals.header, titleHighlight: e.target.value },
                      },
                    })}
                  />
                  <Input
                    label="Title Part 2"
                    placeholder="New Arrivals"
                    value={sectionsForm.bestsellersNewArrivals.header.titleSuffix || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      bestsellersNewArrivals: {
                        ...sectionsForm.bestsellersNewArrivals,
                        header: { ...sectionsForm.bestsellersNewArrivals.header, titleSuffix: e.target.value },
                      },
                    })}
                  />
                </div>
                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                    Showroom Subtitle / Intro Paragraph:
                  </label>
                  <textarea
                    rows={2}
                    value={sectionsForm.bestsellersNewArrivals.header.subtitle || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      bestsellersNewArrivals: {
                        ...sectionsForm.bestsellersNewArrivals,
                        header: { ...sectionsForm.bestsellersNewArrivals.header, subtitle: e.target.value },
                      },
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Two Parts: Bestsellers vs New Arrivals Forms */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Part 1: The Bestsellers */}
                <div style={{ background: 'rgba(var(--gold-rgb), 0.05)', padding: '18px', borderRadius: '10px', border: '1px solid rgba(var(--gold-rgb), 0.3)' }}>
                  <h4 style={{ color: 'var(--gold)', margin: '0 0 14px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Sparkles size={16} /> 2. Part 1: The Bestsellers Column
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Input
                      label="Column Tag (Gold)"
                      placeholder="Connoisseur Choice"
                      value={sectionsForm.bestsellersNewArrivals.bestsellersPart.tag || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          bestsellersPart: { ...sectionsForm.bestsellersNewArrivals.bestsellersPart, tag: e.target.value },
                        },
                      })}
                    />
                    <Input
                      label="Column Heading (Before Highlight)"
                      placeholder="The"
                      value={sectionsForm.bestsellersNewArrivals.bestsellersPart.title || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          bestsellersPart: { ...sectionsForm.bestsellersNewArrivals.bestsellersPart, title: e.target.value },
                        },
                      })}
                    />
                    <Input
                      label="Gold Highlighted Word(s)"
                      placeholder="Bestsellers"
                      value={sectionsForm.bestsellersNewArrivals.bestsellersPart.titleHighlight || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          bestsellersPart: { ...sectionsForm.bestsellersNewArrivals.bestsellersPart, titleHighlight: e.target.value },
                        },
                      })}
                    />
                    <Input
                      label="Title Suffix (Optional)"
                      placeholder=""
                      value={sectionsForm.bestsellersNewArrivals.bestsellersPart.titleSuffix || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          bestsellersPart: { ...sectionsForm.bestsellersNewArrivals.bestsellersPart, titleSuffix: e.target.value },
                        },
                      })}
                    />
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                        Description Text:
                      </label>
                      <textarea
                        rows={3}
                        value={sectionsForm.bestsellersNewArrivals.bestsellersPart.description || ''}
                        onChange={(e) => setSectionsForm({
                          ...sectionsForm,
                          bestsellersNewArrivals: {
                            ...sectionsForm.bestsellersNewArrivals,
                            bestsellersPart: { ...sectionsForm.bestsellersNewArrivals.bestsellersPart, description: e.target.value },
                          },
                        })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--cream)',
                          fontSize: '0.88rem',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Part 2: New Arrivals */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ color: 'var(--cream)', margin: '0 0 14px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Sparkles size={16} color="var(--rose-gold)" /> 3. Part 2: New Arrivals Column
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Input
                      label="Column Tag (Silver/Plat)"
                      placeholder="Freshly Tempered"
                      value={sectionsForm.bestsellersNewArrivals.newArrivalsPart.tag || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          newArrivalsPart: { ...sectionsForm.bestsellersNewArrivals.newArrivalsPart, tag: e.target.value },
                        },
                      })}
                    />
                    <Input
                      label="Column Heading (Before Highlight)"
                      placeholder="New"
                      value={sectionsForm.bestsellersNewArrivals.newArrivalsPart.title || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          newArrivalsPart: { ...sectionsForm.bestsellersNewArrivals.newArrivalsPart, title: e.target.value },
                        },
                      })}
                    />
                    <Input
                      label="Gold Highlighted Word(s)"
                      placeholder="Arrivals"
                      value={sectionsForm.bestsellersNewArrivals.newArrivalsPart.titleHighlight || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          newArrivalsPart: { ...sectionsForm.bestsellersNewArrivals.newArrivalsPart, titleHighlight: e.target.value },
                        },
                      })}
                    />
                    <Input
                      label="Title Suffix (Optional)"
                      placeholder=""
                      value={sectionsForm.bestsellersNewArrivals.newArrivalsPart.titleSuffix || ''}
                      onChange={(e) => setSectionsForm({
                        ...sectionsForm,
                        bestsellersNewArrivals: {
                          ...sectionsForm.bestsellersNewArrivals,
                          newArrivalsPart: { ...sectionsForm.bestsellersNewArrivals.newArrivalsPart, titleSuffix: e.target.value },
                        },
                      })}
                    />
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                        Description Text:
                      </label>
                      <textarea
                        rows={3}
                        value={sectionsForm.bestsellersNewArrivals.newArrivalsPart.description || ''}
                        onChange={(e) => setSectionsForm({
                          ...sectionsForm,
                          bestsellersNewArrivals: {
                            ...sectionsForm.bestsellersNewArrivals,
                            newArrivalsPart: { ...sectionsForm.bestsellersNewArrivals.newArrivalsPart, description: e.target.value },
                          },
                        })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--cream)',
                          fontSize: '0.88rem',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* REALISTIC LIVE SHOWROOM PREVIEW (CUSTOMER VIEW) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0A0A0A 0%, #161618 35%, #232326 70%, #101012 100%)',
                  border: '1px solid var(--gold)',
                  borderRadius: '12px',
                  padding: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.15)', padding: '3px 10px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={11} /> LIVE SHOWROOM PREVIEW (CUSTOMER VIEW)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                    Renders Section 4 dual-column layout in real-time
                  </span>
                </div>

                {/* Showroom Main Header Preview */}
                <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {sectionsForm.bestsellersNewArrivals.header.badge && (
                    <span className="section-label" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: '6px' }}>
                      {sectionsForm.bestsellersNewArrivals.header.badge}
                    </span>
                  )}
                  <h2 className="section-title" style={{ fontSize: '1.8rem', margin: '4px 0 8px 0' }}>
                    {sectionsForm.bestsellersNewArrivals.header.titleMain || 'Bestsellers'}
                    {sectionsForm.bestsellersNewArrivals.header.titleHighlight ? (
                      <> <span className="gold">{sectionsForm.bestsellersNewArrivals.header.titleHighlight}</span></>
                    ) : null}
                    {sectionsForm.bestsellersNewArrivals.header.titleSuffix ? ` ${sectionsForm.bestsellersNewArrivals.header.titleSuffix}` : ''}
                  </h2>
                  {sectionsForm.bestsellersNewArrivals.header.subtitle && (
                    <p className="section-subtitle" style={{ maxWidth: '650px', margin: '0 auto', fontSize: '0.85rem' }}>
                      {sectionsForm.bestsellersNewArrivals.header.subtitle}
                    </p>
                  )}
                </div>

                {/* Dual Column Showrooms Preview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {/* Part 1: Bestsellers Column */}
                  <div
                    style={{
                      background: 'rgba(20, 14, 10, 0.7)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      borderRadius: '10px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <span className="collection-tag gold" style={{ fontSize: '0.72rem', display: 'inline-block', marginBottom: '6px' }}>
                        {sectionsForm.bestsellersNewArrivals.bestsellersPart.tag || 'Connoisseur Choice'}
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--cream)', margin: '0 0 6px 0' }}>
                        {sectionsForm.bestsellersNewArrivals.bestsellersPart.title || 'The Bestsellers'}
                        {sectionsForm.bestsellersNewArrivals.bestsellersPart.titleHighlight && (
                          <> <span className="gold">{sectionsForm.bestsellersNewArrivals.bestsellersPart.titleHighlight}</span></>
                        )}
                        {sectionsForm.bestsellersNewArrivals.bestsellersPart.titleSuffix && (
                          ` ${sectionsForm.bestsellersNewArrivals.bestsellersPart.titleSuffix}`
                        )}
                      </h3>
                      <p style={{ color: 'var(--beige)', fontSize: '0.8rem', margin: 0, opacity: 0.85, lineHeight: 1.4 }}>
                        {sectionsForm.bestsellersNewArrivals.bestsellersPart.description || 'Artisanal icons that have won the hearts of fine chocolate lovers globally.'}
                      </p>
                    </div>

                    {/* Preview Cards from Database */}
                    {(() => {
                      const bestsellers = products.filter((p) => (p.isBestseller || p.badge === 'Bestseller' || p.badge === 'Premium') && p.badge !== 'Limited' && p.badge !== 'Limited Edition').slice(0, 2);
                      if (bestsellers.length === 0) {
                        return (
                          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(212,175,55,0.25)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: 'var(--beige)', marginTop: 'auto', fontSize: '0.75rem' }}>
                            No bestsellers configured in database.
                          </div>
                        );
                      }
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                          {bestsellers.map((p) => (
                            <div key={p.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '8px', padding: '10px', position: 'relative' }}>
                              <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'var(--gold)', color: '#000', fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                                Bestseller
                              </span>
                              {p.image ? (
                                <img src={getImageUrl(p.image)} alt={p.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                              ) : (
                                <div style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', fontSize: '0.7rem' }}>No Image</div>
                              )}
                              <div style={{ fontSize: '0.75rem', color: 'var(--cream)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 700 }}>₹{p.price}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Part 2: New Arrivals Column */}
                  <div
                    style={{
                      background: 'rgba(15, 15, 18, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <span className="collection-tag" style={{ fontSize: '0.72rem', display: 'inline-block', marginBottom: '6px', color: '#e0e0e0', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)' }}>
                        {sectionsForm.bestsellersNewArrivals.newArrivalsPart.tag || 'Freshly Tempered'}
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--cream)', margin: '0 0 6px 0' }}>
                        {sectionsForm.bestsellersNewArrivals.newArrivalsPart.title || 'New Arrivals'}
                        {sectionsForm.bestsellersNewArrivals.newArrivalsPart.titleHighlight && (
                          <> <span className="gold">{sectionsForm.bestsellersNewArrivals.newArrivalsPart.titleHighlight}</span></>
                        )}
                        {sectionsForm.bestsellersNewArrivals.newArrivalsPart.titleSuffix && (
                          ` ${sectionsForm.bestsellersNewArrivals.newArrivalsPart.titleSuffix}`
                        )}
                      </h3>
                      <p style={{ color: 'var(--beige)', fontSize: '0.8rem', margin: 0, opacity: 0.85, lineHeight: 1.4 }}>
                        {sectionsForm.bestsellersNewArrivals.newArrivalsPart.description || 'Seasonal innovations and brand new releases straight from the kitchen.'}
                      </p>
                    </div>

                    {/* Preview Cards from Database */}
                    {(() => {
                      const newArrivals = products.filter((p) => (p.isNewArrival || p.badge === 'New') && p.badge !== 'Limited' && p.badge !== 'Limited Edition').slice(0, 2);
                      if (newArrivals.length === 0) {
                        return (
                          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: 'var(--beige)', marginTop: 'auto', fontSize: '0.75rem' }}>
                            No new arrivals configured in database.
                          </div>
                        );
                      }
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                          {newArrivals.map((p) => (
                            <div key={p.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px', position: 'relative' }}>
                              <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#3498db', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                                New
                              </span>
                              {p.image ? (
                                <img src={getImageUrl(p.image)} alt={p.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                              ) : (
                                <div style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', fontSize: '0.7rem' }}>No Image</div>
                              )}
                              <div style={{ fontSize: '0.75rem', color: 'var(--cream)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 700 }}>₹{p.price}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Luxury Gift Hampers */}
          {activeSectionSubTab === 'gifts' && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      SECTION 5 • 5TH ON LANDING
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Section 5: Luxury Gift Hampers
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                    Controls the badge, title with gold highlight, and subtitle of the bespoke luxury gifting section.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button variant="glass" size="sm" onClick={() => handleResetSection('giftHampers')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} /> Reset to Defaults
                  </Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Input
                  label="Eyebrow / Badge"
                  placeholder="Art of Giving"
                  value={sectionsForm.giftHampers.badge || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    giftHampers: { ...sectionsForm.giftHampers, badge: e.target.value },
                  })}
                />
                <Input
                  label="Main Title"
                  placeholder="Luxury Gift"
                  value={sectionsForm.giftHampers.titleMain || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    giftHampers: { ...sectionsForm.giftHampers, titleMain: e.target.value },
                  })}
                />
                <Input
                  label="Highlighted Text (Gold)"
                  placeholder="Hampers"
                  value={sectionsForm.giftHampers.titleHighlight || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    giftHampers: { ...sectionsForm.giftHampers, titleHighlight: e.target.value },
                  })}
                />
                <Input
                  label="Title Suffix (Optional)"
                  placeholder=""
                  value={sectionsForm.giftHampers.titleSuffix || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    giftHampers: { ...sectionsForm.giftHampers, titleSuffix: e.target.value },
                  })}
                />
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                    Subtitle / Description:
                  </label>
                  <textarea
                    rows={3}
                    value={sectionsForm.giftHampers.subtitle || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      giftHampers: { ...sectionsForm.giftHampers, subtitle: e.target.value },
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* LIVE PREVIEW FOR SECTION 5 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1C1C1E 0%, #2A2A2D 40%, #0D0A08 100%)',
                  border: '1px solid var(--gold)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.15)', padding: '3px 10px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={11} /> LIVE PREVIEW (CUSTOMER VIEW)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                    Renders Section 5 on the landing page
                  </span>
                </div>

                {/* Section Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {sectionsForm.giftHampers.badge && (
                    <span className="section-label" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: '6px' }}>
                      {sectionsForm.giftHampers.badge}
                    </span>
                  )}
                  <h2 className="section-title" style={{ fontSize: '1.8rem', margin: '4px 0 8px 0' }}>
                    {sectionsForm.giftHampers.titleMain || 'Luxury Gift'}{' '}
                    <span className="gold">{sectionsForm.giftHampers.titleHighlight || 'Hampers'}</span>{' '}
                    {sectionsForm.giftHampers.titleSuffix}
                  </h2>
                  <p className="section-subtitle" style={{ maxWidth: '650px', margin: '0 auto', fontSize: '0.85rem' }}>
                    {sectionsForm.giftHampers.subtitle}
                  </p>
                </div>

                {/* Bespoke concierge & product mockups */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {/* Left: Concierge Service Card */}
                  <div style={{ background: 'rgba(10, 10, 10, 0.65)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '10px', padding: '18px' }}>
                    <span className="collection-tag gold" style={{ fontSize: '0.72rem', display: 'inline-block', marginBottom: '8px' }}>
                      Premium Service
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.2rem', margin: '0 0 12px 0' }}>
                      Bespoke Gifting Concierge
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {[
                        'Handwritten custom greeting cards',
                        'Luxurious gold-foiled presentation boxes',
                        'Bespoke corporate customization options',
                        'Temperature-controlled premium delivery',
                      ].map((benefit, bIdx) => (
                        <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--beige)' }}>
                          <CheckCircle2 size={13} color="var(--gold)" style={{ flexShrink: 0 }} />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                    <span style={{ display: 'inline-block', background: 'var(--gold)', color: '#000', fontSize: '0.78rem', fontWeight: 700, padding: '7px 14px', borderRadius: '4px' }}>
                      Inquire for Gifting
                    </span>
                  </div>

                  {/* Right: Hamper Products Showcase */}
                  {(() => {
                    const hampers = products.filter((p) => p.category === 'gift' || p.badge === 'Gift Hamper' || p.badge === 'Gift Hampers').slice(0, 2);
                    if (hampers.length === 0) {
                      return (
                        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(212,175,55,0.25)', borderRadius: '8px', padding: '24px 12px', textAlign: 'center', color: 'var(--beige)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          No gift hampers found in database.
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {hampers.map((hamper) => (
                          <div key={hamper.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '8px', padding: '10px', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'var(--gold)', color: '#000', fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>
                              Gift Hamper
                            </span>
                            {hamper.image ? (
                              <img src={getImageUrl(hamper.image)} alt={hamper.name} style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                            ) : (
                              <div style={{ width: '100%', height: '90px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', fontSize: '0.7rem' }}>No Image</div>
                            )}
                            <div style={{ fontSize: '0.78rem', color: 'var(--cream)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {hamper.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700, marginTop: '2px' }}>₹{hamper.price}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Boutique Collection */}
          {activeSectionSubTab === 'boutique' && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      SECTION 6 • 6TH ON LANDING
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Section 6: Boutique Collection
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                    Controls the boutique collection showroom heading, gold highlight, and subtitle on the landing page.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button variant="glass" size="sm" onClick={() => handleResetSection('boutique')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} /> Reset to Defaults
                  </Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Input
                  label="Eyebrow / Badge"
                  placeholder="Featured Chocolates"
                  value={sectionsForm.boutique.badge || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    boutique: { ...sectionsForm.boutique, badge: e.target.value },
                  })}
                />
                <Input
                  label="Main Title"
                  placeholder="Explore Our"
                  value={sectionsForm.boutique.titleMain || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    boutique: { ...sectionsForm.boutique, titleMain: e.target.value },
                  })}
                />
                <Input
                  label="Highlighted Text (Gold)"
                  placeholder="Collection"
                  value={sectionsForm.boutique.titleHighlight || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    boutique: { ...sectionsForm.boutique, titleHighlight: e.target.value },
                  })}
                />
                <Input
                  label="Title Suffix"
                  placeholder=""
                  value={sectionsForm.boutique.titleSuffix || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    boutique: { ...sectionsForm.boutique, titleSuffix: e.target.value },
                  })}
                />
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                    Subtitle / Description:
                  </label>
                  <textarea
                    rows={3}
                    value={sectionsForm.boutique.subtitle || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      boutique: { ...sectionsForm.boutique, subtitle: e.target.value },
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* LIVE PREVIEW FOR SECTION 6 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0e0906 0%, #1a100a 50%, #120b07 100%)',
                  border: '1px solid var(--gold)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.15)', padding: '3px 10px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={11} /> LIVE PREVIEW (CUSTOMER VIEW)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                    Renders Section 6 on the landing page
                  </span>
                </div>

                {/* Section Header */}
                <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {sectionsForm.boutique.badge && (
                    <span className="section-label" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: '6px' }}>
                      {sectionsForm.boutique.badge}
                    </span>
                  )}
                  <h2 className="section-title" style={{ fontSize: '1.8rem', margin: '4px 0 8px 0' }}>
                    {sectionsForm.boutique.titleMain || 'Explore Our'}{' '}
                    <span className="gold">{sectionsForm.boutique.titleHighlight || 'Collection'}</span>{' '}
                    {sectionsForm.boutique.titleSuffix}
                  </h2>
                  <p className="section-subtitle" style={{ maxWidth: '650px', margin: '0 auto', fontSize: '0.85rem' }}>
                    {sectionsForm.boutique.subtitle}
                  </p>
                </div>

                {/* Category Pills Preview */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {['All Creations', 'Artisanal Truffles', 'Dark Bars', 'Bonbons', 'Gift Sets'].map((cat, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: idx === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                        color: idx === 0 ? '#000' : 'var(--cream)',
                        border: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Boutique Product Cards Preview */}
                {(() => {
                  const boutiquePreview = products.slice(0, 3);
                  if (boutiquePreview.length === 0) {
                    return (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.3)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', color: 'var(--beige)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No products available in database.</p>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Add products in the Catalog tab to preview boutique cards.</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                      {boutiquePreview.map((p) => (
                        <div key={p.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '8px', padding: '12px' }}>
                          {p.image ? (
                            <img src={getImageUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', fontSize: '0.7rem' }}>No Image</div>
                          )}
                          <div style={{ fontSize: '0.8rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 700 }}>₹{p.price}</span>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', padding: '3px 8px', borderRadius: '3px', fontWeight: 600 }}>
                              Add to Bag
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Section 7: Customer Reviews */}
          {activeSectionSubTab === 'reviews' && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      SECTION 7 • 7TH ON LANDING
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Section 7: Customer Reviews &amp; Testimonials
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                    Controls the reviews section header, subtitle, and the "Share Your Experience" modal trigger button.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button variant="glass" size="sm" onClick={() => handleResetSection('reviews')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} /> Reset to Defaults
                  </Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Input
                  label="Eyebrow / Badge"
                  placeholder="Customer Love"
                  value={sectionsForm.reviews.badge || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    reviews: { ...sectionsForm.reviews, badge: e.target.value },
                  })}
                />
                <Input
                  label="Main Title"
                  placeholder="What Our"
                  value={sectionsForm.reviews.titleMain || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    reviews: { ...sectionsForm.reviews, titleMain: e.target.value },
                  })}
                />
                <Input
                  label="Highlighted Text (Gold)"
                  placeholder="Chocolate Lovers"
                  value={sectionsForm.reviews.titleHighlight || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    reviews: { ...sectionsForm.reviews, titleHighlight: e.target.value },
                  })}
                />
                <Input
                  label="Title Suffix"
                  placeholder="Say"
                  value={sectionsForm.reviews.titleSuffix || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    reviews: { ...sectionsForm.reviews, titleSuffix: e.target.value },
                  })}
                />
                <div style={{ gridColumn: 'span 2' }}>
                  <Input
                    label="Action Button Label"
                    placeholder="Share Your Experience"
                    value={sectionsForm.reviews.buttonText || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      reviews: { ...sectionsForm.reviews, buttonText: e.target.value },
                    })}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                    Subtitle / Description:
                  </label>
                  <textarea
                    rows={3}
                    value={sectionsForm.reviews.subtitle || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      reviews: { ...sectionsForm.reviews, subtitle: e.target.value },
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* LIVE PREVIEW FOR SECTION 7 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #100b08 0%, #1c130c 50%, #0e0906 100%)',
                  border: '1px solid var(--gold)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.15)', padding: '3px 10px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={11} /> LIVE PREVIEW (CUSTOMER VIEW)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                    Renders Section 7 on the landing page
                  </span>
                </div>

                {/* Section Header */}
                <div style={{ textAlign: 'center', marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {sectionsForm.reviews.badge && (
                    <span className="section-label" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: '6px' }}>
                      {sectionsForm.reviews.badge}
                    </span>
                  )}
                  <h2 className="section-title" style={{ fontSize: '1.8rem', margin: '4px 0 8px 0' }}>
                    {sectionsForm.reviews.titleMain || 'What Our'}{' '}
                    <span className="gold">{sectionsForm.reviews.titleHighlight || 'Chocolate Lovers'}</span>{' '}
                    {sectionsForm.reviews.titleSuffix || 'Say'}
                  </h2>
                  <p className="section-subtitle" style={{ maxWidth: '650px', margin: '0 auto 16px auto', fontSize: '0.85rem' }}>
                    {sectionsForm.reviews.subtitle}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid var(--gold)',
                        color: 'var(--gold)',
                        padding: '8px 18px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      <MessageSquarePlus size={15} />
                      {sectionsForm.reviews.buttonText || 'Share Your Experience'}
                    </span>
                  </div>
                </div>

                {/* Customer Testimonials Preview from Database */}
                {(() => {
                  if (cmsTestimonials.length === 0) {
                    return (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.3)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', color: 'var(--beige)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No customer reviews in database yet.</p>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Approved customer reviews from the Reviews tab will appear here.</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {cmsTestimonials.slice(0, 2).map((rev) => {
                        const authorName = rev.author || (rev as any).name || 'Chocolate Lover';
                        const revTitle = rev.title || 'Verified Customer';
                        const revText = rev.text || (rev as any).quote || (rev as any).comment || '';
                        const initials = authorName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                        return (
                          <div key={rev.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px', padding: '16px', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={14} fill={i < (rev.rating || 5) ? 'var(--gold)' : 'rgba(255,255,255,0.2)'} color="var(--gold)" />
                              ))}
                            </div>
                            <p style={{ color: 'var(--cream)', fontSize: '0.82rem', fontStyle: 'italic', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                              "{revText}"
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold) 0%, #8c6d1f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem' }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ color: 'var(--cream)', fontSize: '0.8rem', fontWeight: 600 }}>{authorName}</div>
                                <div style={{ color: 'var(--gold)', fontSize: '0.7rem' }}>{revTitle} • Verified</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Section 8: Instagram Reels */}
          {activeSectionSubTab === 'reels' && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      SECTION 8 • 8TH ON LANDING
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                      Section 8: Instagram Reels
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                    Controls the heading, highlighted brand word, and description above the interactive video reel carousel.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button variant="glass" size="sm" onClick={() => handleResetSection('instagramReels')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} /> Reset to Defaults
                  </Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Input
                  label="Eyebrow / Badge"
                  placeholder="Social Buzz"
                  value={sectionsForm.instagramReels.badge || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    instagramReels: { ...sectionsForm.instagramReels, badge: e.target.value },
                  })}
                />
                <Input
                  label="Main Title"
                  placeholder="Trending on"
                  value={sectionsForm.instagramReels.titleMain || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    instagramReels: { ...sectionsForm.instagramReels, titleMain: e.target.value },
                  })}
                />
                <Input
                  label="Highlighted Word (Gold)"
                  placeholder="Instagram"
                  value={sectionsForm.instagramReels.titleHighlight || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    instagramReels: { ...sectionsForm.instagramReels, titleHighlight: e.target.value },
                  })}
                />
                <Input
                  label="Title Suffix (Optional)"
                  placeholder=""
                  value={sectionsForm.instagramReels.titleSuffix || ''}
                  onChange={(e) => setSectionsForm({
                    ...sectionsForm,
                    instagramReels: { ...sectionsForm.instagramReels, titleSuffix: e.target.value },
                  })}
                />
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                    Subtitle / Description:
                  </label>
                  <textarea
                    rows={3}
                    value={sectionsForm.instagramReels.subtitle || ''}
                    onChange={(e) => setSectionsForm({
                      ...sectionsForm,
                      instagramReels: { ...sectionsForm.instagramReels, subtitle: e.target.value },
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* LIVE PREVIEW FOR SECTION 8 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #09090b 0%, #171115 50%, #0d080c 100%)',
                  border: '1px solid var(--gold)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.15)', padding: '3px 10px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.3)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={11} /> LIVE PREVIEW (CUSTOMER VIEW)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                    Renders Section 8 on the landing page
                  </span>
                </div>

                {/* Section Header */}
                <div style={{ textAlign: 'center', marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {sectionsForm.instagramReels.badge && (
                    <span className="section-label" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: '6px' }}>
                      {sectionsForm.instagramReels.badge}
                    </span>
                  )}
                  <h2 className="section-title" style={{ fontSize: '1.8rem', margin: '4px 0 8px 0' }}>
                    {sectionsForm.instagramReels.titleMain || 'Trending on'}{' '}
                    <span className="gold">{sectionsForm.instagramReels.titleHighlight || 'Instagram'}</span>{' '}
                    {sectionsForm.instagramReels.titleSuffix}
                  </h2>
                  <p className="section-subtitle" style={{ maxWidth: '650px', margin: '0 auto', fontSize: '0.85rem' }}>
                    {sectionsForm.instagramReels.subtitle}
                  </p>
                </div>

                {/* Reel Preview Cards from Database */}
                {cmsReels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed rgba(212,175,55,0.3)', color: 'var(--cream)' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>No active Instagram reels in database. Add reels from the <strong>Instagram Reels</strong> tab above to publish live videos.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    {cmsReels.slice(0, 4).map((reel) => {
                      const videoSrc = reel.videoUrl || reel.video_url || '';
                      const account = reel.accountName || reel.account_name || '@choviqueofficial';
                      const title = reel.title || 'Instagram Reel';
                      return (
                        <div
                          key={reel.id}
                          style={{
                            background: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(212,175,55,0.25)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                            aspectRatio: '9/14',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: '12px',
                          }}
                        >
                          {videoSrc ? (
                            <video
                              src={getImageUrl(videoSrc)}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, filter: 'brightness(0.7)' }}
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #1f1b24, #120d18)', zIndex: 0 }} />
                          )}
                          {/* Top Account */}
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '20px', alignSelf: 'flex-start' }}>
                            <InstagramGradientIcon size={13} />
                            <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 600 }}>{account}</span>
                          </div>
                          {/* Center Play Icon */}
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(212,175,55,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Video size={16} color="var(--gold)" />
                          </div>
                          {/* Bottom Caption */}
                          <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', padding: '6px 4px 0 4px', borderRadius: '4px' }}>
                            <p style={{ color: 'var(--cream)', fontSize: '0.72rem', margin: 0, lineHeight: 1.3 }}>{title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Sticky Action Bar */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              variant="gold"
              glow
              size="lg"
              disabled={isSavingSections}
              onClick={handleSaveLandingSections}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {sectionsSaveSuccess ? <Check size={18} /> : <Save size={18} />}
              <span>{isSavingSections ? 'Saving Changes...' : sectionsSaveSuccess ? 'Saved Live!' : 'Save All Section Changes'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: OUR STORY PAGE CUSTOMIZATION
          ========================================================================= */}
      {cmsTab === 'story' && (
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Card Header & Reset to Defaults */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  PAGE CUSTOMIZATION • /our-story
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.4rem' }}>
                  Our Story Page CMS
                </h3>
              </div>
              <p style={{ margin: 0, color: 'var(--beige)', fontSize: '0.88rem' }}>
                Fully customize brand heritage narrative, craftsmanship video, vision &amp; mission statements, artisanal steps, and values.
              </p>
            </div>

            <Button
              variant="glass"
              size="sm"
              onClick={handleResetStoryToDefaults}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} /> Reset to Defaults
            </Button>
          </div>

          {/* 1. HERO BANNER & MEDIA MANAGEMENT */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} /> 1. Hero Banner, Headings &amp; Media Assets
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <Input
                label="Hero Eyebrow Badge"
                placeholder="Heritage & Passion"
                value={storyForm.hero_badge || ''}
                onChange={(e) => setStoryForm({ ...storyForm, hero_badge: e.target.value })}
              />
              <Input
                label="Hero Main Title"
                placeholder="The Chovique Story"
                value={storyForm.hero_title || ''}
                onChange={(e) => setStoryForm({ ...storyForm, hero_title: e.target.value })}
              />
            </div>

            {/* Media Upload & Live Preview Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              {/* Hero Image Card with Upload & URL Fetch */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Image size={15} /> Hero Background Image
                  </span>
                </div>

                {/* Image Preview Box */}
                <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {storyForm.hero_image ? (
                    <img
                      src={storyForm.hero_image}
                      alt="Story Hero Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--beige)', fontSize: '0.8rem' }}>
                      No image configured
                    </div>
                  )}
                  {storyImageFetchSuccess && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(46, 204, 113, 0.9)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Active Preview
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    ref={storyHeroImageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadStoryHeroImage(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    disabled={isUploadingStoryHeroImage}
                    onClick={() => storyHeroImageInputRef.current?.click()}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    {isUploadingStoryHeroImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>{isUploadingStoryHeroImage ? 'Uploading Image...' : 'Upload Image from Computer'}</span>
                  </Button>
                </div>

                {/* URL Direct Input with Fetch & Preview button */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Or paste image URL (https://...)"
                    value={storyForm.hero_image || ''}
                    onChange={(e) => setStoryForm({ ...storyForm, hero_image: e.target.value })}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: 'var(--cream)',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      setStoryImageFetchSuccess(true);
                      setTimeout(() => setStoryImageFetchSuccess(false), 2500);
                      if (addToast) addToast('info', 'Loaded image preview from URL.', 'Image Fetched');
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '6px 10px' }}
                  >
                    <Eye size={12} /> Fetch &amp; Preview
                  </Button>
                </div>
              </div>

              {/* Crafting Video Card with Upload & URL Fetch */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={15} /> Craftsmanship Video
                  </span>
                </div>

                {/* Video Preview Box */}
                <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {storyForm.video_url ? (
                    <video
                      key={storyForm.video_url}
                      src={storyForm.video_url}
                      controls
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--beige)', fontSize: '0.8rem' }}>
                      No video URL configured
                    </div>
                  )}
                  {storyVideoFetchSuccess && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(46, 204, 113, 0.9)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Active Preview
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    ref={storyVideoInputRef}
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadStoryVideo(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    disabled={isUploadingStoryVideo}
                    onClick={() => storyVideoInputRef.current?.click()}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    {isUploadingStoryVideo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>{isUploadingStoryVideo ? 'Uploading Video...' : 'Upload Video File'}</span>
                  </Button>
                </div>

                {/* URL Direct Input with Fetch & Preview button */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Or paste video MP4 URL (https://...)"
                    value={storyForm.video_url || ''}
                    onChange={(e) => setStoryForm({ ...storyForm, video_url: e.target.value })}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: 'var(--cream)',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      setStoryVideoFetchSuccess(true);
                      setTimeout(() => setStoryVideoFetchSuccess(false), 2500);
                      if (addToast) addToast('info', 'Loaded video preview from URL.', 'Video Fetched');
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '6px 10px' }}
                  >
                    <Eye size={12} /> Fetch &amp; Preview
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                Hero Subtitle Description
              </label>
              <textarea
                rows={2}
                value={storyForm.hero_subtitle || ''}
                onChange={(e) => setStoryForm({ ...storyForm, hero_subtitle: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--cream)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* 2. HERITAGE NARRATIVE & BEGINNINGS */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} /> 2. Brand Heritage Narrative &amp; Beginnings
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <Input
                label="Story Badge"
                placeholder="Our Beginnings"
                value={storyForm.story_badge || ''}
                onChange={(e) => setStoryForm({ ...storyForm, story_badge: e.target.value })}
              />
              <Input
                label="Story Section Title"
                placeholder="Born from a Love of Pure Cacao"
                value={storyForm.story_title || ''}
                onChange={(e) => setStoryForm({ ...storyForm, story_title: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                  Story Paragraph 1 (Genesis &amp; Founding Quest)
                </label>
                <textarea
                  rows={3}
                  value={storyForm.story_paragraph1 || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, story_paragraph1: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--cream)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                  Story Paragraph 2 (Artisanal Craft &amp; Terroir)
                </label>
                <textarea
                  rows={3}
                  value={storyForm.story_paragraph2 || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, story_paragraph2: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--cream)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. KEY HERITAGE FEATURES */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} /> 3. Key Heritage Features (Spotlight Badges)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <Input
                  label="Feature 1 Title"
                  placeholder="100% Traceable"
                  value={storyForm.feature1_title || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, feature1_title: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <Input
                  label="Feature 1 Description"
                  placeholder="Direct relationship with farmers to ensure equity."
                  value={storyForm.feature1_desc || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, feature1_desc: e.target.value })}
                />
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <Input
                  label="Feature 2 Title"
                  placeholder="Micro-Batch Production"
                  value={storyForm.feature2_title || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, feature2_title: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <Input
                  label="Feature 2 Description"
                  placeholder="Ensuring unmatched precision and quality control."
                  value={storyForm.feature2_desc || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, feature2_desc: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* 4. VISION & MISSION */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} /> 4. Vision &amp; Mission Statements
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <Input
                  label="Our Vision — Title"
                  placeholder="Our Vision"
                  value={storyForm.vision_title || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, vision_title: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                  Vision Description
                </label>
                <textarea
                  rows={4}
                  value={storyForm.vision_text || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, vision_text: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--cream)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <Input
                  label="Our Mission — Title"
                  placeholder="Our Mission"
                  value={storyForm.mission_title || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, mission_title: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                  Mission Description
                </label>
                <textarea
                  rows={4}
                  value={storyForm.mission_text || ''}
                  onChange={(e) => setStoryForm({ ...storyForm, mission_text: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--cream)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 5. PROCESS STEPS */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} /> 5. Artisanal Craft Process Steps (4 Steps)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {(storyForm.steps || []).map((stepItem, sIdx) => (
                <div key={sIdx} style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700 }}>
                      STEP {sIdx + 1}
                    </span>
                    <input
                      value={stepItem.num || `0${sIdx + 1}`}
                      onChange={(e) => {
                        const copy = [...(storyForm.steps || [])];
                        copy[sIdx] = { ...copy[sIdx], num: e.target.value };
                        setStoryForm({ ...storyForm, steps: copy });
                      }}
                      style={{
                        width: '45px',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        background: 'rgba(var(--gold-rgb), 0.15)',
                        border: '1px solid var(--gold)',
                        color: 'var(--gold)',
                        borderRadius: '4px',
                        padding: '2px 4px',
                      }}
                    />
                  </div>
                  <Input
                    label="Step Title"
                    value={stepItem.title || ''}
                    onChange={(e) => {
                      const copy = [...(storyForm.steps || [])];
                      copy[sIdx] = { ...copy[sIdx], title: e.target.value };
                      setStoryForm({ ...storyForm, steps: copy });
                    }}
                    style={{ marginBottom: '10px' }}
                  />
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--beige)', marginBottom: '4px' }}>
                    Step Description
                  </label>
                  <textarea
                    rows={3}
                    value={stepItem.desc || ''}
                    onChange={(e) => {
                      const copy = [...(storyForm.steps || [])];
                      copy[sIdx] = { ...copy[sIdx], desc: e.target.value };
                      setStoryForm({ ...storyForm, steps: copy });
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      padding: '8px',
                      color: 'var(--cream)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 6. CORE PILLARS & VALUES */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={16} /> 6. Core Pillars &amp; Values (3 Pillars)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {(storyForm.values || []).map((valItem, vIdx) => (
                <div key={vIdx} style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                    PILLAR #{vIdx + 1}
                  </span>
                  <Input
                    label="Pillar Title"
                    value={valItem.title || ''}
                    onChange={(e) => {
                      const copy = [...(storyForm.values || [])];
                      copy[vIdx] = { ...copy[vIdx], title: e.target.value };
                      setStoryForm({ ...storyForm, values: copy });
                    }}
                    style={{ marginBottom: '10px' }}
                  />
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--beige)', marginBottom: '4px' }}>
                    Pillar Description
                  </label>
                  <textarea
                    rows={3}
                    value={valItem.desc || ''}
                    onChange={(e) => {
                      const copy = [...(storyForm.values || [])];
                      copy[vIdx] = { ...copy[vIdx], desc: e.target.value };
                      setStoryForm({ ...storyForm, values: copy });
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      padding: '8px',
                      color: 'var(--cream)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Card Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
            {storySaveSuccess && (
              <span style={{ color: '#2ecc71', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={16} /> Our Story Page Saved &amp; Published Live!
              </span>
            )}
            <Button
              variant="gold"
              glow
              size="lg"
              onClick={handleSaveStoryPage}
              disabled={isSavingStory}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}
            >
              {isSavingStory ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSavingStory ? 'Publishing Changes...' : 'Save & Publish Our Story'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: CONTACT US PAGE CUSTOMIZATION
          ========================================================================= */}
      {cmsTab === 'contact' && (
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Card Header & Reset to Defaults */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', background: 'rgba(var(--gold-rgb), 0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  PAGE CUSTOMIZATION • /contact
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.4rem' }}>
                  Contact Us &amp; Concierge CMS
                </h3>
              </div>
              <p style={{ margin: 0, color: 'var(--beige)', fontSize: '0.88rem' }}>
                Update customer service hotlines, WhatsApp concierge, email inboxes, support hours, and flagship address.
              </p>
            </div>

            <Button
              variant="glass"
              size="sm"
              onClick={handleResetContactToDefaults}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} /> Reset to Defaults
            </Button>
          </div>

          {/* 1. HERO BANNER & MEDIA MANAGEMENT */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} /> 1. Contact Hero Heading &amp; Media Assets
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <Input
                label="Hero Badge"
                placeholder="CONTACT US"
                value={contactForm.hero_badge || ''}
                onChange={(e) => setContactForm({ ...contactForm, hero_badge: e.target.value })}
              />
              <Input
                label="Hero Main Title"
                placeholder="We're Here to Help!"
                value={contactForm.hero_title || ''}
                onChange={(e) => setContactForm({ ...contactForm, hero_title: e.target.value })}
              />
            </div>

            {/* Contact Hero Image Card with Upload & URL Fetch */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Image size={15} /> Hero Background Image
                </span>
              </div>

              {/* Image Preview Box */}
              <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
                {contactForm.hero_image ? (
                  <img
                    src={contactForm.hero_image}
                    alt="Contact Hero Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/contact-hero.png';
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--beige)', fontSize: '0.8rem' }}>
                    No image configured
                  </div>
                )}
                {contactImageFetchSuccess && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(46, 204, 113, 0.9)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} /> Active Preview
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={contactHeroImageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadContactHeroImage(file);
                  }}
                />
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  disabled={isUploadingContactHeroImage}
                  onClick={() => contactHeroImageInputRef.current?.click()}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                >
                  {isUploadingContactHeroImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  <span>{isUploadingContactHeroImage ? 'Uploading Image...' : 'Upload Image from Computer'}</span>
                </Button>
              </div>

              {/* URL Direct Input with Fetch & Preview button */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Or paste image URL (https://...)"
                  value={contactForm.hero_image || ''}
                  onChange={(e) => setContactForm({ ...contactForm, hero_image: e.target.value })}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: 'var(--cream)',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    setContactImageFetchSuccess(true);
                    setTimeout(() => setContactImageFetchSuccess(false), 2500);
                    if (addToast) addToast('info', 'Loaded image preview from URL.', 'Image Fetched');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '6px 10px' }}
                >
                  <Eye size={12} /> Fetch &amp; Preview
                </Button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                Hero Subtitle Description
              </label>
              <textarea
                rows={2}
                value={contactForm.hero_subtitle || ''}
                onChange={(e) => setContactForm({ ...contactForm, hero_subtitle: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--cream)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* 2. CALLING & WHATSAPP CHANNELS */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall size={16} /> 2. Phone Lines, WhatsApp &amp; Hours
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <Input
                label="Primary Support Hotline"
                placeholder="+91 83098 54870"
                value={contactForm.phone || ''}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              />
              <Input
                label="WhatsApp Concierge Number"
                placeholder="+91 83098 54870"
                value={contactForm.whatsapp || ''}
                onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })}
              />
              <Input
                label="Primary Email Address"
                placeholder="support@chovique.com"
                value={contactForm.email || ''}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              />
              <Input
                label="Support Hours & Days"
                placeholder="Mon - Sat: 10:00 AM - 8:00 PM | Sunday: 11:00 AM - 6:00 PM"
                value={contactForm.support_hours || ''}
                onChange={(e) => setContactForm({ ...contactForm, support_hours: e.target.value })}
              />
            </div>
          </div>

          {/* 3. PHYSICAL ATELIER & SOCIALS */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} /> 3. Flagship Atelier Address &amp; Social Links
            </h4>
            <div style={{ marginBottom: '16px' }}>
              <Input
                label="Full Address (with City & Pincode)"
                placeholder="42, MG Road, Indiranagar, Bangalore, Karnataka 560038"
                value={contactForm.address || ''}
                onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <Input
                label="Instagram Profile Link"
                placeholder="https://instagram.com/chovique"
                value={contactForm.instagram || ''}
                onChange={(e) => setContactForm({ ...contactForm, instagram: e.target.value })}
              />
              <Input
                label="Facebook Page Link"
                placeholder="https://facebook.com/chovique"
                value={contactForm.facebook || ''}
                onChange={(e) => setContactForm({ ...contactForm, facebook: e.target.value })}
              />
              <Input
                label="Twitter / X Link"
                placeholder="https://x.com/chovique"
                value={contactForm.twitter || ''}
                onChange={(e) => setContactForm({ ...contactForm, twitter: e.target.value })}
              />
            </div>
          </div>

          {/* 4. SERVICE GUARANTEE BADGES */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '20px' }}>
            <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> 4. Service Guarantee Badges (3 Badges)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <Input
                label="Badge 1 Title"
                placeholder="Replies within 24 Hours"
                value={contactForm.badge_1 || ''}
                onChange={(e) => setContactForm({ ...contactForm, badge_1: e.target.value })}
              />
              <Input
                label="Badge 2 Title"
                placeholder="Dedicated Support"
                value={contactForm.badge_2 || ''}
                onChange={(e) => setContactForm({ ...contactForm, badge_2: e.target.value })}
              />
              <Input
                label="Badge 3 Title"
                placeholder="Reliable & Quick Assistance"
                value={contactForm.badge_3 || ''}
                onChange={(e) => setContactForm({ ...contactForm, badge_3: e.target.value })}
              />
            </div>
          </div>

          {/* Bottom Card Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
            {contactSaveSuccess && (
              <span style={{ color: '#2ecc71', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={16} /> Contact Details Saved &amp; Published Live!
              </span>
            )}
            <Button
              variant="gold"
              glow
              size="lg"
              onClick={handleSaveContactPage}
              disabled={isSavingContact}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}
            >
              {isSavingContact ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSavingContact ? 'Publishing Changes...' : 'Save & Publish Contact Details'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SITE STATS / METRICS
          ========================================================================= */}
      {cmsTab === 'stats' && (
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
          {/* Header & Clean Primary Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: '0 0 6px 0', fontSize: '1.4rem' }}>
                Homepage Counter Numbers
              </h3>
              <p style={{ color: 'var(--beige)', fontSize: '0.88rem', margin: 0 }}>
                Live metrics displayed in the animated counter section of the landing page.
              </p>
            </div>

            {/* Exactly two clean, balanced buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isFetchingDbStats}
                onClick={handleFetchFromDatabase}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderColor: 'rgba(212, 175, 55, 0.4)',
                  color: 'var(--gold)',
                  background: 'rgba(212, 175, 55, 0.06)',
                }}
              >
                {isFetchingDbStats ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                <span>{isFetchingDbStats ? 'Fetching DB...' : 'Fetch from Database'}</span>
              </Button>

              <Button
                type="button"
                variant="glass"
                size="md"
                onClick={handleResetStatsToDefaults}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderColor: 'rgba(212, 175, 55, 0.3)',
                }}
              >
                <RotateCcw size={16} />
                <span>Reset to Defaults</span>
              </Button>
            </div>
          </div>

          {/* Clean 4-Card Inputs Grid (No clumsy inner buttons or banners) */}
          <form onSubmit={handleSaveSiteStats}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              <Input
                label="Happy Customers (Counter Target) *"
                type="number"
                required
                value={siteStats.happy_customers}
                onChange={(e) => setSiteStats({ ...siteStats, happy_customers: Number(e.target.value) })}
              />
              <Input
                label="Products Available (Counter Target) *"
                type="number"
                required
                value={siteStats.unique_flavors}
                onChange={(e) => setSiteStats({ ...siteStats, unique_flavors: Number(e.target.value) })}
              />
              <Input
                label="Orders Delivered (Counter Target) *"
                type="number"
                required
                value={siteStats.countries_shipped}
                onChange={(e) => setSiteStats({ ...siteStats, countries_shipped: Number(e.target.value) })}
              />
              <Input
                label="Customer Rating % (Counter Target) *"
                type="number"
                required
                value={siteStats.five_star_reviews_percent}
                onChange={(e) => setSiteStats({ ...siteStats, five_star_reviews_percent: Number(e.target.value) })}
              />
            </div>

            {/* =========================================================================
                CUSTOMER VIEW LIVE PREVIEW: MILESTONE COUNTERS STRIP
                ========================================================================= */}
            <div
              style={{
                background: 'rgba(12, 7, 3, 0.9)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '12px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Preview Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} color="var(--gold)" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--cream)', letterSpacing: '0.04em' }}>
                    Customer View Live Preview (Homepage Animated Counter Strip)
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--gold)',
                    background: 'rgba(212, 175, 55, 0.12)',
                    padding: '3px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    fontWeight: 500,
                  }}
                >
                  Live Landing Page Presentation
                </span>
              </div>

              {/* Rendered Live Counter Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  textAlign: 'center',
                  padding: '16px 8px',
                  background: 'linear-gradient(180deg, rgba(26, 15, 8, 0.6) 0%, rgba(13, 8, 4, 0.8) 100%)',
                  borderRadius: '10px',
                  border: '1px solid rgba(212, 175, 55, 0.16)',
                }}
              >
                {/* Milestone 1 */}
                <div style={{ padding: '12px 8px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: 'var(--gold)',
                      lineHeight: 1.1,
                      textShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    {Number(siteStats.happy_customers || 0).toLocaleString()}+
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--beige)',
                      opacity: 0.9,
                      marginTop: '6px',
                      fontWeight: 600,
                    }}
                  >
                    Happy Connoisseurs
                  </div>
                </div>

                {/* Milestone 2 */}
                <div style={{ padding: '12px 8px', borderLeft: '1px solid rgba(212, 175, 55, 0.15)' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: 'var(--gold)',
                      lineHeight: 1.1,
                      textShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    {Number(siteStats.unique_flavors || 0).toLocaleString()}+
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--beige)',
                      opacity: 0.9,
                      marginTop: '6px',
                      fontWeight: 600,
                    }}
                  >
                    Unique Flavors &amp; Creations
                  </div>
                </div>

                {/* Milestone 3 */}
                <div style={{ padding: '12px 8px', borderLeft: '1px solid rgba(212, 175, 55, 0.15)' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: 'var(--gold)',
                      lineHeight: 1.1,
                      textShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    {Number(siteStats.countries_shipped || 0).toLocaleString()}+
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--beige)',
                      opacity: 0.9,
                      marginTop: '6px',
                      fontWeight: 600,
                    }}
                  >
                    Orders Delivered
                  </div>
                </div>

                {/* Milestone 4 */}
                <div style={{ padding: '12px 8px', borderLeft: '1px solid rgba(212, 175, 55, 0.15)' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: 'var(--gold)',
                      lineHeight: 1.1,
                      textShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    {siteStats.five_star_reviews_percent}%
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--beige)',
                      opacity: 0.9,
                      marginTop: '6px',
                      fontWeight: 600,
                    }}
                  >
                    Customer Rating &amp; Reviews
                  </div>
                </div>
              </div>

              {/* Informative Helper Caption */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '0.78rem', color: 'var(--beige)', opacity: 0.8 }}>
                <Sparkles size={14} color="var(--gold)" />
                <span>
                  When customers visit Chovique's homepage, each number triggers an animated counter that counts up to these configured milestone figures.
                </span>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="gold"
                glow
                size="lg"
                type="submit"
                disabled={isSavingStats}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '220px', justifyContent: 'center' }}
              >
                {isSavingStats ? <Loader2 size={18} className="animate-spin" /> : statsSavedSuccess ? <Check size={18} /> : <Save size={18} />}
                <span>{isSavingStats ? 'Publishing...' : statsSavedSuccess ? 'Saved Live!' : 'Save & Publish Live Stats'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 4: INSTAGRAM REELS MANAGEMENT (URL Fetch Based)
          ========================================================================= */}
      {cmsTab === 'reels' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.3rem' }}>
                Instagram Reel Cards ({cmsReels?.length || 0})
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                Manage featured video reels. Fetch automatically via Instagram URL or upload custom video files directly.
              </p>
            </div>
            <Button
              variant="gold"
              size="sm"
              glow
              onClick={() => {
                setAddReelTab('url');
                setAddReelUrl('');
                setAddReelMeta(null);
                setAddReelCaption('');
                setAddReelAccount('');
                handleAddReelFileChange(null);
                setAddReelError('');
                setAddReelSuccess('');
                setShowAddReelModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Add Reel / Video
            </Button>
          </div>

          {cmsReels.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <Video size={40} color="var(--gold)" style={{ opacity: 0.5, marginBottom: '12px' }} />
              <h4 style={{ color: 'var(--cream)', margin: '0 0 6px 0' }}>No Instagram Reels Configured</h4>
              <p style={{ color: 'var(--beige)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                Add your first reel by fetching via Instagram URL or uploading a video file directly.
              </p>
              <Button
                variant="gold"
                size="sm"
                glow
                onClick={() => {
                  setAddReelTab('url');
                  setAddReelUrl('');
                  setAddReelMeta(null);
                  setAddReelCaption('');
                  setAddReelAccount('');
                  handleAddReelFileChange(null);
                  setAddReelError('');
                  setAddReelSuccess('');
                  setShowAddReelModal(true);
                }}
              >
                + Add Reel / Video
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {cmsReels.map((reel) => {
                const directIg = reel.instagramUrl || reel.videoUrl || 'https://instagram.com';
                return (
                  <div
                    key={reel.id}
                    className="glass-panel"
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: 'rgba(15, 12, 10, 0.75)',
                      boxShadow: 'var(--glass-shadow)',
                    }}
                  >
                    {/* Video Stream Preview */}
                    <div style={{ height: '220px', borderRadius: '8px', overflow: 'hidden', background: '#000', position: 'relative' }}>
                      {reel.videoUrl ? (
                        <video
                          src={getImageUrl(reel.videoUrl)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          muted
                          controls
                          playsInline
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--beige)', fontSize: '0.85rem' }}>
                          No Playable Video Stream
                        </div>
                      )}
                    </div>

                    {/* Reel Title & Creator */}
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', color: 'var(--cream)', fontSize: '0.96rem', fontWeight: 600 }}>
                        {reel.title || 'Chocolate Reel'}
                      </h4>
                      {reel.accountName && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <InstagramGradientIcon size={14} /> {reel.accountName}
                        </span>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <a
                        href={directIg}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--gold)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        <ExternalLink size={13} /> View on IG
                      </a>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEditReel(reel)}
                          title="Edit Reel URL / Details"
                          style={{
                            background: 'rgba(var(--gold-rgb), 0.15)',
                            border: '1px solid var(--gold)',
                            color: 'var(--gold)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem',
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete this Instagram reel ("${reel.title || reel.accountName || 'Reel'}")?`)) return;
                            try {
                              await adminService.deleteReel(reel.id);
                              fetchCmsReels();
                              if (addToast) addToast('success', 'Reel removed from website.', 'Deleted');
                              if (addLogEntry) addLogEntry(`Deleted Instagram reel: ${reel.title || reel.id}`, 'setting');
                            } catch (err: any) {
                              alert(err?.detail || err?.message || 'Failed to delete reel.');
                            }
                          }}
                          title="Delete Reel"
                          style={{
                            background: 'rgba(231, 76, 60, 0.15)',
                            border: '1px solid #e74c3c',
                            color: '#e74c3c',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Reel / Video Modal (URL Fetch OR Direct File Upload) */}
          <AnimatePresence>
            {showAddReelModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '20px',
                }}
                onClick={() => setShowAddReelModal(false)}
              >
                <div
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    width: '100%',
                    maxWidth: '560px',
                    borderRadius: '14px',
                    border: '1px solid var(--gold)',
                    background: '#16141a',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: '0 0 6px 0', fontSize: '1.25rem' }}>
                    Add Instagram Reel / Video
                  </h3>
                  <p style={{ margin: '0 0 16px 0', color: 'var(--beige)', fontSize: '0.82rem' }}>
                    Choose your method: Fetch automatically from an Instagram link or directly upload your own video file.
                  </p>

                  {/* Mode Tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { setAddReelTab('url'); setAddReelError(''); }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: addReelTab === 'url' ? 'rgba(var(--gold-rgb), 0.25)' : 'transparent',
                        border: addReelTab === 'url' ? '1px solid var(--gold)' : '1px solid transparent',
                        color: addReelTab === 'url' ? 'var(--gold)' : 'var(--beige)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Zap size={14} /> 1. Fetch via Instagram URL
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddReelTab('upload'); setAddReelError(''); }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: addReelTab === 'upload' ? 'rgba(var(--gold-rgb), 0.25)' : 'transparent',
                        border: addReelTab === 'upload' ? '1px solid var(--gold)' : '1px solid transparent',
                        color: addReelTab === 'upload' ? 'var(--gold)' : 'var(--beige)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Upload size={14} /> 2. Upload Video Directly
                    </button>
                  </div>

                  <form onSubmit={handlePublishReel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* OPTION 1: URL FETCH */}
                    {addReelTab === 'url' && (
                      <>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                            Instagram Reel URL *
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="url"
                              placeholder="https://www.instagram.com/reel/C..."
                              value={addReelUrl}
                              onChange={(e) => setAddReelUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleFetchAddReel();
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.5)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--cream)',
                                fontSize: '0.9rem',
                                outline: 'none',
                              }}
                            />
                            <Button
                              variant="gold"
                              type="button"
                              glow
                              disabled={isFetchingAddReel || !addReelUrl.trim()}
                              onClick={handleFetchAddReel}
                              style={{ minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              {isFetchingAddReel ? (
                                <>
                                  <Loader2 size={15} className="animate-spin" />
                                  <span>Fetching...</span>
                                </>
                              ) : (
                                <>
                                  <Zap size={15} />
                                  <span>Fetch Reel</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {isFetchingAddReel && (
                          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(var(--gold-rgb), 0.12)', border: '1px solid rgba(var(--gold-rgb), 0.3)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: 'var(--gold)' }}>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Connecting to Instagram... Resolving direct video MP4 and creator handle.</span>
                          </div>
                        )}

                        {addReelMeta && (
                          <div style={{ padding: '14px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', border: '1px solid rgba(var(--gold-rgb), 0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <InstagramGradientIcon size={16} /> {addReelAccount || addReelMeta.account_name || 'Creator Verified'}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: '#2ecc71', fontWeight: 600 }}>Video Stream Ready</span>
                            </div>

                            {addReelMeta.video_url && (
                              <video
                                src={getImageUrl(addReelMeta.video_url)}
                                controls
                                muted
                                playsInline
                                style={{ width: '100%', maxHeight: '240px', borderRadius: '8px', background: '#000', objectFit: 'contain' }}
                              />
                            )}

                            <Input
                              label="Creator Account Handle"
                              placeholder="@choviqueofficial"
                              value={addReelAccount}
                              onChange={(e) => setAddReelAccount(e.target.value)}
                            />

                            <Input
                              label="Title / Description (Shown on Reel)"
                              placeholder="e.g. Artisanal Crafting Process"
                              value={addReelCaption}
                              onChange={(e) => setAddReelCaption(e.target.value)}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* OPTION 2: DIRECT VIDEO UPLOAD */}
                    {addReelTab === 'upload' && (
                      <>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                            Choose Video File * (MP4 / WebM)
                          </label>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleAddReelFileChange(e.target.files?.[0] || null)}
                            style={{
                              color: 'var(--cream)',
                              fontSize: '0.84rem',
                              padding: '10px 14px',
                              background: 'rgba(0,0,0,0.5)',
                              borderRadius: '8px',
                              border: '1px dashed rgba(var(--gold-rgb), 0.4)',
                              width: '100%',
                              boxSizing: 'border-box',
                              cursor: 'pointer',
                            }}
                          />
                        </div>

                        {addReelVideoFilePreview && (
                          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: '1px solid rgba(var(--gold-rgb), 0.3)' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                              Video Preview:
                            </span>
                            <video
                              src={addReelVideoFilePreview}
                              controls
                              muted
                              playsInline
                              style={{ width: '100%', maxHeight: '220px', borderRadius: '6px', background: '#000', objectFit: 'contain' }}
                            />
                          </div>
                        )}

                        <Input
                          label="Creator Account Handle *"
                          placeholder="@choviqueofficial"
                          value={addReelAccount}
                          onChange={(e) => setAddReelAccount(e.target.value)}
                        />

                        <Input
                          label="Title / Description (Shown on Reel) *"
                          placeholder="e.g. Handmade Belgian Truffles"
                          value={addReelCaption}
                          onChange={(e) => setAddReelCaption(e.target.value)}
                        />

                        <Input
                          label="Instagram Redirect URL (Optional)"
                          placeholder="https://www.instagram.com/choviqueofficial"
                          value={addReelUrl}
                          onChange={(e) => setAddReelUrl(e.target.value)}
                        />
                      </>
                    )}

                    {addReelSuccess && (
                      <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(46, 204, 113, 0.12)', border: '1px solid rgba(46, 204, 113, 0.35)', color: '#2ecc71', fontSize: '0.84rem', fontWeight: 600 }}>
                        <span>✓ {addReelSuccess}</span>
                      </div>
                    )}

                    {addReelError && (
                      <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid rgba(231, 76, 60, 0.35)', color: '#e74c3c', fontSize: '0.82rem' }}>
                        <span>⚠️ {addReelError}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <Button
                        variant="gold"
                        type="submit"
                        glow
                        disabled={isPublishingReel || (addReelTab === 'url' ? !addReelMeta : !addReelVideoFile)}
                        style={{ flex: 1 }}
                      >
                        {isPublishingReel ? 'Publishing Reel...' : 'Publish Reel to Landing Page'}
                      </Button>
                      <Button variant="glass" type="button" onClick={() => setShowAddReelModal(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Reel Modal (URL Fetch OR Replace Video File) */}
          <AnimatePresence>
            {editingReel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '20px',
                }}
                onClick={() => setEditingReel(null)}
              >
                <div
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    width: '100%',
                    maxWidth: '560px',
                    borderRadius: '14px',
                    border: '1px solid var(--gold)',
                    background: '#16141a',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: '0 0 6px 0', fontSize: '1.25rem' }}>
                    Edit Instagram Reel / Video
                  </h3>
                  <p style={{ margin: '0 0 16px 0', color: 'var(--beige)', fontSize: '0.82rem' }}>
                    Re-fetch via Instagram URL, upload a replacement video file, or edit creator details and title.
                  </p>

                  <form onSubmit={handleSaveEditReel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* URL Input + Fetch Button */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                        Instagram Reel URL
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="url"
                          placeholder="https://www.instagram.com/reel/C..."
                          value={editReelUrl}
                          onChange={(e) => setEditReelUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleFetchEditReel();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--cream)',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                        <Button
                          variant="gold"
                          type="button"
                          glow
                          disabled={isFetchingEditReel || !editReelUrl.trim()}
                          onClick={handleFetchEditReel}
                          style={{ minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          {isFetchingEditReel ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Fetching...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={15} />
                              <span>Fetch Reel</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Or Upload Replacement Video */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                        Or Upload Replacement Video File (Optional)
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleEditReelFileChange(e.target.files?.[0] || null)}
                        style={{
                          color: 'var(--cream)',
                          fontSize: '0.84rem',
                          padding: '8px 12px',
                          background: 'rgba(0,0,0,0.5)',
                          borderRadius: '8px',
                          border: '1px dashed rgba(var(--gold-rgb), 0.4)',
                          width: '100%',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
                      />
                    </div>

                    {editReelSuccess && (
                      <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(46, 204, 113, 0.12)', border: '1px solid rgba(46, 204, 113, 0.35)', color: '#2ecc71', fontSize: '0.84rem', fontWeight: 600 }}>
                        <span>✓ {editReelSuccess}</span>
                      </div>
                    )}

                    {editReelError && (
                      <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid rgba(231, 76, 60, 0.35)', color: '#e74c3c', fontSize: '0.82rem' }}>
                        <span>⚠️ {editReelError}</span>
                      </div>
                    )}

                    <Input
                      label="Creator Account Handle"
                      placeholder="@choviqueofficial"
                      value={editReelAccount}
                      onChange={(e) => setEditReelAccount(e.target.value)}
                    />

                    <Input
                      label="Title / Description (Shown on Reel)"
                      placeholder="e.g. Master Chocolatier at Work"
                      value={editReelCaption}
                      onChange={(e) => setEditReelCaption(e.target.value)}
                    />

                    {/* Video Stream Preview */}
                    {(editReelVideoFilePreview || editReelMeta?.video_url || editingReel.videoUrl) && (
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: '1px solid rgba(var(--gold-rgb), 0.2)' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                          Video Stream Preview:
                        </span>
                        <video
                          src={editReelVideoFilePreview || getImageUrl(editReelMeta?.video_url || editingReel.videoUrl!)}
                          controls
                          muted
                          playsInline
                          style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', background: '#000', objectFit: 'contain' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <Button
                        variant="gold"
                        type="submit"
                        glow
                        disabled={isUpdatingReel}
                        style={{ flex: 1 }}
                      >
                        {isUpdatingReel ? 'Saving Changes...' : 'Save Changes'}
                      </Button>
                      <Button variant="glass" type="button" onClick={() => setEditingReel(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* =========================================================================
          TAB 7: FOOTER CONTENT MANAGEMENT SYSTEM (CMS)
          ========================================================================= */}
      {cmsTab === 'footer' && (
        <div>
          {/* Header & Main Save Bar */}
          <div
            style={{
              background: 'rgba(26, 16, 10, 0.85)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span className="section-label">Global Website Footer</span>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.5rem', margin: '4px 0 0 0' }}>
                Footer Content Management System
              </h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--beige)', fontSize: '0.85rem' }}>
                Manage brand presentation, social media handles, navigation link columns, concierge helpline card, handcrafted benefit badges, and legal & payment policies displayed across the entire store.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                variant="glass"
                size="sm"
                onClick={handleResetFooter}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={14} />
                <span>Reset to Defaults</span>
              </Button>

              <Button
                variant="gold"
                glow
                size="md"
                disabled={isSavingFooter}
                onClick={handleSaveFooter}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {footerSaveSuccess ? <Check size={16} /> : <Save size={16} />}
                <span>{isSavingFooter ? 'Saving Changes...' : footerSaveSuccess ? 'Saved Live!' : 'Save & Publish Footer'}</span>
              </Button>
            </div>
          </div>

          {/* Footer Sub-Tabs Navigation */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              overflowX: 'auto',
              paddingBottom: '4px',
            }}
          >
            {[
              { id: 'social', label: '📱 Social Media Handles', icon: Share2 },
              { id: 'brand', label: '🍫 Brand & Concierge', icon: Headphones },
              { id: 'nav', label: '🧭 Navigation Link Columns', icon: Layers },
              { id: 'benefits', label: '✨ Artisanal Benefits Strip', icon: Sparkles },
              { id: 'legal', label: '⚖️ Legal & Payment Badges', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFooterSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFooterSubTab(tab.id as any)}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(184, 134, 11, 0.15) 100%)' : 'rgba(255, 255, 255, 0.05)',
                    border: isActive ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: isActive ? 'var(--gold)' : 'var(--cream)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={14} color={isActive ? 'var(--gold)' : 'var(--beige)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUB-TAB 1: SOCIAL MEDIA LINKS */}
          {activeFooterSubTab === 'social' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              {/* Add New Social Link Form Card */}
              <div
                style={{
                  background: 'rgba(26, 16, 10, 0.75)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Add New Social Media Handle
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                      Platform
                    </label>
                    <select
                      value={newSocialPlatform}
                      onChange={(e) => {
                        const plat = e.target.value;
                        setNewSocialPlatform(plat);
                        setNewSocialName(plat.charAt(0).toUpperCase() + plat.slice(1));
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        color: 'var(--cream)',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    >
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="youtube">YouTube</option>
                      <option value="pinterest">Pinterest</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="tiktok">TikTok</option>
                      <option value="other">Other / Website</option>
                    </select>
                  </div>

                  <Input
                    label="Display Label"
                    placeholder="e.g. Instagram"
                    value={newSocialName}
                    onChange={(e) => setNewSocialName(e.target.value)}
                  />

                  <Input
                    label="Profile / Direct URL"
                    placeholder="https://instagram.com/choviqueofficial"
                    value={newSocialUrl}
                    onChange={(e) => setNewSocialUrl(e.target.value)}
                  />

                  <div>
                    <Button
                      variant="gold"
                      glow
                      onClick={() => {
                        if (!newSocialUrl.trim()) {
                          if (addToast) addToast('warning', 'Please enter a valid social profile URL.', 'URL Required');
                          return;
                        }
                        const newLink = {
                          id: `soc-${Date.now()}`,
                          platform: newSocialPlatform,
                          name: newSocialName.trim() || newSocialPlatform,
                          url: newSocialUrl.trim(),
                          is_active: true,
                        };
                        setFooterForm((prev) => ({
                          ...prev,
                          social_links: [...(prev.social_links || []), newLink],
                        }));
                        setNewSocialUrl('');
                        if (addToast) addToast('success', `Added ${newLink.name} profile! Click "Save & Publish" to update live.`, 'Social Added');
                      }}
                      style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Plus size={16} />
                      <span>Add Profile</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* List of Configured Social Links */}
              <div
                style={{
                  background: 'rgba(26, 16, 10, 0.75)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.1rem' }}>
                    Configured Social Profiles ({footerForm.social_links?.length || 0})
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--beige)', opacity: 0.8 }}>
                    Toggle visibility or update links below
                  </span>
                </div>

                {(!footerForm.social_links || footerForm.social_links.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed rgba(212,175,55,0.3)', color: 'var(--cream)' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>No social media profiles configured. Use the form above to add your official social links.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {footerForm.social_links.map((social, index) => (
                      <div
                        key={social.id || index}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 150px 1fr auto auto',
                          gap: '12px',
                          alignItems: 'center',
                          background: 'rgba(0,0,0,0.4)',
                          border: social.is_active ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          opacity: social.is_active ? 1 : 0.6,
                        }}
                      >
                        {/* Icon Pill */}
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: social.is_active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                            border: social.is_active ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: social.is_active ? 'var(--gold)' : 'var(--beige)',
                          }}
                        >
                          {renderSocialIcon(social.platform, 18)}
                        </div>

                        {/* Platform Selector */}
                        <select
                          value={social.platform}
                          onChange={(e) => {
                            const newPlat = e.target.value;
                            setFooterForm((prev) => ({
                              ...prev,
                              social_links: prev.social_links.map((s, i) => i === index ? { ...s, platform: newPlat } : s),
                            }));
                          }}
                          style={{
                            padding: '8px 10px',
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '6px',
                            color: 'var(--cream)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="youtube">YouTube</option>
                          <option value="pinterest">Pinterest</option>
                          <option value="twitter">Twitter / X</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="tiktok">TikTok</option>
                          <option value="other">Other</option>
                        </select>

                        {/* URL Input */}
                        <input
                          type="text"
                          placeholder="https://..."
                          value={social.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFooterForm((prev) => ({
                              ...prev,
                              social_links: prev.social_links.map((s, i) => i === index ? { ...s, url: val } : s),
                            }));
                          }}
                          style={{
                            padding: '8px 12px',
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '6px',
                            color: 'var(--cream)',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />

                        {/* Active Toggle Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setFooterForm((prev) => ({
                              ...prev,
                              social_links: prev.social_links.map((s, i) => i === index ? { ...s, is_active: !s.is_active } : s),
                            }));
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: social.is_active ? '1px solid #10b981' : '1px solid #6b7280',
                            background: social.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                            color: social.is_active ? '#10b981' : '#9ca3af',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {social.is_active ? '✓ Active' : '✕ Hidden'}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete ${social.name || social.platform} link?`)) return;
                            setFooterForm((prev) => ({
                              ...prev,
                              social_links: prev.social_links.filter((_, i) => i !== index),
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove handle"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: BRAND & CONCIERGE */}
          {activeFooterSubTab === 'brand' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {/* Brand Description Box */}
              <div
                style={{
                  background: 'rgba(26, 16, 10, 0.75)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: '0 0 14px 0', fontSize: '1.1rem' }}>
                  Brand Identity & Narrative
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <Input
                    label="Footer Brand Logo URL"
                    placeholder="/assets/popular-bg.jpg"
                    value={footerForm.brand_logo_url || ''}
                    onChange={(e) => setFooterForm({ ...footerForm, brand_logo_url: e.target.value })}
                  />

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                      Brand Description / Summary:
                    </label>
                    <textarea
                      rows={4}
                      value={footerForm.brand_description || ''}
                      onChange={(e) => setFooterForm({ ...footerForm, brand_description: e.target.value })}
                      placeholder="Luxury handmade chocolates crafted with the finest cocoa and pure ingredients."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        color: 'var(--cream)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        lineHeight: 1.45,
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.7 }}>
                      Displays directly beneath the brand logo in the footer.
                    </span>
                  </div>
                </div>
              </div>

              {/* Concierge Helpline Card Settings */}
              <div
                style={{
                  background: 'rgba(26, 16, 10, 0.75)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.1rem' }}>
                    Need Help? Concierge Card
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--cream)' }}>
                    <input
                      type="checkbox"
                      checked={footerForm.concierge?.is_enabled !== false}
                      onChange={(e) => setFooterForm({
                        ...footerForm,
                        concierge: { ...(footerForm.concierge || DEFAULT_FOOTER_CONFIG.concierge), is_enabled: e.target.checked }
                      })}
                    />
                    <span>Card Enabled</span>
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <Input
                    label="Concierge Heading"
                    placeholder="Need Help?"
                    value={footerForm.concierge?.title || ''}
                    onChange={(e) => setFooterForm({
                      ...footerForm,
                      concierge: { ...(footerForm.concierge || DEFAULT_FOOTER_CONFIG.concierge), title: e.target.value }
                    })}
                  />

                  <Input
                    label="Concierge Subtitle"
                    placeholder="Our chocolate concierge is here for you."
                    value={footerForm.concierge?.subtitle || ''}
                    onChange={(e) => setFooterForm({
                      ...footerForm,
                      concierge: { ...(footerForm.concierge || DEFAULT_FOOTER_CONFIG.concierge), subtitle: e.target.value }
                    })}
                  />

                  <Input
                    label="Button Call-to-Action Text"
                    placeholder="CONTACT CONCIERGE"
                    value={footerForm.concierge?.button_text || ''}
                    onChange={(e) => setFooterForm({
                      ...footerForm,
                      concierge: { ...(footerForm.concierge || DEFAULT_FOOTER_CONFIG.concierge), button_text: e.target.value }
                    })}
                  />

                  <Input
                    label="Button Redirect Target"
                    placeholder="/contact#send-us-a-message"
                    value={footerForm.concierge?.button_link || ''}
                    onChange={(e) => setFooterForm({
                      ...footerForm,
                      concierge: { ...(footerForm.concierge || DEFAULT_FOOTER_CONFIG.concierge), button_link: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: NAVIGATION LINK COLUMNS */}
          {activeFooterSubTab === 'nav' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, color: 'var(--beige)', fontSize: '0.85rem' }}>
                  Manage the columns and direct links displayed across the footer navigation grid.
                </p>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    const newColId = `col-${Date.now()}`;
                    setFooterForm((prev) => ({
                      ...prev,
                      nav_columns: [
                        ...(prev.nav_columns || []),
                        { id: newColId, title: 'NEW SECTION', links: [{ id: `link-${Date.now()}`, label: 'New Link', url: '/shop' }] }
                      ]
                    }));
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} />
                  <span>Add Navigation Column</span>
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {(footerForm.nav_columns || []).map((col, colIdx) => (
                  <div
                    key={col.id || colIdx}
                    style={{
                      background: 'rgba(26, 16, 10, 0.75)',
                      border: '1px solid rgba(212, 175, 55, 0.25)',
                      borderRadius: '12px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Column Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                            Column {colIdx + 1} Title
                          </label>
                          <input
                            type="text"
                            value={col.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFooterForm((prev) => ({
                                ...prev,
                                nav_columns: prev.nav_columns.map((c, i) => i === colIdx ? { ...c, title: val } : c),
                              }));
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: 'rgba(0,0,0,0.5)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '6px',
                              color: 'var(--cream)',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                            }}
                          />
                        </div>

                        {footerForm.nav_columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`Delete entire column "${col.title}"?`)) return;
                              setFooterForm((prev) => ({
                                ...prev,
                                nav_columns: prev.nav_columns.filter((_, i) => i !== colIdx),
                              }));
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', marginTop: '16px' }}
                            title="Delete Column"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* Links in this column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {(col.links || []).map((link, linkIdx) => (
                          <div
                            key={link.id || linkIdx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr auto auto',
                              gap: '6px',
                              alignItems: 'center',
                              background: 'rgba(0,0,0,0.4)',
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Label (e.g. Shop All)"
                              value={link.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFooterForm((prev) => ({
                                  ...prev,
                                  nav_columns: prev.nav_columns.map((c, cI) => cI === colIdx ? {
                                    ...c,
                                    links: c.links.map((l, lI) => lI === linkIdx ? { ...l, label: val } : l)
                                  } : c)
                                }));
                              }}
                              style={{
                                padding: '6px 8px',
                                background: 'rgba(0,0,0,0.6)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '4px',
                                color: 'var(--cream)',
                                fontSize: '0.8rem',
                              }}
                            />

                            <input
                              type="text"
                              placeholder="Route / Anchor (e.g. /shop)"
                              value={link.url}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFooterForm((prev) => ({
                                  ...prev,
                                  nav_columns: prev.nav_columns.map((c, cI) => cI === colIdx ? {
                                    ...c,
                                    links: c.links.map((l, lI) => lI === linkIdx ? { ...l, url: val } : l)
                                  } : c)
                                }));
                              }}
                              style={{
                                padding: '6px 8px',
                                background: 'rgba(0,0,0,0.6)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '4px',
                                color: 'var(--cream)',
                                fontSize: '0.8rem',
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => {
                                setFooterForm((prev) => ({
                                  ...prev,
                                  nav_columns: prev.nav_columns.map((c, cI) => cI === colIdx ? {
                                    ...c,
                                    links: c.links.filter((_, lI) => lI !== linkIdx)
                                  } : c)
                                }));
                              }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              title="Delete link"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newLink = {
                          id: `link-${Date.now()}`,
                          label: 'New Link',
                          url: '/shop',
                        };
                        setFooterForm((prev) => ({
                          ...prev,
                          nav_columns: prev.nav_columns.map((c, i) => i === colIdx ? { ...c, links: [...(c.links || []), newLink] } : c)
                        }));
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px dashed rgba(212,175,55,0.4)',
                        borderRadius: '6px',
                        color: 'var(--gold)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={13} /> Add Link to {col.title}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 4: ARTISANAL BENEFITS STRIP */}
          {activeFooterSubTab === 'benefits' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, color: 'var(--beige)', fontSize: '0.85rem' }}>
                  Manage the 4 trust and quality guarantee boxes featured across the middle of the footer.
                </p>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    const newBox = {
                      id: `ben-${Date.now()}`,
                      title: 'NEW BENEFIT',
                      desc: 'Quality assurance statement',
                      icon: 'sparkles',
                    };
                    setFooterForm((prev) => ({
                      ...prev,
                      benefits: [...(prev.benefits || []), newBox]
                    }));
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} />
                  <span>Add Benefit Box</span>
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {(footerForm.benefits || []).map((box, bIdx) => (
                  <div
                    key={box.id || bIdx}
                    style={{
                      background: 'rgba(26, 16, 10, 0.75)',
                      border: '1px solid rgba(212, 175, 55, 0.25)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'rgba(212,175,55,0.15)',
                            border: '1px solid rgba(212,175,55,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--gold)',
                          }}
                        >
                          {renderBenefitIcon(box.icon)}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 700 }}>
                          Box {bIdx + 1}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Delete benefit box "${box.title}"?`)) return;
                          setFooterForm((prev) => ({
                            ...prev,
                            benefits: prev.benefits.filter((_, i) => i !== bIdx)
                          }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete box"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '4px' }}>
                        Icon Style
                      </label>
                      <select
                        value={box.icon}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFooterForm((prev) => ({
                            ...prev,
                            benefits: prev.benefits.map((b, i) => i === bIdx ? { ...b, icon: val } : b)
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'var(--cream)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <option value="heart">Heart (Handcrafted)</option>
                        <option value="sparkles">Sparkles (Premium Ingredients)</option>
                        <option value="gift">Gift (Beautifully Packed)</option>
                        <option value="shield">Shield (Secure Payments)</option>
                        <option value="truck">Truck (Express Delivery)</option>
                        <option value="award">Award (Certified Quality)</option>
                        <option value="leaf">Leaf (Organic & Eco)</option>
                        <option value="clock">Clock (Fresh Micro-Batches)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '4px' }}>
                        Heading
                      </label>
                      <input
                        type="text"
                        value={box.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFooterForm((prev) => ({
                            ...prev,
                            benefits: prev.benefits.map((b, i) => i === bIdx ? { ...b, title: val } : b)
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'var(--cream)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '4px' }}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={box.desc}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFooterForm((prev) => ({
                            ...prev,
                            benefits: prev.benefits.map((b, i) => i === bIdx ? { ...b, desc: val } : b)
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'var(--cream)',
                          fontSize: '0.8rem',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 5: LEGAL & PAYMENT BADGES */}
          {activeFooterSubTab === 'legal' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {/* Bottom Copyright & Tagline */}
              <div
                style={{
                  background: 'rgba(26, 16, 10, 0.75)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: '0 0 14px 0', fontSize: '1.1rem' }}>
                  Copyright Notice & Tagline
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <Input
                    label="Copyright Line"
                    placeholder="© 2026 CHOVIQUE. All rights reserved."
                    value={footerForm.copyright_text || ''}
                    onChange={(e) => setFooterForm({ ...footerForm, copyright_text: e.target.value })}
                  />

                  <Input
                    label="Italic Brand Tagline"
                    placeholder="The Art of Fine Chocolate"
                    value={footerForm.tagline || ''}
                    onChange={(e) => setFooterForm({ ...footerForm, tagline: e.target.value })}
                  />
                </div>
              </div>

              {/* Legal Links List */}
              <div
                style={{
                  background: 'rgba(26, 16, 10, 0.75)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', margin: 0, fontSize: '1.1rem' }}>
                    Legal & Policy Links
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newLeg = {
                        id: `leg-${Date.now()}`,
                        label: 'New Policy',
                        url: '/privacy-policy',
                      };
                      setFooterForm((prev) => ({
                        ...prev,
                        legal_links: [...(prev.legal_links || []), newLeg]
                      }));
                    }}
                    style={{
                      background: 'rgba(212,175,55,0.15)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: '6px',
                      color: 'var(--gold)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} /> Add Link
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(footerForm.legal_links || []).map((leg, lIdx) => (
                    <div
                      key={leg.id || lIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.4)',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Label"
                        value={leg.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFooterForm((prev) => ({
                            ...prev,
                            legal_links: prev.legal_links.map((l, i) => i === lIdx ? { ...l, label: val } : l)
                          }));
                        }}
                        style={{
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.6)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '4px',
                          color: 'var(--cream)',
                          fontSize: '0.8rem',
                        }}
                      />

                      <input
                        type="text"
                        placeholder="URL path"
                        value={leg.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFooterForm((prev) => ({
                            ...prev,
                            legal_links: prev.legal_links.map((l, i) => i === lIdx ? { ...l, url: val } : l)
                          }));
                        }}
                        style={{
                          padding: '6px 8px',
                          background: 'rgba(0,0,0,0.6)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '4px',
                          color: 'var(--cream)',
                          fontSize: '0.8rem',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setFooterForm((prev) => ({
                            ...prev,
                            legal_links: prev.legal_links.filter((_, i) => i !== lIdx)
                          }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              LIVE FOOTER PREVIEW (CUSTOMER VIEW)
              ========================================================================= */}
          <div
            style={{
              background: '#0a0a0a',
              border: '2px solid var(--gold)',
              borderRadius: '16px',
              padding: '24px 20px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)',
              marginTop: '16px',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Preview Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--gold)', background: 'rgba(212, 175, 55, 0.15)', padding: '4px 12px', borderRadius: '4px', border: '1px solid rgba(var(--gold-rgb), 0.4)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} /> LIVE FOOTER PREVIEW (CUSTOMER VIEW)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                Updates instantly as you modify configurations above
              </span>
            </div>

            {/* Rendered Live Customer Footer Container */}
            <div className="chovique-footer" style={{ background: 'transparent', padding: '10px 0' }}>
              <div className="chovique-footer-container">
                {/* 1. Main Grid */}
                <div className="footer-main-grid">
                  {/* Brand Column */}
                  <div className="footer-brand-col">
                    <div className="footer-brand-header" style={{ cursor: 'pointer' }}>
                      <img 
                        src={getImageUrl(footerForm.brand_logo_url || '/assets/popular-bg.jpg')} 
                        alt="Chovique Logo" 
                        className="footer-main-logo" 
                      />
                    </div>
                    <p className="footer-brand-description">
                      {footerForm.brand_description || 'Luxury handmade chocolates crafted with the finest cocoa and pure ingredients.'}
                    </p>
                    <div className="footer-social-row">
                      {(footerForm.social_links || []).filter(s => s.is_active !== false).map((social) => (
                        <div key={social.id} className="footer-social-btn" title={social.name || social.platform}>
                          {renderSocialIcon(social.platform, 16)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="footer-col-divider" />

                  {/* Navigation Columns */}
                  {(footerForm.nav_columns || []).map((col) => (
                    <div key={col.id} className="footer-nav-col">
                      <h3 className="footer-col-title">{col.title}</h3>
                      <ul className="footer-nav-links">
                        {(col.links || []).map((link) => (
                          <li key={link.id}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--beige)', fontSize: '0.85rem' }}>
                              {link.label} <ChevronRight size={13} className="nav-chevron" style={{ marginLeft: '4px' }} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {/* Concierge Card */}
                  {footerForm.concierge?.is_enabled !== false && (
                    <div className="footer-concierge-card">
                      <div className="concierge-icon-circle">
                        <Headphones size={22} className="concierge-headphone-icon" />
                      </div>
                      <h4 className="concierge-title">{footerForm.concierge?.title || 'Need Help?'}</h4>
                      <p className="concierge-subtitle">{footerForm.concierge?.subtitle || 'Our chocolate concierge is here for you.'}</p>
                      <div className="concierge-contact-btn" style={{ cursor: 'pointer' }}>
                        <span>{footerForm.concierge?.button_text || 'CONTACT CONCIERGE'}</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Benefits Strip */}
                {(footerForm.benefits || []).length > 0 && (
                  <div className="footer-benefits-strip">
                    {footerForm.benefits.map((box, idx) => (
                      <React.Fragment key={box.id || idx}>
                        {idx > 0 && <div className="benefit-divider" />}
                        <div className="footer-benefit-box">
                          <div className="benefit-icon-circle">
                            {renderBenefitIcon(box.icon)}
                          </div>
                          <div className="benefit-text">
                            <h4 className="benefit-title">{box.title}</h4>
                            <p className="benefit-desc">{box.desc}</p>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* 3. Bottom Legal & Payment Bar */}
                <div className="footer-bottom-bar">
                  <div className="footer-bottom-left">
                    <p className="copyright-text">{footerForm.copyright_text || '© 2026 CHOVIQUE. All rights reserved.'}</p>
                    {footerForm.tagline && <span className="footer-italic-tagline">{footerForm.tagline}</span>}
                  </div>

                  <div className="footer-bottom-center">
                    {(footerForm.legal_links || []).map((item, index) => (
                      <React.Fragment key={item.id || index}>
                        {index > 0 && <span className="legal-pipe">|</span>}
                        <span style={{ color: 'var(--beige)', fontSize: '0.8rem' }}>{item.label}</span>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="footer-bottom-right">
                    <span className="secure-payments-label">{footerForm.payment_badges_label || 'SECURE PAYMENTS'}</span>
                    <div className="payment-badges-row">
                      {(footerForm.payment_badges || DEFAULT_FOOTER_CONFIG.payment_badges).filter(b => b.is_active !== false).map((b) => (
                        <div key={b.id} className="payment-badge-pill" title={b.name}>
                          <img
                            src={getImageUrl(b.image_url)}
                            alt={b.name}
                            className="payment-badge-logo-img"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              variant="glass"
              size="lg"
              onClick={handleResetFooter}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RotateCcw size={16} />
              <span>Reset to Defaults</span>
            </Button>

            <Button
              variant="gold"
              glow
              size="lg"
              disabled={isSavingFooter}
              onClick={handleSaveFooter}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {footerSaveSuccess ? <Check size={18} /> : <Save size={18} />}
              <span>{isSavingFooter ? 'Saving Changes...' : footerSaveSuccess ? 'Saved Live!' : 'Save All Footer Changes'}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageCmsView;
