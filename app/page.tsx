'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from './components/ThemeToggle';

// Type definitions for news items
interface NewsItem {
  title: string;
  link: string;
  description: string;
  fullContent: string;
  pubDate: string;
  creator: string;
  categories: string[];
  imageUrl: string | null;
  guid: string;
  source: string;
  detectedCategory?: string;
}

interface NewsFeed {
  title: string;
  link: string;
  description: string;
  items: NewsItem[];
}

// Category definitions with strict, specific keywords
const CATEGORIES = [
  { id: 'all', name: 'Të gjitha', keywords: [], minScore: 0 },
  { 
    id: 'politike', 
    name: 'Politikë', 
    keywords: [
      // Government & officials
      'qeveri', 'kryeministër', 'kryeministri', 'ministër', 'ministri', 'ministria',
      'president', 'presidenti', 'parlament', 'parlamenti', 'deputet', 'deputetë',
      'zyrtar', 'zyrtarë', 'asambelë', 'asambleja', 'kabinetti', 'kabinet',
      // Political parties (Kosovo specific)
      'ldk', 'pdk', 'akr', 'vetëvendosje', 'coalicion', 'koalicion', 'opozitë', 'opozita',
      'albin kurti', 'vjosa osmani', 'hashim thaçi', 'ibrahim rugova',
      // Political actions
      'votim', 'zgjedhje', 'referendum', 'kandidat', 'kandidati', 'fushata', 'kampanjë',
      'amandament', 'legjislacion', 'reforma politike', 'politika e jashtme',
      // State & governance
      'shtet', 'shteti', 'shtetëror', 'qeverisje', 'qeveria',
      'marrëveshje politike', 'protokoll shtetëror', 'takim diplomatik',
      // Kosovo politics
      'kosovë', 'kosova', 'prishtinë', 'shteti i kosovës'
    ],
    patterns: [
      /(ministri|ministër|kryeministri|presidenti|parlamenti|deputet).*(kosov|shtet|qeveri)/i,
      /(ldk|pdk|akr|vetëvendosje|coalicion).*(parti|qeveri|opozit)/i,
      /(qeveri|shtet|politik).*(vendim|takim|marrëveshje)/i
    ],
    minScore: 5 // Require high confidence for politics
  },
  { 
    id: 'showbiz', 
    name: 'Show-Biz', 
    keywords: [
      // Entertainment keywords
      'showbiz', 'show biz', 'show-biz', 'entertainment', 'zbavitje',
      // Celebrities & stars
      'celebritet', 'yje', 'star', 'stars', 'superstar', 'famous', 'celebrity',
      'aktori', 'aktore', 'këngëtar', 'këngëtare', 'artist', 'artiste',
      // Music & albums
      'album', 'këngë', 'kënga', 'muzik', 'muzikë', 'premierë', 'premiere',
      'koncert', 'festival muzikor',
      // Film & TV
      'film', 'serial', 'televizion', 'tv show', 'reality show', 'talent show',
      // Social media (only in entertainment context)
      'instagram post', 'facebook post', 'tiktok video', 'youtube channel',
      // Fashion & modeling
      'fashion week', 'modë', 'model', 'supermodel', 'dizajner fashion',
      // Interviews & media
      'intervistë me', 'magazina showbiz'
    ],
    patterns: [
      /(këngëtar|aktori|celebritet|star).*(këngë|album|film|serial)/i,
      /(showbiz|show-biz|entertainment).*(yje|star|celebrity)/i,
      /(instagram|facebook|tiktok).*(post|video).*(celebrity|star|famous)/i
    ],
    minScore: 4 // Require good confidence for showbiz
  },
  { 
    id: 'sport', 
    name: 'Sport', 
    keywords: [
      // Sports names
      'futboll', 'basketboll', 'tenis', 'volejboll', 'handboll', 'atletikë',
      'gimnastikë', 'not', 'shah', 'box', 'boks', 'judo', 'karate',
      // Players & teams
      'futbollist', 'basketbollist', 'tenisti', 'lojtar', 'atlet', 'trajner', 'ekip',
      // Competitions
      'superliga', 'champions league', 'mundial', 'olimpik', 'olympic',
      'kampionat', 'championship', 'kupë', 'cup', 'ligë', 'liga',
      // Match terminology
      'ndeshje', 'match', 'fitore', 'humbje', 'barazim', 'gol', 'goal',
      'piket', 'pike', 'points', 'skor', 'score', 'rekord', 'record',
      // Sports infrastructure
      'stadium', 'arenë', 'arena',
      // Sports business
      'transfer', 'transferim', 'kontratë sportive', 'drejtor sportiv'
    ],
    patterns: [
      /(futboll|basketboll|tenis|volejboll|handboll).*(lojtar|ndeshje|ekip|trajner)/i,
      /(superliga|champions league|mundial|olimpik|kampionat)/i,
      /(ndeshje|match|gol|goal|fitore|humbje).*(sport|futboll|basketboll)/i
    ],
    minScore: 5 // Require high confidence for sport
  },
  { 
    id: 'teknologji', 
    name: 'Teknologji', 
    keywords: [
      // Tech core terms
      'teknologji', 'teknologji e re', 'inovacion teknologjik', 'tech',
      // Software & Hardware
      'softuer', 'harduer', 'software', 'hardware', 'aplikacion', 'app',
      // Devices
      'kompjuter', 'smartphone', 'telefoni inteligjent', 'tablet', 'laptop', 'pc',
      'gadget', 'device teknologjik',
      // AI & Robotics
      'ai', 'artificial intelligence', 'inteligjencë artificiale',
      'robot', 'robotik', 'automatizim', 'machine learning',
      // Programming & Development
      'programim', 'programues', 'kod', 'coding', 'developer', 'programues',
      'informatikë', 'kompjuterike',
      // Cybersecurity
      'cybersecurity', 'siguria cyber', 'hacker', 'hacking', 'virus', 'malware',
      // Blockchain & Crypto
      'blockchain', 'crypto', 'kripto', 'bitcoin', 'ethereum', 'nft',
      // Cloud & Data
      'cloud computing', 'cloud', 'data center', 'database', 'baza të dhënash',
      // Internet & Networks
      '5g', '6g', 'wi-fi', 'internet i shpejtë', 'broadband',
      // Tech Companies
      'tech company', 'kompani teknologjie', 'startup teknologjik',
      'apple', 'google', 'microsoft', 'meta', 'amazon web services',
      // Innovation
      'inovacion', 'innovation', 'teknologji e ardhshme', 'future tech'
    ],
    patterns: [
      /(teknologji|tech|software|hardware).*(kompjuter|smartphone|app|aplikacion)/i,
      /(ai|artificial intelligence|inteligjencë artificiale|robot)/i,
      /(blockchain|crypto|bitcoin|ethereum|nft)/i,
      /(apple|google|microsoft|meta|amazon).*(teknologji|tech|product)/i
    ],
    minScore: 6 // Require highest confidence for technology
  }
];

/**
 * Strict category detection with confidence scoring
 * Only categorizes news with high confidence to avoid false positives
 */
function detectCategory(item: NewsItem): string {
  const titleLower = (item.title || '').toLowerCase();
  const descriptionLower = (item.description || '').toLowerCase();
  const fullContentLower = (item.fullContent || '').toLowerCase();
  const linkLower = (item.link || '').toLowerCase();
  const categoriesLower = (item.categories || []).map(cat => 
    typeof cat === 'string' ? cat.toLowerCase() : String(cat).toLowerCase()
  ).join(' ');
  
  const allText = `${titleLower} ${descriptionLower} ${fullContentLower} ${linkLower} ${categoriesLower}`;
  
  // Scoring system: each category gets points for matches
  const scores: { [key: string]: number } = {
    politike: 0,
    showbiz: 0,
    sport: 0,
    teknologji: 0
  };
  
  // Check each category
  for (const category of CATEGORIES) {
    if (category.id === 'all') continue;
    
    const categoryId = category.id;
    const minScore = category.minScore || 3;
    
    // 1. Check keywords - prioritize title matches
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      const keywordLength = keywordLower.length;
      
      // Only match whole words or phrases (not substrings in the middle of words)
      const keywordRegex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      
      if (keywordRegex.test(titleLower)) {
        // Title matches are worth more (5 points)
        scores[categoryId] += 5;
      } else if (keywordRegex.test(descriptionLower)) {
        // Description matches (3 points)
        scores[categoryId] += 3;
      } else if (keywordRegex.test(allText)) {
        // General text matches (2 points)
        scores[categoryId] += 2;
      }
      
      // RSS categories are very reliable (4 points)
      if (categoriesLower.includes(keywordLower)) {
        scores[categoryId] += 4;
      }
    }
    
    // 2. Check regex patterns (high confidence - 8 points)
    if (category.patterns) {
      for (const pattern of category.patterns) {
        if (pattern.test(allText)) {
          scores[categoryId] += 8;
        }
      }
    }
    
    // 3. URL patterns (medium confidence - 3 points)
    if (categoryId === 'sport' && /(sport|futboll|basketboll|tenis)/i.test(linkLower)) {
      scores[categoryId] += 3;
    }
    if (categoryId === 'teknologji' && /(tech|teknologji|digital)/i.test(linkLower)) {
      scores[categoryId] += 3;
    }
    if (categoryId === 'showbiz' && /(showbiz|entertainment|celebrity)/i.test(linkLower)) {
      scores[categoryId] += 3;
    }
    if (categoryId === 'politike' && /(politik|qeveri|parti)/i.test(linkLower)) {
      scores[categoryId] += 3;
    }
  }
  
  // Find category with highest score that meets minimum threshold
  let maxScore = 0;
  let detectedCategory = 'all';
  
  for (const category of CATEGORIES) {
    if (category.id === 'all') continue;
    
    const categoryId = category.id;
    const score = scores[categoryId];
    const minScore = category.minScore || 3;
    
    // Only consider categories that meet minimum threshold
    if (score >= minScore && score > maxScore) {
      maxScore = score;
      detectedCategory = categoryId;
    }
  }
  
  // Return 'all' if no category meets the confidence threshold
  return detectedCategory;
}

/**
 * Main page component that displays news from Telegrafi RSS feed
 */
export default function Home() {
  const [news, setNews] = useState<NewsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isBenefiteAdHidden, setIsBenefiteAdHidden] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Hide/show ad (temporary, no localStorage)
  const toggleBenefiteAd = () => {
    setIsBenefiteAdHidden(!isBenefiteAdHidden);
  };

  // Fetch news from API
  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/news');
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      // Add detected categories to news items using deep analysis
      const newsWithCategories = {
        ...data,
        items: data.items.map((item: NewsItem) => ({
          ...item,
          detectedCategory: detectCategory(item)
        }))
      };
      setNews(newsWithCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch news on component mount
  useEffect(() => {
    fetchNews();
  }, []);

  // Format date to readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      // Show relative time for recent articles
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return minutes <= 1 ? 'Tani' : `${minutes} minuta më parë`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? 'orë' : 'orë'} më parë`;
      } else {
        return date.toLocaleDateString('sq-AL', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      return dateString;
    }
  };

  return (
    <main className="main-container">
      <ThemeToggle />
      
      {/* Partners Section - Top Right */}
      <div className={`partners-section ${isBenefiteAdHidden ? 'partners-hidden' : ''}`}>
        {!isBenefiteAdHidden && (
          <>
            <button 
              className="partners-close-button"
              onClick={toggleBenefiteAd}
              aria-label="Fshih partnerët"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="partners-content">
              <h4 className="partners-title">Partneret:</h4>
              <a 
                href="https://benefite.net" 
                target="_blank" 
                rel="noopener noreferrer"
                className="partner-item"
              >
                <img 
                  src="/benefite-logo3.svg" 
                  alt="Benefite Logo" 
                  className="partner-logo"
                />
                <span className="partner-name">Benefite</span>
              </a>
            </div>
          </>
        )}
        {isBenefiteAdHidden && (
          <button 
            className="partners-show-button"
            onClick={toggleBenefiteAd}
            aria-label="Shfaq partnerët"
            title="Shfaq partnerët"
          >
            <span>Partneret</span>
          </button>
        )}
      </div>
      
      {/* Modern Header with Logo */}
      <header className="header">
        <div className="header-background"></div>
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo-title">LajmeAI</h1>
            <p className="logo-subtitle">Inteligjencë Artificiale për Lajme</p>
          </div>
          <div className="header-right">
            <p className="intro-text">
              LajmeAI i mbledh lajmet nga të gjitha portalet dhe i modifikon me Inteligjencë Artificiale për t'i paraqitur në mënyrë neutrale, pa asnjë ndikim politik, komercial apo të çfarëdo lloji tjetër.
            </p>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Categories Filter - Futuristic Design */}
        <div className="categories-filter">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`category-button-futuristic ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-button-glow"></span>
              <span className="category-button-text">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <button
            className="refresh-button"
            onClick={() => fetchNews(true)}
            disabled={refreshing || loading}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={refreshing ? 'spinning' : ''}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            {refreshing ? 'Duke rifreskuar...' : 'Rifresko'}
          </button>
        </div>

        {/* Loading state with animation */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Duke ngarkuar lajmet...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p className="error-message">Gabim: {error}</p>
            <button className="error-button" onClick={() => fetchNews()}>
              Provo Përsëri
            </button>
          </div>
        )}

        {/* News grid with modern cards */}
        {!loading && !error && news && (
          <div className="news-grid">
            {news.items
              .filter((item) => selectedCategory === 'all' || item.detectedCategory === selectedCategory)
              .map((item, index) => (
              <article
                key={item.guid}
                className="news-card"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => {
                  window.location.href = `/article/${encodeURIComponent(item.guid)}`;
                }}
              >
                {/* Image with overlay gradient */}
                {item.imageUrl && (
                  <div className="news-card-image-wrapper">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="news-card-image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="image-overlay"></div>
                  </div>
                )}

                {/* Card content */}
                <div className="news-card-content">
                  {/* Categories */}
                  {item.categories.length > 0 && (
                    <div className="news-card-categories">
                      {item.categories.slice(0, 2).map((category, idx) => (
                        <span key={idx} className="category-tag">
                          {category}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="news-card-title">{item.title}</h2>

                  {/* Description */}
                  <p className="news-card-description">{item.description}</p>

                  {/* Footer with meta info */}
                  <div className="news-card-footer">
                    <div className="news-card-date">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formatDate(item.pubDate)}</span>
                    </div>
                    <div className="news-card-source">
                      <span className="source-badge">{item.source}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="news-card-actions">
                    <button
                      className="read-more-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/article/${encodeURIComponent(item.guid)}`;
                      }}
                    >
                      Lexo më shumë
                    </button>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="visit-link-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Referenca →
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && news && news.items.length === 0 && (
          <div className="empty-state">
            <p>Nuk u gjetën lajme.</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="site-footer">
        <p>© 2026 LajmeAI. Të gjitha të drejtat e rezervuara.</p>
      </footer>
    </main>
  );
}
