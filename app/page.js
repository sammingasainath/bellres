"use client";

import { motion } from "framer-motion";
import { portalData } from "../lib/data";
import { ExternalLink, Search, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar, { iconMap } from "../components/Sidebar";

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const searchParams = useSearchParams();

  // Scroll to section from URL query parameter on init
  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(cat);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          setActiveCategory(cat);
        }
      }, 500);
    }
  }, [searchParams]);

  const filteredData = portalData.map((category) => ({
    ...category,
    links: category.links.filter((link) =>
      link.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(category => category.links.length > 0);

  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveCategory(id);
    } else {
       setActiveCategory("All");
       window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
                        alert(`Link copied to clipboard!\n${url}`);
                      }}
                      className="copy-link-btn"
                      title="Copy direct link to this section"
                    >
                      <ExternalLink size={18} />
                    </button>
                  </div>
                  
                  <div className="links-grid">
                    {category.links.map((link, i) => (
                      <motion.a 
                        key={link.name} 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <div className="link-content">
                          <span className="link-name">{link.name}</span>
                          <ExternalLink size={14} className="link-arrow" />
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
    </div>
  );
}
