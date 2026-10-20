import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import News from './components/News';
import About from './components/About';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import useSiteContent from '../../hooks/useSiteContent';

function LandingPage() {
  const sections = useSiteContent();
  const location = useLocation();

  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (!scrollTo) return;
    const el = document.querySelector(scrollTo);
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [location.state]);

  return (
    <div className="min-h-screen bg-surface-light text-gray-900 transition-colors dark:bg-surface-dark dark:text-white">
      <Navbar />
      <Hero data={sections?.hero} />
      <Features data={sections?.features} />
      <News data={sections?.news} />
      <About data={sections?.about} />
      <Pricing data={sections?.pricing} />
      <Footer data={sections?.footer} />
    </div>
  );
}

export default LandingPage;
