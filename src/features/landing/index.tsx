import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Hero } from './Hero';
import { PopularProducts } from './PopularProducts';
import { BestsellersNewArrivals } from './BestsellersNewArrivals';
import { Boutique } from './Boutique';
import { GiftHampers } from './GiftHampers';
import { Reviews } from './Reviews';
import { Stats } from './Stats';
import { InstagramReels } from './InstagramReels';
import { TasteSample } from './TasteSample';

import { useApp } from '../../app/providers';

export { OurStoryPage } from './OurStoryPage';
export { ContactPage } from './ContactPage';

export const LandingPage: React.FC = () => {
  const location = useLocation();
  const { refreshBanners, refreshLandingSections } = useApp();

  useEffect(() => {
    if (refreshBanners) refreshBanners();
    if (refreshLandingSections) refreshLandingSections();
  }, [refreshBanners, refreshLandingSections]);

  // Scroll to a section when arriving from another page with state.scrollTo
  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (scrollTo) {
      // Wait a tick for the page to render before scrolling
      const timeout = setTimeout(() => {
        const el = document.getElementById(scrollTo);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [location.state]);

  return (
    <div style={{ background: 'var(--black)', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Hero />
      <TasteSample />
      <PopularProducts />
      <BestsellersNewArrivals />
      <GiftHampers />
      <Boutique />
      <Reviews />
      <Stats />
      <InstagramReels />
    </div>
  );
};

export default LandingPage;
