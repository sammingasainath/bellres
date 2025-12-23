"use client";

import { useState } from "react";
import { Home, Calendar, Users, Briefcase, FileText, Settings, Truck, CreditCard, Archive, BookOpen, Clock, BarChart, Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { portalData } from "../lib/data";

// Icon mapping
export const iconMap = {
  "Employees": Users,
  "Managers": Briefcase,
  "HR": FileText,
  "Operations": Settings,
  "Providers": Truck,
  "Other Homes": Home,
  "Contractors / 1099": CreditCard,
  "Back Office": Archive,
  "Training": BookOpen,
  "VA": Clock,
  "Daily Reports": BarChart
};

export default function Sidebar({ activeCategory, onNavigate }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (id, isPage = false) => {
    setIsOpen(false); // Close sidebar first
    
    // Delay navigation/scroll slightly to allow sidebar to close
    setTimeout(() => {
      if (isPage) {
        router.push(id);
      } else {
        if (pathname !== '/') {
          router.push('/?cat=' + id);
        } else {
          onNavigate(id);
          // Also try direct scroll on mobile
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }, 350); // increased delay to wait for sidebar animation (300ms)
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="brand-title">Bellagio<span className="text-highlight">.</span></h1>
          <button 
            className="mobile-close-btn"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="nav-menu">
          <button 
            onClick={() => handleNavigation("/", true)}
            className={`nav-item ${pathname === "/" ? "active" : ""}`}
            style={{marginBottom: '5px'}}
          >
            <div className="nav-icon"><Home size={18} /></div>
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => handleNavigation("/schedules", true)}
            className={`nav-item ${pathname === "/schedules" ? "active" : ""}`}
            style={{marginBottom: '20px'}}
          >
            <div className="nav-icon"><Calendar size={18} /></div>
            <span>Schedules</span>
          </button>

          <div className="nav-label">Categories</div>
          {portalData.map((cat) => {
            const Icon = iconMap[cat.category] || FileText;
            return (
              <button
                key={cat.category}
                onClick={() => handleNavigation(cat.category)}
                className={`nav-item ${activeCategory === cat.category ? "active" : ""}`}
              >
                <div className="nav-icon"><Icon size={18} /></div>
                <span>{cat.category}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
