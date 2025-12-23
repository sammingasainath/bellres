"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, AlertCircle, DollarSign, Clock, Gift, ChevronRight, 
  Loader2, TrendingUp, CalendarDays, Sparkles, Timer, CheckCircle2,
  CalendarCheck, Banknote, PartyPopper, Search, Sun, Moon
} from 'lucide-react';
import { SCHEDULE_SHEETS } from '../../lib/scheduleConfig';
import Sidebar from '../../components/Sidebar';

// Parse date helper - handles various formats
function parseDate(str) {
  if (!str) return null;
  try {
    // Clean the string
    let cleaned = str.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Try direct parsing first
    let d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
    
    // Try extracting month day year pattern
    const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const lower = cleaned.toLowerCase();
    
    for (let i = 0; i < months.length; i++) {
      if (lower.includes(months[i])) {
        // Extract day and year
        const parts = cleaned.split(/\s+/);
        let day = null;
        let year = null;
        
        for (const part of parts) {
          const num = parseInt(part);
          if (!isNaN(num)) {
            if (num > 31) year = num;
            else if (num >= 1 && num <= 31) day = num;
          }
        }
        
        if (day && year) {
          d = new Date(year, i, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    
    return null;
  } catch { return null; }
}

// Format date nicely
function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Get days until a date
function daysUntil(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// Check if current pay period
function isCurrentPeriod(startStr, endStr) {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start || !end) return false;
  const now = new Date();
  return now >= start && now <= end;
}

// Download ICS file for calendar
function downloadICS(dateStr, title, description) {
  const date = parseDate(dateStr);
  if (!date) return;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateFormatted = `${year}${month}${day}`;
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bellagio Portal//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:${dateFormatted}
DTEND;VALUE=DATE:${dateFormatted}
SUMMARY:${title}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_${dateFormatted}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Main Content Component
function SchedulesContent() {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState('overview');
  const [rawData, setRawData] = useState({ payPeriod: [], vaPayroll: [], holidays2026: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all data on mount
  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const results = await Promise.all(
          SCHEDULE_SHEETS.map(async (sheet) => {
            if (!sheet.url) return [];
            const res = await fetch(sheet.url);
            const text = await res.text();
            return new Promise((resolve) => {
              Papa.parse(text, {
                header: false,
                skipEmptyLines: true,
                complete: (r) => resolve(r.data)
              });
            });
          })
        );
        setRawData({
          payPeriod: results[0] || [],
          vaPayroll: results[1] || [],
          holidays2026: results[2] || []
        });
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchAllData();
  }, []);

  // Parse pay periods
  const payPeriods = rawData.payPeriod.slice(2).filter(r => r[0] && r[1] && r[2]).map(row => ({
    start: row[0],
    end: row[1],
    payDay: row[2],
    isActive: isCurrentPeriod(row[0], row[1]),
    daysToPayDay: daysUntil(row[2])
  }));

  // Parse holidays from first sheet
  const holidays = [];
  let currentYear = null;
  rawData.payPeriod.slice(2).forEach(row => {
    if (row[4]) {
      if (/^\d{4}$/.test(row[4].trim())) {
        currentYear = row[4].trim();
      } else if (row[5]) {
        holidays.push({
          name: row[4],
          date: row[5],
          closedDate: row[6] || '',
          year: currentYear,
          daysUntil: daysUntil(row[5])
        });
      }
    }
  });

  // Find current/next pay period (US)
  const currentPeriod = payPeriods.find(p => p.isActive);
  const upcomingPayDays = payPeriods.filter(p => p.daysToPayDay !== null && p.daysToPayDay > 0).slice(0, 3);
  const nextPayDayUS = upcomingPayDays[0];

  // Calculate VA Payroll next pay days
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const dayOfMonth = new Date().getDate();
  const thisYear = new Date().getFullYear();
  const vaMonths = rawData.vaPayroll.slice(3).filter(row => row[0] && row[0].trim());
  const vaCurrentMonth = vaMonths.find(row => row[0]?.toLowerCase() === currentMonth.toLowerCase());
  
  // Helper to parse short dates like "12/30" into full dates
  const parseShortDate = (dateStr) => {
    if (!dateStr) return null;
    // If it's a short format like "12/30" or "1/15", add year
    const shortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (shortMatch) {
      const month = parseInt(shortMatch[1]) - 1;
      const day = parseInt(shortMatch[2]);
      // Assume current year, or next year if the date has passed
      let d = new Date(thisYear, month, day);
      if (d < new Date()) {
        d = new Date(thisYear + 1, month, day);
      }
      return d;
    }
    return parseDate(dateStr);
  };

  // Helper to calculate days until
  const calcDaysUntil = (dateStr) => {
    const date = parseShortDate(dateStr);
    if (!date) return null;
    return Math.ceil((date - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
  };
  
  // VA Twice-Monthly (ACH) - Q1 and Q2 payments
  const vaTwiceMonthlyQ1Str = vaCurrentMonth?.[2]; // Column C - Q1 Payment Date
  const vaTwiceMonthlyQ2Str = vaCurrentMonth?.[6]; // Column G - Q2 Payment Date
  const vaTwiceMonthlyStr = dayOfMonth <= 15 ? vaTwiceMonthlyQ1Str : vaTwiceMonthlyQ2Str;
  const vaTwiceMonthlyDays = calcDaysUntil(vaTwiceMonthlyStr);
  
  // VA Monthly payment
  const vaMonthlyStr = vaCurrentMonth?.[10]; // Column K - Monthly Payment Date
  const vaMonthlyDays = calcDaysUntil(vaMonthlyStr);

  // For backwards compatibility
  const vaNextPaymentStr = vaTwiceMonthlyStr || vaMonthlyStr;
  const vaNextPayDays = vaTwiceMonthlyDays !== null ? vaTwiceMonthlyDays : vaMonthlyDays;

  // All 3 payroll types
  const allPayrollTypes = [
    { 
      type: 'US Biweekly', 
      badge: 'onsite',
      date: nextPayDayUS?.payDay || 'N/A',
      days: nextPayDayUS?.daysToPayDay !== null ? nextPayDayUS?.daysToPayDay : null
    },
    { 
      type: 'VA Twice-Monthly', 
      badge: 'va-ach',
      date: vaTwiceMonthlyStr || 'N/A',
      days: vaTwiceMonthlyDays
    },
    { 
      type: 'VA Monthly', 
      badge: 'va-monthly',
      date: vaMonthlyStr || 'N/A',
      days: vaMonthlyDays
    }
  ];

  // Contextual next pay day based on active view (legacy)
  const getContextualPayDay = () => {
    if (activeView === 'va-payroll') {
      return vaNextPayDays !== null && vaNextPayDays >= 0 
        ? { daysToPayDay: vaNextPayDays, payDay: vaNextPaymentStr }
        : null;
    }
    return nextPayDayUS;
  };
  const nextPayDay = getContextualPayDay();

  // Find upcoming holidays
  const upcomingHolidays = holidays.filter(h => h.daysUntil !== null && h.daysUntil >= 0 && h.daysUntil <= 90).slice(0, 4);

  const views = [
    { id: 'overview', name: 'Overview', icon: Sparkles },
    { id: 'pay-periods', name: 'OnSite Pay Periods', icon: CalendarDays },
    { id: 'holidays', name: 'Holidays', icon: PartyPopper },
    { id: 'va-payroll', name: 'VA Payroll', icon: Banknote },
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar activeCategory="Schedules" onNavigate={() => {}} />
        <main className="main-content">
          <div className="loading-fullscreen">
            <div className="loader-ring"></div>
            <p>Loading schedules...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar activeCategory="Schedules" onNavigate={() => {}} />
      
      <main className="main-content">
        <div className="content-scroll ultra-schedules">
          {/* Hero Header */}
          <div className="schedule-hero">
            <div className="hero-content">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Schedules & Calendars
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Your complete view of pay periods, holidays, and payroll calendars
              </motion.p>
            </div>
            {/* 3 Payroll Countdowns */}
            <div className="hero-payroll-grid">
              {allPayrollTypes.map((payroll, i) => (
                <motion.div 
                  key={payroll.type}
                  className={`hero-payroll-card ${payroll.badge}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <div className="hero-payroll-badge">{payroll.type}</div>
                  <div className="hero-payroll-days">
                    {payroll.days !== null ? payroll.days : '-'}
                  </div>
                  <div className="hero-payroll-label">days</div>
                  <div className="hero-payroll-date">{payroll.date}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="schedule-search">
            <Search size={18} className="schedule-search-icon" />
            <input
              type="text"
              placeholder="Search pay periods, holidays, dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Switcher */}
          <div className="view-switcher">
            {views.map((view, i) => {
              const Icon = view.icon;
              return (
                <motion.button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={`view-btn ${activeView === view.id ? 'active' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span>{view.name}</span>
                  {activeView === view.id && (
                    <motion.div className="active-glow" layoutId="activeGlow" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Content Views */}
          <AnimatePresence mode="wait">
            {activeView === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="overview-grid"
              >
                {/* Dual Payroll Section */}
                <div className="dual-payroll-section">
                  <h2 className="section-title">📅 Payroll Overview</h2>
                  <div className="payroll-comparison">
                    {/* US Biweekly Payroll */}
                    <motion.div 
                      className="payroll-card us-payroll"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ y: -4 }}
                    >
                      <div className="payroll-card-header">
                        <span className="payroll-badge us">US Biweekly</span>
                        <CalendarDays size={20} />
                      </div>
                      <div className="payroll-card-body">
                        <div className="payroll-stat">
                          <span className="stat-label">Current Period</span>
                          <span className="stat-value">{currentPeriod ? `${currentPeriod.start.split(',')[1]?.trim() || ''} - ${currentPeriod.end.split(',')[1]?.trim() || ''}` : 'N/A'}</span>
                        </div>
                        <div className="payroll-stat highlight">
                          <span className="stat-label">💰 Next Pay Day</span>
                          <span className="stat-value green">{nextPayDayUS?.payDay || 'N/A'}</span>
                        </div>
                        <div className="payroll-countdown">
                          <span className="countdown-num">{nextPayDayUS?.daysToPayDay || '-'}</span>
                          <span className="countdown-label">days</span>
                        </div>
                      </div>

                    </motion.div>

                    {/* VA Twice-Monthly Payroll */}
                    <motion.div 
                      className="payroll-card va-payroll"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ y: -4 }}
                    >
                      <div className="payroll-card-header">
                        <span className="payroll-badge va">VA Twice-Monthly</span>
                        <Banknote size={20} />
                      </div>
                      <div className="payroll-card-body">
                        <div className="payroll-stat">
                          <span className="stat-label">Current Period</span>
                          <span className="stat-value">{dayOfMonth <= 15 ? 'Q1 (1st-15th)' : 'Q2 (16th-End)'}</span>
                        </div>
                        <div className="payroll-stat highlight">
                          <span className="stat-label">💰 Next Pay Day</span>
                          <span className="stat-value green">{vaNextPaymentStr || 'N/A'}</span>
                        </div>
                        <div className="payroll-countdown">
                          <span className="countdown-num">{vaNextPayDays !== null ? vaNextPayDays : '-'}</span>
                          <span className="countdown-label">days</span>
                        </div>
                      </div>

                    </motion.div>

                    {/* VA Monthly Payroll */}
                    <motion.div 
                      className="payroll-card va-monthly-payroll"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4 }}
                    >
                      <div className="payroll-card-header">
                        <span className="payroll-badge va-monthly">VA Monthly</span>
                        <Banknote size={20} />
                      </div>
                      <div className="payroll-card-body">
                        <div className="payroll-stat">
                          <span className="stat-label">Payment Type</span>
                          <span className="stat-value">Monthly ACH</span>
                        </div>
                        <div className="payroll-stat highlight">
                          <span className="stat-label">💰 Next Pay Day</span>
                          <span className="stat-value green">{vaMonthlyStr || 'N/A'}</span>
                        </div>
                        <div className="payroll-countdown">
                          <span className="countdown-num">{vaMonthlyDays !== null ? vaMonthlyDays : '-'}</span>
                          <span className="countdown-label">days</span>
                        </div>
                      </div>

                    </motion.div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="quick-stats-row">
                  <StatCard 
                    icon={<Gift size={24} />}
                    label="Next Holiday"
                    value={upcomingHolidays[0]?.name || 'N/A'}
                    subtext={upcomingHolidays[0] ? `in ${upcomingHolidays[0].daysUntil} days` : ''}
                    color="purple"
                  />
                  <StatCard 
                    icon={<TrendingUp size={24} />}
                    label="Pay Periods Left"
                    value={payPeriods.filter(p => p.daysToPayDay && p.daysToPayDay > 0).length.toString()}
                    subtext="in 2025"
                    color="amber"
                  />
                </div>

                {/* Two Column Layout */}
                <div className="overview-columns">
                  {/* Upcoming Pay Days */}
                  <div className="ultra-card">
                    <div className="ultra-card-header">
                      <DollarSign size={20} />
                      <h3>Upcoming Pay Days (US Biweekly)</h3>
                    </div>
                    <div className="timeline">
                      {upcomingPayDays.map((period, i) => (
                        <TimelineItem 
                          key={i}
                          title={period.payDay}
                          subtitle={`Period: ${period.start.split(',')[1]?.trim()} - ${period.end.split(',')[1]?.trim()}`}
                          badge={`${period.daysToPayDay} days`}
                          isFirst={i === 0}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Upcoming Holidays */}
                  <div className="ultra-card holidays-preview">
                    <div className="ultra-card-header">
                      <PartyPopper size={20} />
                      <h3>Upcoming Holidays</h3>
                    </div>
                    <div className="holiday-cards-grid">
                      {upcomingHolidays.map((holiday, i) => (
                        <motion.div 
                          key={i}
                          className="mini-holiday-card"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          whileHover={{ y: -4 }}
                        >
                          <div className="holiday-emoji">
                            {holiday.name.includes('Christmas') ? '🎄' : 
                             holiday.name.includes('New Year') ? '🎆' :
                             holiday.name.includes('Independence') ? '🗽' :
                             holiday.name.includes('Thanksgiving') ? '🦃' :
                             holiday.name.includes('Memorial') ? '🎖️' :
                             holiday.name.includes('Labor') ? '👷' : '🎉'}
                          </div>
                          <div className="holiday-info">
                            <h4>{holiday.name}</h4>
                            <p>{holiday.date}</p>
                          </div>
                          <div className="holiday-countdown">
                            <span className="days">{holiday.daysUntil}</span>
                            <span className="label">days</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'pay-periods' && (
              <motion.div
                key="pay-periods"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="pay-periods-view"
              >
                {/* Current Period Highlight */}
                {currentPeriod && (
                  <div className="current-period-spotlight">
                    <div className="spotlight-header">
                      <div className="spotlight-badge">📍 Current Pay Period</div>
                      <div className="spotlight-progress">
                        <span>Progress</span>
                        <div className="progress-bar">
                          <motion.div 
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, ((14 - (currentPeriod.daysToPayDay || 0)) / 14) * 100))}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                        <span>{currentPeriod.daysToPayDay} days to pay day</span>
                      </div>
                    </div>
                    <div className="spotlight-content">
                      <div className="spotlight-dates">
                        <div className="spotlight-date-block">
                          <span className="label">Period Start</span>
                          <span className="value">{currentPeriod.start}</span>
                        </div>
                        <div className="spotlight-arrow">→</div>
                        <div className="spotlight-date-block">
                          <span className="label">Period End</span>
                          <span className="value">{currentPeriod.end}</span>
                        </div>
                        <div className="spotlight-payday">
                          <span className="label">💰 Pay Day</span>
                          <span className="value green">{currentPeriod.payDay}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Pay Periods Grid */}
                <div className="periods-grid-section">
                  <h3>All Pay Periods {searchQuery && `(filtered)`}</h3>
                  <div className="periods-card-grid">
                    {payPeriods
                      .filter(period => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return period.start.toLowerCase().includes(q) ||
                               period.end.toLowerCase().includes(q) ||
                               period.payDay.toLowerCase().includes(q);
                      })
                      .map((period, i) => (
                      <motion.div
                        key={i}
                        className={`period-card ${period.isActive ? 'active' : ''} ${period.daysToPayDay && period.daysToPayDay < 0 ? 'past' : ''}`}
                        id={period.isActive ? 'current-period-card' : undefined}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        onAnimationComplete={() => {
                          if (period.isActive && !searchQuery) {
                            setTimeout(() => {
                              document.getElementById('current-period-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }
                        }}
                      >
                        {period.isActive && <div className="card-current-badge">NOW</div>}
                        <div className="card-header">
                          <span className="card-num">#{i + 1}</span>
                          {period.daysToPayDay !== null && period.daysToPayDay >= 0 && (
                            <span className="card-days">{period.daysToPayDay}d</span>
                          )}
                        </div>
                        <div className="card-dates">
                          <div className="card-start">{period.start.split(',').slice(0, 2).join(',')}</div>
                          <div className="card-end">{period.end.split(',').slice(0, 2).join(',')}</div>
                        </div>
                        <div className="card-payday">
                          <DollarSign size={12} />
                          <span>{period.payDay.split(',').slice(0, 2).join(',')}</span>
                        </div>

                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'holidays' && (
              <motion.div
                key="holidays"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="holidays-view"
              >
                <div className="year-section">
                  <div className="year-badge-large">2025</div>
                  <div className="holidays-mega-grid">
                    {holidays.filter(h => h.year === '2025').map((holiday, i) => (
                      <HolidayMegaCard key={i} holiday={holiday} index={i} />
                    ))}
                  </div>
                </div>
                <div className="year-section">
                  <div className="year-badge-large">2026</div>
                  <div className="holidays-mega-grid">
                    {holidays.filter(h => h.year === '2026').map((holiday, i) => (
                      <HolidayMegaCard key={i} holiday={holiday} index={i} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'va-payroll' && (
              <motion.div
                key="va-payroll"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="va-payroll-view"
              >
                <VAPayrollDashboard data={rawData.vaPayroll} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, subtext, color, highlight }) {
  return (
    <motion.div 
      className={`stat-card ${color} ${highlight ? 'highlight' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {subtext && <span className="stat-subtext">{subtext}</span>}
      </div>
    </motion.div>
  );
}

// Timeline Item Component
function TimelineItem({ title, subtitle, badge, isFirst }) {
  return (
    <div className={`timeline-item ${isFirst ? 'first' : ''}`}>
      <div className="timeline-dot"></div>
      <div className="timeline-content">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </div>
      <div className="timeline-badge">{badge}</div>
    </div>
  );
}

// Holiday Mega Card
function HolidayMegaCard({ holiday, index }) {
  const emoji = holiday.name.includes('Christmas') ? '🎄' : 
                holiday.name.includes('New Year') ? '🎆' :
                holiday.name.includes('Independence') ? '🗽' :
                holiday.name.includes('Thanksgiving') ? '🦃' :
                holiday.name.includes('Memorial') ? '🎖️' :
                holiday.name.includes('Labor') ? '👷' : '🎉';

  const isUpcoming = holiday.daysUntil !== null && holiday.daysUntil >= 0 && holiday.daysUntil <= 30;

  // Clean up duplicate text in data (e.g., "Thursday November 26Thursday November 26")
  const cleanText = (text) => {
    if (!text) return '';
    // Check if the string contains a duplicate pattern
    const halfLen = Math.floor(text.length / 2);
    const firstHalf = text.substring(0, halfLen);
    const secondHalf = text.substring(halfLen);
    if (firstHalf === secondHalf) return firstHalf;
    return text;
  };

  return (
    <motion.div 
      className={`holiday-mega-card ${isUpcoming ? 'upcoming' : ''}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.03 }}
    >
      {isUpcoming && <div className="upcoming-ribbon">Coming Soon!</div>}
      <div className="mega-emoji">{emoji}</div>
      <h3>{holiday.name}</h3>
      <p className="mega-date">{cleanText(holiday.date)}</p>
      {holiday.closedDate && (
        <p className="mega-closed">Office: {cleanText(holiday.closedDate)}</p>
      )}
      {holiday.daysUntil !== null && holiday.daysUntil >= 0 && (
        <div className="mega-countdown">
          <span className="count">{holiday.daysUntil}</span>
          <span className="unit">days away</span>
        </div>
      )}
    </motion.div>
  );
}

// VA Payroll Dashboard Component
function VAPayrollDashboard({ data }) {
  const [payrollView, setPayrollView] = useState('twice-monthly');
  
  // Parse the data - skip first 3 header rows
  const months = data.slice(3).filter(row => row[0] && row[0].trim());
  
  // Parse holidays from columns 14-16
  const holidays = data.slice(3)
    .filter(row => row[14] && row[15])
    .map(row => ({
      name: row[14],
      date: row[15],
      closedDate: row[16] || ''
    }));

  const payrollViews = [
    { id: 'twice-monthly', name: 'Twice Monthly (ACH)', icon: CalendarDays },
    { id: 'monthly', name: 'Monthly', icon: Calendar },
  ];

  // Calculate stats for current month
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const currentMonthData = months.find(row => row[0]?.toLowerCase() === currentMonth.toLowerCase());
  const dayOfMonth = new Date().getDate();
  
  // Stats that change based on view
  const getStats = () => {
    if (payrollView === 'monthly') {
      return {
        paymentLabel: 'Monthly Payment',
        paymentValue: currentMonthData?.[10] || '-',
        paymentSubtext: currentMonth,
        cutoffLabel: 'Payroll Cut-off',
        cutoffValue: currentMonthData?.[12] || '-',
        daysValue: currentMonthData?.[11] || '-',
        daysLabel: 'Working Days',
      };
    } else {
      // Twice monthly
      const isQ1 = dayOfMonth <= 15;
      return {
        paymentLabel: 'Next Payment',
        paymentValue: isQ1 ? (currentMonthData?.[2] || '-') : (currentMonthData?.[6] || '-'),
        paymentSubtext: isQ1 ? 'Q1 (1st-15th)' : 'Q2 (16th-End)',
        cutoffLabel: 'Payroll Cut-off',
        cutoffValue: isQ1 ? (currentMonthData?.[4] || '-') : (currentMonthData?.[8] || '-'),
        daysValue: isQ1 ? (currentMonthData?.[3] || '-') : (currentMonthData?.[7] || '-'),
        daysLabel: 'Working Days',
      };
    }
  };
  
  const stats = getStats();
  
  // Get next upcoming holiday (calculate days until)
  const holidaysWithDays = holidays.map(h => ({
    ...h,
    daysUntil: daysUntil(h.date)
  })).filter(h => h.daysUntil !== null && h.daysUntil >= 0);
  
  const nextHoliday = holidaysWithDays.sort((a, b) => a.daysUntil - b.daysUntil)[0];

  return (
    <div className="va-payroll-dashboard">
      {/* Stats Row */}
      <div className="va-stats-row">
        <motion.div 
          className="va-stat-card green"
          key={`payment-${payrollView}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4 }}
        >
          <div className="va-stat-icon"><DollarSign size={24} /></div>
          <div className="va-stat-content">
            <span className="va-stat-label">{stats.paymentLabel}</span>
            <span className="va-stat-value">{stats.paymentValue}</span>
            <span className="va-stat-subtext">{stats.paymentSubtext}</span>
          </div>
        </motion.div>

        <motion.div 
          className="va-stat-card amber"
          key={`cutoff-${payrollView}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -4 }}
        >
          <div className="va-stat-icon"><Timer size={24} /></div>
          <div className="va-stat-content">
            <span className="va-stat-label">{stats.cutoffLabel}</span>
            <span className="va-stat-value">{stats.cutoffValue}</span>
            <span className="va-stat-subtext">{currentMonth}</span>
          </div>
        </motion.div>

        <motion.div 
          className="va-stat-card blue"
          key={`days-${payrollView}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4 }}
        >
          <div className="va-stat-icon"><CalendarCheck size={24} /></div>
          <div className="va-stat-content">
            <span className="va-stat-label">{stats.daysLabel}</span>
            <span className="va-stat-value">{stats.daysValue} days</span>
            <span className="va-stat-subtext">{payrollView === 'monthly' ? 'Full Month' : (dayOfMonth <= 15 ? 'Q1 Period' : 'Q2 Period')}</span>
          </div>
        </motion.div>

        <motion.div 
          className="va-stat-card purple"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -4 }}
        >
          <div className="va-stat-icon"><Gift size={24} /></div>
          <div className="va-stat-content">
            <span className="va-stat-label">Next Holiday</span>
            <span className="va-stat-value">{nextHoliday?.name || 'N/A'}</span>
            <span className="va-stat-subtext">{nextHoliday?.date || ''}</span>
          </div>
        </motion.div>
      </div>

      {/* Sub-navigation */}
      <div className="payroll-sub-nav">
        {payrollViews.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setPayrollView(view.id)}
              className={`payroll-nav-btn ${payrollView === view.id ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{view.name}</span>
            </button>
          );
        })}
      </div>

      <div className="payroll-content-grid">
        {/* Main Payroll Section */}
        <div className="payroll-main">
          {payrollView === 'twice-monthly' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="twice-monthly-section"
            >
              <div className="payroll-section-header">
                <h3>🏦 ACH Twice-a-Month Schedule</h3>
                <p>First half (Q1) and second half (Q2) payment periods</p>
              </div>
              
              <div className="payroll-months-grid">
                {months.map((row, i) => (
                  <motion.div 
                    key={i}
                    className="payroll-month-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="month-name">{row[0]}</div>
                    <div className="month-periods">
                      <div className="period-block q1">
                        <div className="period-label">Q1 (1st-15th)</div>
                        <div className="period-detail">
                          <span className="detail-label">Date</span>
                          <span className="detail-value">{row[1] || '-'}</span>
                        </div>
                        <div className="period-detail">
                          <span className="detail-label">Payment</span>
                          <span className="detail-value highlight">{row[2] || '-'}</span>
                        </div>
                        <div className="period-detail">
                          <span className="detail-label">Days</span>
                          <span className="detail-value">{row[3] || '-'}</span>
                        </div>
                        <div className="period-detail">
                          <span className="detail-label">Cut-off</span>
                          <span className="detail-value accent">{row[4] || '-'}</span>
                        </div>
                      </div>
                      <div className="period-block q2">
                        <div className="period-label">Q2 (16th-End)</div>
                        <div className="period-detail">
                          <span className="detail-label">Date</span>
                          <span className="detail-value">{row[5] || '-'}</span>
                        </div>
                        <div className="period-detail">
                          <span className="detail-label">Payment</span>
                          <span className="detail-value highlight">{row[6] || '-'}</span>
                        </div>
                        <div className="period-detail">
                          <span className="detail-label">Days</span>
                          <span className="detail-value">{row[7] || '-'}</span>
                        </div>
                        <div className="period-detail">
                          <span className="detail-label">Cut-off</span>
                          <span className="detail-value accent">{row[8] || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {payrollView === 'monthly' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="monthly-section"
            >
              <div className="payroll-section-header">
                <h3>📅 Monthly Payment Schedule</h3>
                <p>End-of-month payroll processing dates</p>
              </div>
              
              <div className="monthly-cards-grid">
                {months.map((row, i) => (
                  <motion.div 
                    key={i}
                    className="monthly-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="monthly-month">{row[0]}</div>
                    <div className="monthly-details">
                      <div className="monthly-row">
                        <span>Period End</span>
                        <strong>{row[9] || '-'}</strong>
                      </div>
                      <div className="monthly-row payment">
                        <span>Payment Date</span>
                        <strong>{row[10] || '-'}</strong>
                      </div>
                      <div className="monthly-row">
                        <span>Working Days</span>
                        <strong>{row[11] || '-'}</strong>
                      </div>
                      <div className="monthly-row cutoff">
                        <span>Payroll Cut-off</span>
                        <strong>{row[12] || '-'}</strong>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Holidays Sidebar */}
        <div className="payroll-holidays-sidebar">
          <div className="sidebar-header">
            <Gift size={18} />
            <h4>Upcoming Holidays</h4>
          </div>
          <div className="holidays-mini-list">
            {holidaysWithDays.slice(0, 8).map((h, i) => (
              <div key={i} className="holiday-mini-item">
                <div className="holiday-mini-info">
                  <span className="holiday-mini-name">{h.name}</span>
                  <span className="holiday-mini-date">{h.date}</span>
                </div>
                {h.daysUntil !== null && (
                  <span className="holiday-mini-days">{h.daysUntil}d</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  return (
    <Suspense fallback={
      <div className="dashboard-container">
        <div className="loading-fullscreen">
          <div className="loader-ring"></div>
        </div>
      </div>
    }>
      <SchedulesContent />
    </Suspense>
  );
}
