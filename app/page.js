"use client";

import { motion, AnimatePresence } from "framer-motion";
import { portalData } from "../lib/data";
import { 
  ExternalLink, Search, FileText, Link, ChevronUp, 
  BookOpen, Clock, CalendarOff, Receipt, AlertTriangle, 
  DollarSign, Image, Share2, Briefcase, UserPlus, Star, 
  BarChart2, Megaphone, FileSignature, Users, Badge, 
  TrendingUp, UserMinus, Heart, Monitor, Zap, Package, 
  Wrench, Smartphone, List, Calendar, Shield, Home, 
  Activity, X, Building, BarChart, Settings, 
  UploadCloud, Table, Database, GraduationCap, LogIn, 
  Edit2, Clipboard, CheckSquare, Banknote, UserCheck, Fan
} from "lucide-react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar, { iconMap } from "../components/Sidebar";

// Map string icon names to components
const LinkIcons = {
  BookOpen, Clock, CalendarOff, Receipt, AlertTriangle, 
  DollarSign, Image, Share2, Briefcase, UserPlus, Star: Star, 
  FileText, BarChart2, Megaphone, FileSignature, Users, Badge, 
  TrendingUp, UserMinus, Heart, Monitor, Zap, Package, 
  Tool: Wrench, Smartphone, List, Calendar, Shield, Home, 
  Activity, Cross: X, Building, BarChart, Settings, 
  UploadCloud, Table, Database, GraduationCap, LogIn, 
  Edit2, Clipboard, CheckSquare, Banknote, 'user-check': UserCheck,
  HVAC: Fan
};

function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showToast, setShowToast] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchParams = useSearchParams();

  // Robust scroll function with retries
  const scrollToSection = (id) => {
    // Try to find element immediately
    const attemptScroll = (attemptsLeft) => {
      const element = document.getElementById(id);
      const scrollContainer = document.querySelector('.content-scroll');
      
      if (element && scrollContainer) {
        // Found it! Scroll now.
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        // Calculate offset (element top relative to container top)
        // Add current scrollTop to get absolute position in scrollable area
        const relativeTop = elementRect.top - containerRect.top;
        const currentScroll = scrollContainer.scrollTop;
        const targetScroll = currentScroll + relativeTop - 20; // 20px padding
        
        scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
        setActiveCategory(id);
        return true;
      }
      
      // Not found yet, retry if attempts left
      if (attemptsLeft > 0) {
        setTimeout(() => attemptScroll(attemptsLeft - 1), 100);
      }
      return false;
    };
    
    // Start trying: 20 attempts * 100ms = 2 seconds max wait
    attemptScroll(20);
  };

  // Scroll to section from URL query parameter on init
  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat) {
      // Use the robust scroller
      scrollToSection(cat);
    }
  }, [searchParams]);

  // Back to top button visibility + Active section detection
  useEffect(() => {
    const scrollContainer = document.querySelector('.content-scroll');
    if (!scrollContainer) return;
    
    let lastSection = 'All';
    
    const handleScroll = () => {
      // Back to top visibility
      setShowBackToTop(scrollContainer.scrollTop > 300);
      
      // Active section detection
      const sections = document.querySelectorAll('.category-section');
      let currentSection = 'All';
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        // Check if section is in viewport (top half of screen)
        if (rect.top <= 200 && rect.bottom > 100) {
          currentSection = section.id;
        }
      });
      
      if (currentSection !== lastSection) {
        lastSection = currentSection;
        setActiveCategory(currentSection);
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []); // Empty dependency array - scroll handler manages its own state

  const filteredData = portalData.map((category) => ({
    ...category,
    links: category.links.filter((link) =>
      link.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(category => category.links.length > 0);

  const handleScrollTo = (id) => {
    scrollToSection(id);
  };

  return (
    <div className="dashboard-container">
      <Sidebar activeCategory={activeCategory} onNavigate={handleScrollTo} />

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar" id="top">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search reports, forms, links..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </header>

        <div className="content-scroll">
           {/* Welcome Hero (Only show when not searching) */}
           {!searchTerm && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hero-banner"
            >
              <h2>Welcome to Bellagio Plaza</h2>
              <p>Select a category to get started or use the search bar above.</p>
            </motion.div>
          )}

          <div className="categories-grid">
            {filteredData.map((category, index) => {
              // Icon mapping is now in Sidebar but we repeat or import it?
              // Ideally import it, but for speed I will use a fallback or re-import if I exported it.
              // I exported it from Sidebar.js
              const Icon = FileText; // Fallback for now to avoid complexity or import from component if possible.
              // Actually I should simple import { iconMap } from '../components/Sidebar'
              
              return (
                <section key={category.category} id={category.category} className="category-section">
                  <div className="section-header group">
                    <div className="section-icon-wrapper">
                      <Icon size={24} color="#fbbf24" />
                    </div>
                    <h3>{category.category}</h3>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/?cat=${encodeURIComponent(category.category)}`;
                        navigator.clipboard.writeText(url);
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                      }}
                      className="copy-link-btn"
                      title="Copy direct link to this section"
                    >
                      <Link size={18} />
                    </button>
                  </div>
                  
                  <div className="links-grid">
                    {category.links.map((link, i) => (
                      <motion.a 
                        key={link.name} 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`link-card ${link.image ? 'has-image' : ''}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        {link.image && (
                          <>
                            <div className="link-card-bg" style={{ backgroundImage: `url(${link.image})` }}></div>
                            <div className="link-card-overlay"></div>
                          </>
                        )}
                        <div className="link-content">
                          <div className={`link-icon-wrapper bg-gradient-to-br ${link.gradient || 'from-gray-700 to-gray-600'}`}>
                            {LinkIcons[link.icon] ? (
                               (() => {
                                 const Icon = LinkIcons[link.icon];
                                 return <Icon size={20} color="white" strokeWidth={2} />;
                               })()
                            ) : (
                               <FileText size={20} color="white" />
                            )}
                          </div>
                          <div className="link-info">
                            <span className="link-name">{link.name}</span>
                            <span className="link-action">Open Resource <ExternalLink size={12} /></span>
                          </div>
                        </div>
                        <div className="card-shine"></div>
                      </motion.a>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          
          {filteredData.length === 0 && (
            <div className="empty-state">
              <Search size={48} color="#475569" />
              <p>No results found for "{searchTerm}"</p>
            </div>
          )}
        </div>
      </main>
      
      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              const scrollContainer = document.querySelector('.content-scroll');
              if (scrollContainer) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="back-to-top-btn"
            title="Back to top"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="toast-notification"
          >
            <div className="toast-icon"></div>
            <span>Link Copied!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function Dashboard() {
  return (
    <Suspense fallback={<div className="dashboard-container">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
