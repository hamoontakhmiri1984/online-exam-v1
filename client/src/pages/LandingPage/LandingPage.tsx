import '../../glass-theme.css';
import SupportWidget from '../../components/Support/SupportWidget';
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
import Spinner from '../../components/Spinner/Spinner';

function LandingPage() {
  const { sections, loading, error } = useSiteContent();
  const location = useLocation();

  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (!scrollTo) return;
    const el = document.querySelector(scrollTo);
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [location.state]);

  return (
    <div className="glass-landing min-h-screen bg-surface-light text-gray-900 transition-colors dark:bg-surface-dark dark:text-white">
      <Navbar />
      {loading ? (
        <main className="min-h-[55vh] flex items-center justify-center"><Spinner /></main>
      ) : error ? (
        <main className="min-h-[55vh] flex items-center justify-center px-5 text-center" role="alert">
          <div className="max-w-md rounded-2xl border border-violet-200/50 bg-white/75 p-8 dark:border-violet-300/20 dark:bg-slate-900/70">
            <h1 className="mb-3 text-xl font-bold">دریافت محتوای صفحه اصلی انجام نشد</h1>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-300">برای جلوگیری از نمایش اطلاعات نادرست، محتوای پیش‌فرض جایگزین نشده است.</p>
            <button type="button" onClick={() => window.location.reload()} className="ui-primary-gradient rounded-xl px-5 py-2.5 text-sm font-semibold">تلاش دوباره</button>
          </div>
        </main>
      ) : (
      <>
      <Hero data={sections?.hero} />
      <Features data={sections?.features} />
      <News data={sections?.news} />
      <About data={sections?.about} />
      <Pricing data={sections?.pricing} />
      <Footer data={sections?.footer} />
      </>
      )}
      <SupportWidget />
    </div>
  );
}

export default LandingPage;
