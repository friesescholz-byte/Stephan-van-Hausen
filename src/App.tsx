import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  ArrowRight, 
  ShieldAlert, 
  Compass, 
  BookOpen, 
  History, 
  Flame, 
  Check,
  Phone,
  Mail,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Turnstile Sitekey (generated via helper script)
const TURNSTILE_SITEKEY = "0x4AAAAAADdygD2o4mUbp1Pu";

// Animation settings matching Scholz & Friese rules
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease
    }
  }
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease }
  }
};

// Available tour images from Cloudflare R2
const IMAGES = {
  cutout: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Stephan-van-hausen.png",
  group: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gruppe-Weinhaus.png",
  portrait: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Stephan-van-Hausen-scaled.jpg",
  profile: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/nienburger_nachtwaechter_stephan_van_hausen-4e967270dccf1658f2f8d336e96600e5-103.webp",
  ambient: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/webp (1).webp",
  heroBg: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Nienburg-Mondlicht.png",
};

// New Gallery Images from Cloudflare R2 website-datein storage folder
const GALLERY_IMAGES = {
  // Die 2 alten, die bleiben sollen:
  fuehrungNacht: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/1000_fuehrung_nachtwaechter_nienburg_20_.jpg",
  nachtwaechterGasse: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/3LPC2YQCTKNBB7ZRMCIAYE6IL6.avif",
  
  // Die 9 neuen:
  new1: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/20180526_084319_ergebnis.webp",
  new2: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/20181123_200544_ergebnis.webp",
  new3: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/20240126_194040_ergebnis.webp",
  new4: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/20240221_172750_ergebnis.webp",
  new5: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/IMG-20180722-WA0009_ergebnis.webp",
  new6: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/IMG-20180722-WA0010%20(1)_ergebnis.webp",
  new7: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/IMG-20191102-WA0011_ergebnis.webp",
  new8: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/IMG-20260124-WA0013_ergebnis.webp",
  new9: "https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/Gallerie/Screenshot_20170118-200903_ergebnis.webp"
};



export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modals state
  const [activeModal, setActiveModal] = useState<null | 'impressum' | 'datenschutz' | 'agb'>(null);
  
  // Gallery Lightbox state
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Booking states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date(2026, 5, 1)); // June 2026
  const [tourType, setTourType] = useState<'classic' | 'school'>('classic');
  const [groupSize, setGroupSize] = useState<number>(10);
  const [activeFormStep, setActiveFormStep] = useState<1 | 2 | 3>(1);
  
  // Contact details state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");

  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Handle scroll effect on header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Turnstile Widget initialization with StrictMode protection
  useEffect(() => {
    let interval: any;

    const renderWidget = () => {
      if (turnstileRef.current && (window as any).turnstile && !widgetIdRef.current) {
        try {
          // Clear container to avoid double-render bugs
          turnstileRef.current.innerHTML = "";
          
          widgetIdRef.current = (window as any).turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITEKEY,
            callback: (token: string) => {
              setTurnstileToken(token);
              setErrorMessage("");
            },
            "expired-callback": () => setTurnstileToken(""),
            theme: "dark",
          });
          if (interval) clearInterval(interval);
        } catch (e) {
          console.error("Turnstile render error:", e);
        }
      }
    };

    renderWidget();

    if (!widgetIdRef.current) {
      interval = setInterval(() => {
        if ((window as any).turnstile) {
          renderWidget();
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [formStatus]); // Re-render turnstile if state changes or resets

  // Calculate pricing based on Scholz & Friese business logic
  const calculateTotalCost = () => {
    let base = tourType === 'classic' ? 120 : 70;
    let extra = 0;
    if (tourType === 'classic' && groupSize > 20) {
      extra = (groupSize - 20) * 5;
    }
    return base + extra;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    if (!selectedDate) {
      setErrorMessage("Bitte wählen Sie zuerst einen Wunschtermin im Kalender aus.");
      return;
    }

    if (!turnstileToken) {
      setErrorMessage("Bitte bestätigen Sie den Spam-Schutz (Turnstile).");
      return;
    }

    setIsSubmitting(true);

    const formattedDate = selectedDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const payload = {
      source: "Stephan-van-Hausen",
      turnstileToken,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      message: formData.message,
      date: formattedDate,
      tourType: tourType === 'classic' ? 'Standard Nachtwächter-Führung' : 'Schulklasse / Jugendgruppe',
      groupSize,
      gewandZuschlag: false,
      cost: calculateTotalCost()
    };

    try {
      const response = await fetch('https://friesescholzwebdesign.pages.dev/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setFormStatus('success');
        setFormData({ name: '', email: '', phone: '', message: '' });
        setSelectedDate(null);
        setTurnstileToken("");
      } else {
        setFormStatus('error');
        setErrorMessage(resData.message || "Es gab ein Problem beim Übermitteln der Buchungsanfrage.");
      }
    } catch (err: any) {
      setFormStatus('error');
      setErrorMessage("Netzwerkfehler. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar logic helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Convert to 0 = Mon, 6 = Sun
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const generateCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const daysCount = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);

    const days = [];
    
    // Add empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push({ dayNumber: null, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= daysCount; i++) {
      days.push({ dayNumber: i, isCurrentMonth: true });
    }

    return days;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    if (direction === 'prev') {
      // Don't navigate to past months before June 2026
      if (year === 2026 && month === 5) return;
      setCurrentCalendarMonth(new Date(year, month - 1, 1));
    } else {
      setCurrentCalendarMonth(new Date(year, month + 1, 1));
    }
  };

  const isDaySelected = (dayNum: number | null) => {
    if (!dayNum || !selectedDate) return false;
    return (
      selectedDate.getDate() === dayNum &&
      selectedDate.getMonth() === currentCalendarMonth.getMonth() &&
      selectedDate.getFullYear() === currentCalendarMonth.getFullYear()
    );
  };

  const isDayDisabled = (dayNum: number | null) => {
    if (!dayNum) return true;
    const dateToCheck = new Date(
      currentCalendarMonth.getFullYear(),
      currentCalendarMonth.getMonth(),
      dayNum
    );
    const today = new Date(2026, 5, 2); // Set reference system date June 2, 2026
    return dateToCheck < today;
  };

  const handleDayClick = (dayNum: number | null) => {
    if (!dayNum || isDayDisabled(dayNum)) return;
    setSelectedDate(
      new Date(
        currentCalendarMonth.getFullYear(),
        currentCalendarMonth.getMonth(),
        dayNum
      )
    );
    setErrorMessage("");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Navigation Header */}
      <header className={`header-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); scrollToSection('hero-top-banner'); }}>
            <img 
              src="https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/SVH-Flavercon.png" 
              alt="Stephan van Hausen Logo" 
              style={{ height: '34px', width: 'auto', display: 'block' }} 
            />
          </a>
          <ul className="nav-menu">
            <li><a href="#erlebnis" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('erlebnis'); }}>Erlebnis</a></li>
            <li><a href="#nachtwaechter" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('nachtwaechter'); }}>Der Nachtwächter</a></li>
            <li><a href="#erwartungen" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('erwartungen'); }}>Was dich erwartet</a></li>
            <li><a href="#eignung" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('eignung'); }}>Für wen?</a></li>
            <li><a href="#galerie" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('galerie'); }}>Galerie</a></li>
            <li><a href="#preise" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('preise'); }}>Dauer & Preise</a></li>
            <li>
              <button className="btn-medieval-cta" onClick={() => scrollToSection('buchung')}>
                <Flame size={16} className="glow-glow" />
                Führung anfragen
              </button>
            </li>
          </ul>

          <button className="menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 110, display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch' }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
              style={{ 
                width: '80%', 
                maxWidth: '320px', 
                background: 'rgba(13, 17, 26, 0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderLeft: '1px solid rgba(217, 162, 74, 0.2)',
                padding: '40px 30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '40px',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button inside Drawer */}
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ 
                  alignSelf: 'flex-end', 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <X size={24} />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <h3 className="font-gothic" style={{ fontSize: '2rem', color: 'var(--accent)', margin: 0 }}>Navigation</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '24px', padding: 0 }}>
                  <li><a href="#erlebnis" className="nav-link" style={{ fontSize: '1.05rem', display: 'block' }} onClick={(e) => { e.preventDefault(); scrollToSection('erlebnis'); }}>Erlebnis</a></li>
                  <li><a href="#nachtwaechter" className="nav-link" style={{ fontSize: '1.05rem', display: 'block' }} onClick={(e) => { e.preventDefault(); scrollToSection('nachtwaechter'); }}>Der Nachtwächter</a></li>
                  <li><a href="#erwartungen" className="nav-link" style={{ fontSize: '1.05rem', display: 'block' }} onClick={(e) => { e.preventDefault(); scrollToSection('erwartungen'); }}>Was dich erwartet</a></li>
                  <li><a href="#eignung" className="nav-link" style={{ fontSize: '1.05rem', display: 'block' }} onClick={(e) => { e.preventDefault(); scrollToSection('eignung'); }}>Für wen?</a></li>
                  <li><a href="#galerie" className="nav-link" style={{ fontSize: '1.05rem', display: 'block' }} onClick={(e) => { e.preventDefault(); scrollToSection('galerie'); }}>Galerie</a></li>
                  <li><a href="#preise" className="nav-link" style={{ fontSize: '1.05rem', display: 'block' }} onClick={(e) => { e.preventDefault(); scrollToSection('preise'); }}>Dauer & Preise</a></li>
                  <li style={{ marginTop: '20px' }}>
                    <button className="btn-medieval-cta" style={{ width: '100%' }} onClick={() => scrollToSection('buchung')}>
                      <Flame size={16} className="glow-glow" />
                      Führung anfragen
                    </button>
                  </li>
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="hero-section">
        {/* Top Banner (Part A) */}
        <div className="hero-top-banner">
          {/* Medieval Watermark Background Word */}
          <div className="gothic-phrase" style={{ position: 'absolute', top: '12%', left: '0', opacity: 0.04, pointerEvents: 'none' }}>
            Nienburgum
          </div>

          {/* Background image + light simulation of lantern (Layer 1) */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage: `radial-gradient(circle at 75% 30%, rgba(217, 162, 74, 0.1) 0%, rgba(7, 9, 13, 0.3) 50%, rgba(7, 9, 13, 0.6) 100%), url(${IMAGES.heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundAttachment: 'fixed',
            pointerEvents: 'none',
            zIndex: 1
          }} />

          <div className="container" style={{ position: 'relative', zIndex: 10 }}>
            <div className="hero-top">
              {/* Left Column: Headlines */}
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
              >
                <motion.span className="gothic-eyebrow" variants={fadeUp}>Anno Domini 1025</motion.span>
                <motion.span className="section-tag" variants={fadeUp}>Keine normale Stadtführung – Mit Stephan van Hausen durch die Schatten der Stadt</motion.span>
                <motion.h1 className="hero-headline" variants={fadeUp}>
                  Wenn die Stadt zur Ruhe kommt, beginnt <span>seine Geschichte</span>.
                </motion.h1>
                <motion.div className="hero-btn-group" variants={fadeUp} style={{ marginTop: '28px' }}>
                  <button className="btn-medieval-cta" onClick={() => scrollToSection('buchung')}>
                    <Flame size={16} className="glow-glow" />
                    Führung anfragen <ArrowRight size={18} />
                  </button>
                  <button className="btn btn-secondary" onClick={() => scrollToSection('erlebnis')}>
                    Mehr erfahren
                  </button>
                </motion.div>
              </motion.div>

              {/* Right Column: Empty to allow the cutout to shine */}
              <div style={{ pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Curved Divider wave with glow line */}
        <div className="hero-curve-separator">
          <svg className="hero-curve-svg" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path className="hero-curve-path" d="M0,32L80,37.3C160,43,320,53,480,48C640,43,800,21,960,16C1120,11,1280,21,1360,26.7L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
            <path className="hero-curve-glow" d="M0,32L80,37.3C160,43,320,53,480,48C640,43,800,21,960,16C1120,11,1280,21,1360,26.7L1440,32"></path>
          </svg>
        </div>

        {/* Bottom Section containing buttons and detailed introductory text (Part B) */}
        <div className="hero-bottom-content">
          <div className="container">
            <div className="hero-bottom-grid">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
              >
                <motion.p className="hero-quote" variants={fadeUp}>
                  „Ein stimmungsvoller Rundgang durch die Schatten der Geschichte.“
                </motion.p>
                <motion.div className="hero-intro-text" variants={fadeUp}>
                  <p style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-cream)' }}>
                    <strong>Erlebe Nienburg, wenn die Nacht hereinbricht:</strong>
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} /> <span><strong>Historischer Rundgang:</strong> Mit Hellebarde, Horn und Laterne.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} /> <span><strong>Spannendes Erlebnis:</strong> Für Vereine, Schulklassen & Privatgruppen.</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} /> <span><strong>Spürbare Geschichte:</strong> Nienburgs Mythen live erleben.</span>
                    </li>
                  </ul>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Character cutout placed absolutely to overlay sections (Layer 2) */}
        <motion.div 
          className="hero-character-container"
          initial={{ opacity: 0, y: 120 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.2 }}
        >
          <img 
            src={IMAGES.cutout} 
            alt="Stephan van Hausen Nachtwächter" 
            className="hero-character-img"
          />
        </motion.div>

        {/* Simple, performance-friendly static dark-bluish fog overlay clouds */}
        <div className="simple-fog-container">
          <div className="simple-fog-cloud cloud-left" />
          <div className="simple-fog-cloud cloud-right" />
          <div className="simple-fog-cloud cloud-bottom" />
        </div>

        {/* New Premium Trust Cards Grid */}
        <div className="hero-trust-wrapper">
          <div className="container">
            <div className="trust-grid">
              {/* Card 1: Sterne */}
              <motion.div 
                className="trust-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="trust-card-icon">
                  <Star fill="var(--accent)" size={22} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="trust-card-info">
                  <h4>5.0 / 5.0 Sterne</h4>
                  <p>Ausgezeichnete Bewertungen in Nienburg</p>
                  <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} fill="var(--accent)" size={12} stroke="none" />)}
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Termine */}
              <motion.div 
                className="trust-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="trust-card-icon">
                  <CalendarIcon size={22} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="trust-card-info">
                  <h4>Nächste Termine</h4>
                  <p>Fr. & Sa. Abend verfügbar (Juni 2026)</p>
                </div>
              </motion.div>

              {/* Card 3: Laternen-Status */}
              <motion.div 
                className="trust-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="trust-card-icon" style={{ position: 'relative' }}>
                  <Flame size={22} style={{ color: 'var(--accent)' }} />
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    border: '2px solid var(--bg-card)',
                    animation: 'pulse 1.8s infinite'
                  }} />
                </div>
                <div className="trust-card-info">
                  <h4>Laternen-Status: Entzündet</h4>
                  <p>Führungen finden statt</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Curved Divider wave to transition smoothly to Das Erlebnis */}
        <div className="hero-curve-separator bottom-separator" style={{ height: '80px', marginTop: '-30px', position: 'relative', zIndex: 10 }}>
          <svg className="hero-curve-svg" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ transform: 'rotate(180deg)' }}>
            <path className="hero-curve-path" d="M0,32L80,37.3C160,43,320,53,480,48C640,43,800,21,960,16C1120,11,1280,21,1360,26.7L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" style={{ fill: 'var(--bg-dark)' }}></path>
            <path className="hero-curve-glow" d="M0,32L80,37.3C160,43,320,53,480,48C640,43,800,21,960,16C1120,11,1280,21,1360,26.7L1440,32" style={{ stroke: 'rgba(217, 162, 74, 0.3)' }}></path>
          </svg>
        </div>
      </section>

      {/* Section 1: Das Erlebnis */}
      <section id="erlebnis" style={{ zIndex: 10 }}>
        <div className="fog-layer" />
        <div className="container">
          <div className="erlebnis-grid">
            {/* Left Content */}
            <motion.div 
              className="erlebnis-content"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
               <motion.span className="gothic-eyebrow" variants={fadeUp}>Hört ihr Leut' und lasst euch sagen...</motion.span>
              <span className="section-tag">Das Erlebnis</span>
              <h2 className="section-title">Keine normale Stadtführung. <span>Ein echtes Abenteuer.</span></h2>
              <p className="section-text" style={{ marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-cream)' }}>
                <strong>Erlebe Geschichte, die unter die Haut geht.</strong>
              </p>
              <p className="section-text" style={{ marginBottom: '24px' }}>
                Vergiss trockene Jahreszahlen. Wir gehen dorthin, wo das mittelalterliche Leben stattfand – in die dunklen Ecken und engen Gassen Nienburgs.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Check size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>1000 Jahre Mythen</strong>
                    <p style={{ fontSize: '0.85rem' }}>Sagenhaft aufbereitet. Spannend bis zur letzten Minute.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Check size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>Fesselnde Atmosphäre</strong>
                    <p style={{ fontSize: '0.85rem' }}>Nachtruhe, Gassenlicht und der Ruf des Wächters.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Check size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>Lebendige Erzählweise</strong>
                    <p style={{ fontSize: '0.85rem' }}>Humorvoll, nahbar und voller überraschender Anekdoten.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Check size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>Perfekt für Gruppen</strong>
                    <p style={{ fontSize: '0.85rem' }}>Ideal als Highlight für Geburtstage, Firmen & Ausflüge.</p>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '35px', marginBottom: '25px' }}>
                <button className="btn-medieval-cta" onClick={() => scrollToSection('buchung')}>
                  <Flame size={16} className="glow-glow" />
                  Führung anfragen <ArrowRight size={18} />
                </button>
              </div>
              <h3 className="erlebnis-slogan font-gothic" style={{ fontSize: '2.5rem', letterSpacing: '0.03em' }}>Geschichte. Gänsehaut. Gassenlicht.</h3>
            </motion.div>

            {/* Right atmospheric R2 image */}
            <motion.div 
              className="erlebnis-image-wrapper"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <img src={IMAGES.ambient} alt="Historische Altstadt Nienburg bei Nacht" className="erlebnis-image" />
              <div className="erlebnis-image-overlay" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2: Der Nachtwächter */}
      <section id="nachtwaechter" className="nachtwaechter-bg" style={{ zIndex: 10 }}>
        <div className="fog-layer" />
        <div className="container">
          <div className="nachtwaechter-grid">
            {/* Left Portrait layout */}
            <motion.div
              className="nachtwaechter-img-frame"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <img src={IMAGES.portrait} alt="Stephan van Hausen Portrait" className="nachtwaechter-img" />
            </motion.div>

            {/* Right text layout */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.span className="gothic-eyebrow" variants={fadeUp}>Wächter der Nacht</motion.span>
              <span className="section-tag">Der Nachtwächter</span>
              <h2 className="section-title">Dein Geleitsmann <span>durch die Dunkelheit</span></h2>
              <p className="section-text" style={{ marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-cream)' }}>
                <strong>Stephan van Hausen – Dein Führer im historischen Gewand.</strong>
              </p>
              <p className="section-text" style={{ marginBottom: '24px' }}>
                Früher war sein Dienst überlebenswichtig: Schutz vor Dieben, Feuer und Feinden. Heute ist es dein Schlüssel zu einem unvergesslichen Abend.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '30px' }}>
                <li style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'var(--bg-dark)', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>✓</div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Volle Ausrüstung:</strong> Hellebarde, Horn und Laterne sind immer dabei.
                  </div>
                </li>
                <li style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'var(--bg-dark)', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>✓</div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Historisches Gewand:</strong> Ein echter Blickfang, der die Vergangenheit atmen lässt (im Preis bereits inbegriffen).
                  </div>
                </li>
                <li style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'var(--bg-dark)', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>✓</div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Sprichwörter &amp; Redensarten:</strong> Woher kommt „etwas auf dem Kerbholz haben“? Auf der Führung werden zahlreiche historische Redensarten lebendig erklärt.
                  </div>
                </li>
                <li style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'var(--bg-dark)', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>✓</div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Echtes Original:</strong> Ein Nienburger Stadtführer, der mit Leidenschaft und Witz begeistert.
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Was dich erwartet */}
      <section id="erwartungen" style={{ zIndex: 10 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span className="gothic-eyebrow">Mysterium & Wahrheit</span>
            <span className="section-tag">Was dich erwartet</span>
            <h2 className="section-title">Nienburgs Gassen <span>erzählen ihre Geheimnisse</span></h2>
            <p className="section-text" style={{ margin: '0 auto' }}>
              <strong>Keine langweiligen Fakten, sondern echte Highlights.</strong> Erfahre spannende Legenden über das „Wählige Rott“, Hexensagen, die dramatische Belagerung der Stadt und warum wir eigentlich „auf der faulen Haut liegen“ oder „eine Schippe drauflegen“ – Stefan erklärt die historischen Ursprünge vieler bekannter Sprichwörter.
            </p>
          </div>

          <motion.div 
            className="cards-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {/* Card 1 */}
            <motion.div className="feature-card" variants={fadeUp}>
              <div className="feature-icon-wrapper">
                <Compass size={24} />
              </div>
              <h3>Historische Gassen</h3>
              <p>Entdecke Nienburg aus einer ganz besonderen, nächtlichen Perspektive durch verwinkelte Pfade.</p>
            </motion.div>

            {/* Card 2 */}
            <motion.div className="feature-card" variants={fadeUp}>
              <div className="feature-icon-wrapper">
                <BookOpen size={24} />
              </div>
              <h3>Mythen & Sagen</h3>
              <p>Geheimnisvolle Geschichten, die stimmungsvoll zwischen Wahrheit und Legende wandern.</p>
            </motion.div>

            {/* Card 3 */}
            <motion.div className="feature-card" variants={fadeUp}>
              <div className="feature-icon-wrapper">
                <History size={24} />
              </div>
              <h3>Echte Stadtgeschichte</h3>
              <p>Über 1000 Jahre bewegende Geschichte Nienburgs, spannend und verständlich aufbereitet.</p>
            </motion.div>

            {/* Card 4 */}
            <motion.div className="feature-card" variants={fadeUp}>
              <div className="feature-icon-wrapper">
                <Sparkles size={24} />
              </div>
              <h3>Besonderes Erlebnis</h3>
              <p>Perfekt geeignet für Gruppen, Vereine, Schulklassen und Besucher der historischen Stadt.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Eignung */}
      <section id="eignung" className="nachtwaechter-bg" style={{ zIndex: 10 }}>
        <div className="fog-layer" />
        <div className="container">
          <div className="eignung-grid">
            {/* Left content text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.span className="gothic-eyebrow" variants={fadeUp}>Gemeinschaft & Geleit</motion.span>
              <span className="section-tag">Für wen geeignet?</span>
              <h2 className="section-title">Ein Highlight <span>für jeden Anlass</span></h2>
              <p className="section-text" style={{ marginBottom: '24px', fontSize: '1.1rem', color: 'var(--text-cream)' }}>
                <strong>Das perfekte Programm für gemeinsame Erlebnisse.</strong>
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 'bold', lineHeight: '1' }}>✦</span>
                  <div className="section-text">
                    <strong style={{ color: 'var(--text-main)' }}>Firmenfeiern & Vereinsausflüge:</strong> Teambuilding der besonderen Art. Teilt Geschichten, lacht gemeinsam und erlebt einen unvergesslichen Abend.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 'bold', lineHeight: '1' }}>✦</span>
                  <div className="section-text">
                    <strong style={{ color: 'var(--text-main)' }}>Geburtstage & Familienfeste:</strong> Verschenke eine Zeitreise! Ein origineller Programmpunkt, der alle Generationen verbindet.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 'bold', lineHeight: '1' }}>✦</span>
                  <div className="section-text">
                    <strong style={{ color: 'var(--text-main)' }}>Schulklassen & Jugendgruppen:</strong> Geschichte zum Anfassen. Pädagogisch wertvoll, spannend inszeniert und absolut jugendgerecht.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 'bold', lineHeight: '1' }}>✦</span>
                  <div className="section-text">
                    <strong style={{ color: 'var(--text-main)' }}>Flexibel vor Ort bei dir:</strong> Ich trage mein historisches Wissen flexibel direkt bei euch zu Hause (in Altenheimen, Schulen oder Privathäusern) vor, falls ihr nicht zu mir nach Nienburg kommen könnt.
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '35px' }}>
                <button className="btn-medieval-cta" onClick={() => scrollToSection('buchung')}>
                  <Flame size={16} className="glow-glow" />
                  Führung anfragen <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>

            {/* Right group photo */}
            <motion.div
              className="erlebnis-image-wrapper"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <img src={IMAGES.group} alt="Gruppe bei der Nienburger Nachtwächter Stadtführung" className="erlebnis-image" />
              <div className="erlebnis-image-overlay" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 5: Galerie */}
      <section id="galerie" style={{ zIndex: 10 }}>
        <div className="fog-layer" />
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span className="gothic-eyebrow">Impressionen</span>
            <span className="section-tag">Galerie</span>
            <h2 className="section-title">Ein Blick in die <span>Nienburger Schatten</span></h2>
            <p className="section-text" style={{ margin: '0 auto' }}>
              <strong>Erlebe die Stimmung vorab.</strong> Historische Fachwerkfassaden, flackerndes Laternenlicht und urige Kulissen machen diese Führung zu einem unvergesslichen Erlebnis.
            </p>
          </div>

          <div className="galerie-grid">
            {/* Reihe 1 & 2 */}
            <div className="galerie-item big" onClick={() => setLightboxImg(GALLERY_IMAGES.new1)}>
              <img src={GALLERY_IMAGES.new1} alt="Nachtwächter Führung Nienburg Altstadt" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item tall" onClick={() => setLightboxImg(GALLERY_IMAGES.new2)}>
              <img src={GALLERY_IMAGES.new2} alt="Stefan Hilker als Nachtwächter" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.new3)}>
              <img src={GALLERY_IMAGES.new3} alt="Historische Nienburger Stadtführung" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.new4)}>
              <img src={GALLERY_IMAGES.new4} alt="Nachtwächter Führung bei Mondlicht" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>

            {/* Reihe 3 */}
            <div className="galerie-item wide" onClick={() => setLightboxImg(GALLERY_IMAGES.fuehrungNacht)}>
              <img src={GALLERY_IMAGES.fuehrungNacht} alt="Nachtwächter-Führung Nienburg Gruppe" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.new5)}>
              <img src={GALLERY_IMAGES.new5} alt="Stadtgeschichte hautnah erleben" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.new6)}>
              <img src={GALLERY_IMAGES.new6} alt="Traditionelle Kostüme und Laternenlicht" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>

            {/* Reihe 4 */}
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.new7)}>
              <img src={GALLERY_IMAGES.new7} alt="Historische Redensarten und Sagen" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.new8)}>
              <img src={GALLERY_IMAGES.new8} alt="Stadtführung Nienburg bei Nacht" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.new9)}>
              <img src={GALLERY_IMAGES.new9} alt="Gruppen-Erlebnis im Fackelschein" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
            <div className="galerie-item" onClick={() => setLightboxImg(GALLERY_IMAGES.nachtwaechterGasse)}>
              <img src={GALLERY_IMAGES.nachtwaechterGasse} alt="Nachtwächter Führung Altstadtgasse" />
              <div className="galerie-item-overlay">Vergrößern</div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p className="erlebnis-slogan font-gothic" style={{ fontSize: '2.4rem', color: 'var(--accent)', letterSpacing: '0.02em', lineHeight: '1.25' }}>
              „Jede Ecke hat eine Geschichte. Man muss nur wissen, wer sie erzählt.“
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Dauer, Preise & Buchung */}
      <section id="preise" className="nachtwaechter-bg" style={{ zIndex: 10 }}>
        <div className="fog-layer" />
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span className="gothic-eyebrow">Füllhorn & Geleit</span>
            <span className="section-tag">Preise & Buchung</span>
            <h2 className="section-title">Termin anfragen <span>& Platz sichern</span></h2>
            <p className="section-text" style={{ margin: '0 auto' }}>
              <strong>Unverbindliche Anfrage in 2 Minuten:</strong> Wunschtag im Kalender wählen, Gruppengröße eintragen und absenden. Wir melden uns umgehend bei dir!
            </p>
          </div>

          <div className="buchung-wrapper">
            {/* Left column: prices & details */}
            <div className="buchung-info">
              <div>
                <h3 style={{ fontSize: '2rem', marginBottom: '16px' }}>Buchungs-Infos</h3>
                <p style={{ lineHeight: '1.7', marginBottom: '16px' }}>
                  <strong>Flexibel, transparent und einfach zu planen:</strong>
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <li style={{ display: 'flex', gap: '10px', fontSize: '0.95rem' }} className="section-text">
                    <span style={{ color: 'var(--accent)' }}>•</span> <span><strong>Dauer:</strong> Ca. 1,5 bis 2 Stunden voller Geschichte.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '10px', fontSize: '0.95rem' }} className="section-text">
                    <span style={{ color: 'var(--accent)' }}>•</span> <span><strong>Wunschtermin:</strong> Wunschtag im Kalender anfragen.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '10px', fontSize: '0.95rem' }} className="section-text">
                    <span style={{ color: 'var(--accent)' }}>•</span> <span><strong>Gruppe:</strong> Bis 20 Personen zum günstigen Pauschalpreis.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '10px', fontSize: '0.95rem' }} className="section-text">
                    <span style={{ color: 'var(--accent)' }}>•</span> <span><strong>Wetterfest:</strong> Findet bei jeder Witterung statt.</span>
                  </li>
                </ul>
              </div>

              <div className="preis-card">
                <h3>Preise & Konditionen</h3>
                <ul className="preis-list">
                  <li className="preis-item">
                    <span className="preis-item-title">Dauer</span>
                    <span className="preis-item-val">ca. 1,5 – 2 Std.</span>
                  </li>
                  <li className="preis-item">
                    <span className="preis-item-title">Gruppe (bis max. 20 Personen)</span>
                    <span className="preis-item-val">120,00 €</span>
                  </li>
                  <li className="preis-item">
                    <span className="preis-item-title">Jede weitere Person</span>
                    <span className="preis-item-val">+ 5,00 €</span>
                  </li>
                  <li className="preis-item">
                    <span className="preis-item-title">Schulklassen & Kindergruppen</span>
                    <span className="preis-item-val">70,00 € (Pauschal)</span>
                  </li>
                  <li className="preis-item">
                    <span className="preis-item-title">Historisches Gewand</span>
                    <span className="preis-item-val" style={{ color: '#10b981', fontWeight: 600 }}>Inklusive</span>
                  </li>
                </ul>
                <p className="preis-hinweis">
                  * Alle Preise verstehen sich als unverbindliche Richtwerte. Bitte lassen Sie sich diese vor der finalen Buchung aktuell bestätigen.
                </p>
              </div>
            </div>

            {/* Right column: calendar booking wizard */}
            <div id="buchung" className="booking-container">
              <h3 style={{ fontSize: '1.8rem', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                Terminanfrage senden
              </h3>
              
              {formStatus === 'success' ? (
                <div className="status-alert success" style={{ padding: '30px 20px', flexDirection: 'column' }}>
                  <Check size={48} strokeWidth={2.5} style={{ marginBottom: '16px' }} />
                  <h4 style={{ color: '#10b981', fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                    Anfrage erfolgreich gesendet!
                  </h4>
                  <p style={{ color: '#6ee7b7', fontSize: '0.9rem', textAlign: 'center' }}>
                    Vielen Dank für Ihre Anfrage. Wir prüfen Ihren Wunschtermin und melden uns schnellstmöglich bei Ihnen zurück.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => setFormStatus('idle')}>
                    Weitere Anfrage stellen
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit}>
                  {/* Step Indicators on Mobile */}
                  <div className="mobile-step-indicator">
                    <div 
                      className={`step-dot ${activeFormStep === 1 ? 'active' : ''} ${selectedDate ? 'completed' : ''}`} 
                      onClick={() => setActiveFormStep(1)}
                    >
                      {selectedDate ? <Check size={14} strokeWidth={3} /> : '1'}
                    </div>
                    <div className={`step-line ${selectedDate ? 'completed' : ''}`} />
                    <div 
                      className={`step-dot ${activeFormStep === 2 ? 'active' : ''} ${(selectedDate && formData.name && formData.email) ? 'completed' : ''}`} 
                      onClick={() => { if (selectedDate) setActiveFormStep(2); }}
                    >
                      {(selectedDate && formData.name && formData.email) ? <Check size={14} strokeWidth={3} /> : '2'}
                    </div>
                    <div className={`step-line ${(selectedDate && formData.name && formData.email) ? 'completed' : ''}`} />
                    <div 
                      className={`step-dot ${activeFormStep === 3 ? 'active' : ''}`} 
                      onClick={() => { if (selectedDate && formData.name && formData.email) setActiveFormStep(3); }}
                    >
                      3
                    </div>
                  </div>

                  <div className="booking-grid-wrapper">
                    {/* Step 1: Wunschtermin & Konfiguration */}
                    <div className={`booking-step-panel ${activeFormStep === 1 ? 'is-active' : ''}`}>
                      <div className="booking-step-header" onClick={() => { if (window.innerWidth < 992) setActiveFormStep(1); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={selectedDate ? 'completed' : ''}>
                            {selectedDate ? <Check size={12} strokeWidth={3} /> : '1'}
                          </span>
                          Wunschtermin &amp; Optionen wählen
                        </div>
                        <ChevronRight className="accordion-chevron" size={18} />
                      </div>
                      
                      <div className="booking-step-body-wrapper">
                        <div className="booking-step-body">
                          <div className="calendar-widget">
                            <div className="calendar-header">
                              <button type="button" className="calendar-nav-btn" onClick={() => handleMonthChange('prev')}>
                                <ChevronLeft size={18} />
                              </button>
                              <span className="calendar-month-title">
                                {currentCalendarMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                              </span>
                              <button type="button" className="calendar-nav-btn" onClick={() => handleMonthChange('next')}>
                                <ChevronRight size={18} />
                              </button>
                            </div>

                            <div className="calendar-grid">
                              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                                <div key={d} className="calendar-weekday">{d}</div>
                              ))}
                              {generateCalendarDays().map((dayObj, index) => {
                                const isSel = dayObj.dayNumber ? isDaySelected(dayObj.dayNumber) : false;
                                const isDis = dayObj.dayNumber ? isDayDisabled(dayObj.dayNumber) : true;
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`calendar-day ${dayObj.dayNumber === null ? 'empty' : ''} ${isSel ? 'selected' : ''} ${isDis && dayObj.dayNumber !== null ? 'disabled' : ''}`}
                                    onClick={() => handleDayClick(dayObj.dayNumber)}
                                  >
                                    {dayObj.dayNumber}
                                  </div>
                                );
                              })}
                            </div>
                            {selectedDate && (
                              <div className="status-alert info" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
                                <CalendarIcon size={16} /> Ausgewählter Termin: <strong>
                                  {selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </strong>
                              </div>
                            )}
                          </div>

                          {/* Step 2 Inside Step 1 panel: Options */}
                          <div className="booking-step-title" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            Führung konfigurieren
                          </div>

                          <div className="booking-options">
                            <div 
                              className={`booking-option-card ${tourType === 'classic' ? 'selected' : ''}`}
                              onClick={() => setTourType('classic')}
                            >
                              <h5>Standard-Führung</h5>
                              <p>Für Vereine, Firmen &amp; Privatgruppen bis 20 Pers. Base: 120€</p>
                            </div>
                            <div 
                              className={`booking-option-card ${tourType === 'school' ? 'selected' : ''}`}
                              onClick={() => setTourType('school')}
                            >
                              <h5>Schulklasse / Jugend</h5>
                              <p>Flache Pauschale für Schulklassen &amp; Kinder. Flat: 70€</p>
                            </div>
                          </div>

                          {tourType === 'classic' && (
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                              <label htmlFor="groupSizeRange">Teilnehmeranzahl: {groupSize} Personen</label>
                              <input 
                                id="groupSizeRange"
                                type="range" 
                                min="1" 
                                max="40" 
                                value={groupSize} 
                                onChange={(e) => setGroupSize(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--accent)' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                * Bis 20 Personen 120€ pauschal. Jede weitere Person zusätzlich +5€
                              </span>
                            </div>
                          )}

                          {/* Next Navigation for Mobile only */}
                          <div className="mobile-step-nav">
                            <button 
                              type="button" 
                              className="btn-medieval-cta" 
                              style={{ width: '100%' }}
                              onClick={() => {
                                if (!selectedDate) {
                                  setErrorMessage("Bitte wählen Sie zuerst einen Wunschtermin im Kalender aus.");
                                } else {
                                  setErrorMessage("");
                                  setActiveFormStep(2);
                                }
                              }}
                            >
                              Weiter zu Kontaktdaten <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right column container for desktop grid layout */}
                    <div className="booking-grid-right-col">
                      {/* Step 2: Contact details */}
                      <div className={`booking-step-panel ${activeFormStep === 2 ? 'is-active' : ''}`}>
                        <div className="booking-step-header" onClick={() => { if (window.innerWidth < 992 && selectedDate) setActiveFormStep(2); }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className={(selectedDate && formData.name && formData.email) ? 'completed' : ''}>
                              {(selectedDate && formData.name && formData.email) ? <Check size={12} strokeWidth={3} /> : '2'}
                            </span>
                            Kontaktdaten eintragen
                          </div>
                          <ChevronRight className="accordion-chevron" size={18} />
                        </div>
                        
                        <div className="booking-step-body-wrapper">
                          <div className="booking-step-body">
                            <div className="booking-form-grid">
                              <div className="form-group">
                                <label htmlFor="inputName">Name *</label>
                                <div style={{ position: 'relative' }}>
                                  <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                  <input 
                                    id="inputName"
                                    type="text" 
                                    required 
                                    className="form-control" 
                                    style={{ paddingLeft: '40px', width: '100%' }}
                                    placeholder="Max Mustermann"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  />
                                </div>
                              </div>

                              <div className="form-group">
                                <label htmlFor="inputEmail">E-Mail *</label>
                                <div style={{ position: 'relative' }}>
                                  <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                  <input 
                                    id="inputEmail"
                                    type="email" 
                                    required 
                                    className="form-control" 
                                    style={{ paddingLeft: '40px', width: '100%' }}
                                    placeholder="email@beispiel.de"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                  />
                                </div>
                              </div>

                              <div className="form-group booking-form-full">
                                <label htmlFor="inputPhone">Telefonnummer</label>
                                <div style={{ position: 'relative' }}>
                                  <Phone size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                  <input 
                                    id="inputPhone"
                                    type="tel" 
                                    className="form-control" 
                                    style={{ paddingLeft: '40px', width: '100%' }}
                                    placeholder="+49 170 1234567"
                                    value={formData.phone}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (/^[0-9+\s()/-]*$/.test(val)) {
                                        setFormData({ ...formData, phone: val });
                                      }
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="form-group booking-form-full">
                                <label htmlFor="inputMessage">Ergänzungen / Nachricht</label>
                                <textarea 
                                  id="inputMessage"
                                  className="form-control" 
                                  style={{ minHeight: '80px' }}
                                  placeholder="Zusätzliche Wünsche, Anmerkungen oder Fragen..."
                                  value={formData.message}
                                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                />
                              </div>
                            </div>

                            {/* Navigation buttons for Mobile only */}
                            <div className="mobile-step-nav" style={{ display: 'flex', gap: '12px' }}>
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ width: '40%' }}
                                onClick={() => setActiveFormStep(1)}
                              >
                                Zurück
                              </button>
                              <button 
                                type="button" 
                                className="btn-medieval-cta" 
                                style={{ width: '60%' }}
                                onClick={() => {
                                  if (!formData.name || !formData.email) {
                                    setErrorMessage("Bitte tragen Sie Ihren Namen und Ihre E-Mail-Adresse ein.");
                                  } else {
                                    setErrorMessage("");
                                    setActiveFormStep(3);
                                  }
                                }}
                              >
                                Weiter <ArrowRight size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Zusammenfassung & Senden */}
                      <div className={`booking-step-panel ${activeFormStep === 3 ? 'is-active' : ''}`}>
                        <div className="booking-step-header" onClick={() => { if (window.innerWidth < 992 && selectedDate && formData.name && formData.email) setActiveFormStep(3); }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>3</span> Zusammenfassung &amp; Senden
                          </div>
                          <ChevronRight className="accordion-chevron" size={18} />
                        </div>
                        
                        <div className="booking-step-body-wrapper">
                          <div className="booking-step-body">
                            {/* Summary Box */}
                            <div className="booking-summary-box" style={{ margin: '0 0 15px 0' }}>
                              <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
                                Zusammenfassung der Anfrage:
                              </h4>
                              <div className="booking-summary-row" style={{ marginBottom: '6px' }}>
                                <span>Termin:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                  {selectedDate ? selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Termin ausgewählt'}
                                </span>
                              </div>
                              <div className="booking-summary-row" style={{ marginBottom: '6px' }}>
                                <span>Führungstyp:</span>
                                <span>{tourType === 'classic' ? 'Standard-Führung' : 'Schulklasse / Jugend'}</span>
                              </div>
                              {tourType === 'classic' && (
                                <div className="booking-summary-row" style={{ marginBottom: '6px' }}>
                                  <span>Teilnehmer:</span>
                                  <span>{groupSize} Personen</span>
                                </div>
                              )}
                              <div className="booking-summary-row" style={{ marginBottom: '6px' }}>
                                <span>Im Gewand:</span>
                                <span style={{ color: '#10b981', fontWeight: 600 }}>Inklusive</span>
                              </div>
                              <div className="booking-summary-row total" style={{ paddingTop: '8px', marginTop: '8px' }}>
                                <span>Voraussichtlicher Preis:</span>
                                <span className="booking-summary-total-val">{calculateTotalCost()},00 €</span>
                              </div>
                            </div>

                            {/* Turnstile Antispam */}
                            <div className="cf-turnstile-wrapper" style={{ margin: '10px 0' }}>
                              <div ref={turnstileRef}></div>
                            </div>

                            {errorMessage && (
                              <div className="status-alert error" style={{ marginBottom: '16px', marginTop: '0px' }}>
                                <ShieldAlert size={18} /> {errorMessage}
                              </div>
                            )}

                            <button 
                              type="submit" 
                              className="btn-medieval-cta" 
                              style={{ width: '100%', height: '52px', marginTop: '10px' }}
                              disabled={isSubmitting || !turnstileToken}
                            >
                              <Flame size={16} className="glow-glow" />
                              {isSubmitting ? "Wird gesendet..." : "Führung unverbindlich anfragen"}
                            </button>

                            {/* Mobile Back Button */}
                            <div className="mobile-step-nav">
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ width: '100%', marginTop: '16px' }}
                                onClick={() => setActiveFormStep(2)}
                              >
                                Zurück zu den Kontaktdaten
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Final CTA */}
      <section className="cta-bg">
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <h2 className="cta-title">Bereit für eine Zeitreise durch Nienburg?</h2>
          <p className="cta-text">
            Wenn die Laterne leuchtet und die Hellebarde glänzt, beginnt eine Führung, die Geschichte lebendig macht. Frage jetzt deinen Wunschtermin an und erlebe Nienburg mit Stephan van Hausen aus einer besonderen Perspektive.
          </p>
          <button className="btn-medieval-cta" onClick={() => scrollToSection('buchung')}>
            <Flame size={16} className="glow-glow" />
            Jetzt Wunschtermin anfragen <ArrowRight size={18} />
          </button>
          
          <h3 className="cta-slogan">
            Nienburg bei Tag kennt jeder. <br />
            Komm mit, wenn die Geschichten erwachen.
          </h3>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            {/* Col 1: Brand details & Google rating */}
            <div className="footer-col">
              <a href="#" className="logo" style={{ marginBottom: '20px' }}>
                <img 
                  src="https://pub-b33108412309406a9a941ddc51e9a5b9.r2.dev/Stephan-van-Hausen/SVH-Flavercon.png" 
                  alt="Stephan van Hausen Logo" 
                  style={{ height: '36px', width: 'auto', display: 'block' }} 
                />
              </a>
              <p style={{ maxWidth: '320px' }}>
                Mit Hellebarde, Laterne und Horn führt dich der Nienburger Nachtwächter durch die historischen Gassen und Schatten der Altstadt.
              </p>
              
              {/* Google Review Button */}
              <a href="#google-review" className="google-review-btn">
                <span style={{ display: 'flex', gap: '3px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} fill="var(--accent)" size={14} stroke="none" />
                  ))}
                </span>
                <span>Auf Google bewerten</span>
              </a>
            </div>

            {/* Col 2: Contact Info */}
            <div className="footer-col">
              <h4>Kontakt</h4>
              <p style={{ marginBottom: '16px' }}>
                Stefan Hilker<br />
                Stephan van Hausen als Nienburger Nachtwächter<br />
                Im Osterfeld 44<br />
                31632 Husum
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="tel:+4916094813232" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={14} /> 0160 / 94813232
                </a>
                <a href="mailto:Info@nienburger-nachtwaechter.de" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={14} /> Info@nienburger-nachtwaechter.de
                </a>
              </div>
            </div>

            {/* Col 3: Navigation and Legal Modals */}
            <div className="footer-col">
              <h4>Navigation</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', listStyle: 'none', padding: 0 }}>
                <li><button onClick={() => scrollToSection('erlebnis')}>Das Erlebnis</button></li>
                <li><button onClick={() => scrollToSection('nachtwaechter')}>Der Nachtwächter</button></li>
                <li><button onClick={() => scrollToSection('preise')}>Dauer & Preise</button></li>
                <li><button onClick={() => scrollToSection('buchung')}>Buchung anfragen</button></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Stephan van Hausen – Nachtwächter-Führungen Nienburg. Alle Rechte vorbehalten.</p>
            <ul className="footer-bottom-links" style={{ display: 'flex', gap: '20px', listStyle: 'none', padding: 0 }}>
              <li>
                <button className="footer-link-btn" onClick={() => setActiveModal('impressum')}>
                  Impressum
                </button>
              </li>
              <li>
                <button className="footer-link-btn" onClick={() => setActiveModal('datenschutz')}>
                  Datenschutz
                </button>
              </li>
              <li>
                <button className="footer-link-btn" onClick={() => setActiveModal('agb')}>
                  AGB
                </button>
              </li>
            </ul>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.25)' }}>
              Design von <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Scholz & Friese</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Premium Modals (Impressum, Datenschutz, AGB) */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{activeModal === 'impressum' ? 'Impressum' : activeModal === 'datenschutz' ? 'Datenschutzerklärung' : 'Allgemeine Geschäftsbedingungen'}</h3>
                <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                  <X size={24} />
                </button>
              </div>
              
              <div className="modal-body">
                {activeModal === 'impressum' && (
                  <div>
                    <h4>Angaben gemäß § 5 TMG</h4>
                    <p>
                      Stefan Hilker<br />
                      Stephan van Hausen als Nienburger Nachtwächter<br />
                      Im Osterfeld 44<br />
                      31632 Husum
                    </p>
                    <h4>Kontakt</h4>
                    <p>
                      Mobil: 0160 / 94813232<br />
                      E-Mail: Info@nienburger-nachtwaechter.de
                    </p>
                    <h4>Redaktionell verantwortlich</h4>
                    <p>
                      Stefan Hilker<br />
                      Im Osterfeld 44<br />
                      31632 Husum
                    </p>
                    <h4>Verbraucherstreitbeilegung/Universalschlichtungsstelle</h4>
                    <p>
                      Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                  </div>
                )}

                {activeModal === 'datenschutz' && (
                  <div>
                    <h4>1. Datenschutz auf einen Blick</h4>
                    <p><strong>Allgemeine Hinweise</strong></p>
                    <p>
                      Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.
                    </p>
                    <p><strong>Datenerfassung auf dieser Website</strong></p>
                    <p>
                      Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber:
                    </p>
                    <p style={{ paddingLeft: '16px', borderLeft: '2px solid var(--accent)' }}>
                      Stefan Hilker<br />
                      Stephan van Hausen als Nienburger Nachtwächter<br />
                      Im Osterfeld 44<br />
                      31632 Husum<br />
                      E-Mail: Info@nienburger-nachtwaechter.de
                    </p>
                    <p>
                      Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei handelt es sich um die Daten, die Sie in unser Buchungsanfrage-Formular eingeben (Name, E-Mail-Adresse, Telefonnummer, Wunschtermin, Gruppengröße und optionale Nachricht). Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.
                    </p>

                    <h4>2. Hosting und CDN (Cloudflare)</h4>
                    <p>
                      Wir hosten unsere Website bei Cloudflare Pages. Anbieter ist die Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA (nachfolgend „Cloudflare“).
                    </p>
                    <p>
                      Cloudflare Pages ist ein global verfügbares Content Delivery Network (CDN) und Hosting-Dienst. Die Datenübertragung zwischen Ihrem Browser und unserer Website wird über das Server-Netzwerk von Cloudflare geleitet. Hierbei werden technische Protokolldaten (Logfiles), wie z. B. Ihre IP-Adresse, übertragen, um die Website auszuliefern, Angriffe abzuwehren und Ladezeiten zu optimieren. Dies stellt ein berechtigtes Interesse im Sinne des Art. 6 Abs. 1 lit. f DSGVO dar.
                    </p>
                    <p>
                      Cloudflare ist Teilnehmer des EU-US Data Privacy Frameworks. Die Datenübertragung in die USA wird dadurch auf Grundlage eines Angemessenheitsbeschlusses der EU-Kommission abgesichert.
                    </p>

                    <h4>3. Allgemeine Hinweise und Pflichtinformationen</h4>
                    <p><strong>Widerruf Ihrer Einwilligung zur Datenverarbeitung</strong></p>
                    <p>
                      Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
                    </p>
                    <p><strong>Beschwerderecht bei der zuständigen Aufsichtsbehörde</strong></p>
                    <p>
                      Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres üblichen Aufenthaltsorts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
                    </p>
                    <p><strong>Recht auf Datenübertragbarkeit</strong></p>
                    <p>
                      Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die direkte Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch machbar ist.
                    </p>
                    <p><strong>Auskunft, Berichtigung und Löschung</strong></p>
                    <p>
                      Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit an uns wenden.
                    </p>

                    <h4>4. Datenerfassung und Dienste auf dieser Website</h4>
                    <p><strong>Buchungsanfragen (Vertragsanbahnung)</strong></p>
                    <p>
                      Wenn Sie uns über unser Online-Formular eine Buchungsanfrage zukommen lassen, werden Ihre Angaben aus dem Formular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
                    </p>
                    <p>
                      Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO).
                    </p>
                    <p>
                      Die von Ihnen im Buchungsformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B. nach abgeschlossener Bearbeitung Ihrer Anfrage). Zwingende gesetzliche Bestimmungen – insbesondere Aufbewahrungsfristen – bleiben unberührt.
                    </p>
                    <p><strong>E-Mail-Versand via Resend</strong></p>
                    <p>
                      Für die Zustellung der Buchungs-E-Mails nutzen wir den E-Mail-Zustelldienst Resend (Resend Inc., 228 Park Ave S, PMB 99625, New York, NY 10003, USA).
                    </p>
                    <p>
                      Die Daten aus der Buchungsmaske werden verschlüsselt an die API von Resend übertragen, die die E-Mail zuverlässig an unsere E-Mail-Adresse versendet. Die Nutzung des Dienstes dient der Gewährleistung einer technisch stabilen E-Mail-Zustellung. Dies stellt ein berechtigtes Interesse gemäß Art. 6 Abs. 1 lit. f DSGVO dar.
                    </p>
                    <p><strong>Cloudflare Turnstile (Spam-Schutz)</strong></p>
                    <p>
                      Wir nutzen auf unserer Website den Spam-Schutz-Dienst Cloudflare Turnstile. Anbieter ist ebenfalls Cloudflare, Inc. (USA).
                    </p>
                    <p>
                      Turnstile dient der Prüfung, ob die Eingaben im Buchungsformular durch einen menschlichen Nutzer oder durch ein automatisiertes Skript/Bot erfolgen. Hierzu analysiert Turnstile das Verhalten des Besuchers anhand verschiedener Merkmale (z.B. IP-Adresse, Verweildauer auf der Website oder Mausbewegungen), ohne dass eine interaktive Captcha-Aufgabe gelöst werden muss. Die Auswertung läuft im Hintergrund. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt in der Abwehr von Spam, betrügerischen Nachrichten und Denial-of-Service-Angriffen.
                    </p>
                  </div>
                )}

                {activeModal === 'agb' && (
                  <div>
                    <h4>1. Geltungsbereich</h4>
                    <p>
                      Diese Allgemeinen Geschäftsbedingungen gelten für alle Führungen und Leistungen, die durch den Nachtwächter Stephan van Hausen in Nienburg erbracht werden.
                    </p>
                    <h4>2. Vertragsabschluss & Stornierung</h4>
                    <p>
                      Durch das Absenden der Terminanfrage auf dieser Website geben Sie ein unverbindliches Angebot ab. Ein verbindlicher Vertrag kommt erst zustande, wenn wir den Termin schriftlich (per E-Mail) bestätigen.
                    </p>
                    <p>
                      Stornierungen von Gruppenbuchungen sind bis zu 48 Stunden vor dem vereinbarten Führungstermin kostenfrei möglich. Bei späteren Absagen behalten wir uns vor, eine Ausfallpauschale in Höhe von 50 % des vereinbarten Preises in Rechnung zu stellen.
                    </p>
                    <h4>3. Durchführung & Haftung</h4>
                    <p>
                      Die Führungen finden grundsätzlich bei jedem Wetter statt, sofern keine akute Sicherheitsgefährdung (z.B. Unwetterwarnung) vorliegt. Die Teilnahme erfolgt auf eigene Gefahr. Für Sach- und Körperschäden haftet der Veranstalter nur bei Vorsatz oder grober Fahrlässigkeit.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Image Lightbox Modal */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
          >
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={() => setLightboxImg(null)}>×</button>
              <img src={lightboxImg} alt="Lightbox Vergrößerung" className="lightbox-img" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
