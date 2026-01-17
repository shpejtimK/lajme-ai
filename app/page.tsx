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

// Category definitions with comprehensive keywords and patterns
const CATEGORIES = [
  { id: 'all', name: 'Të gjitha', keywords: [] },
  { 
    id: 'politike', 
    name: 'Politikë', 
    keywords: [
      'qeveri', 'parti', 'ministër', 'kryeministër', 'president', 'parlament', 'zyrtar', 'politik', 
      'votim', 'zgjedhje', 'deputet', 'albin kurti', 'vetëvendosje', 'ldk', 'pdk', 'akr', 
      'coalicion', 'koalicion', 'opozitë', 'opozita', 'qeverisje', 'shtet', 'shteti', 'shtetëror',
      'zyrtarë', 'politikan', 'politikës', 'kryeministri', 'ministri', 'presidenti', 'parlamenti',
      'asambelë', 'asambleja', 'kabinetti', 'kabinet', 'qeveria', 'ministria', 'ministri',
      'marrëveshje', 'protokoll', 'takim', 'bisedim', 'diskutim politik', 'politika',
      'reforma', 'legjislacion', 'ligj', 'ligje', 'vendim', 'vendime', 'dekret', 'urdhër',
      'amandament', 'referendum', 'kandidat', 'kandidati', 'fushata', 'kampanjë'
    ],
    patterns: [
      /(ministri|ministër|kryeministri|presidenti|parlamenti|deputet)/i,
      /(ldk|pdk|akr|vetëvendosje|coalicion)/i,
      /(qeveri|shtet|politik)/i
    ]
  },
  { 
    id: 'showbiz', 
    name: 'Show-Biz', 
    keywords: [
      'showbiz', 'show biz', 'show-biz', 'entertainment', 'zbavitje', 'fam', 'celebritet', 
      'yje', 'aktori', 'aktore', 'këngëtar', 'këngëtare', 'instagram', 'social media', 
      'postim', 'post në', 'facebook post', 'facebook postim', 'tiktok', 'youtube',
      'influencer', 'bloger', 'blogu', 'stars', 'star', 'muzik', 'muzikë', 'album',
      'këngë', 'kënga', 'premierë', 'premiere', 'film', 'serial', 'televizion', 'tv show',
      'program', 'reality show', 'talent show', 'festival', 'koncert', 'event',
      'foto', 'fotograf', 'fashion week', 'modë', 'model', 'dizajner', 'dizajn',
      'magazina', 'intervistë', 'celebrity', 'famous', 'star', 'superstar'
    ],
    patterns: [
      /(instagram|facebook|tiktok|youtube|social media)/i,
      /(showbiz|show-biz|entertainment)/i,
      /(këngëtar|aktori|celebritet|star)/i
    ]
  },
  { 
    id: 'sport', 
    name: 'Sport', 
    keywords: [
      'sport', 'futboll', 'basketboll', 'tenis', 'lojtar', 'ndeshje', 'trajner', 'ekip', 
      'superliga', 'champions league', 'mundial', 'olimpik', 'atletikë', 'volejboll', 
      'handboll', 'futbollist', 'basketbollist', 'tenisti', 'atlet', 'gimnastikë',
      'not', 'notimi', 'notues', 'shah', 'shahist', 'box', 'boks', 'boksier',
      'judokan', 'judo', 'karate', 'kung fu', 'taekwondo', 'peshëngritje', 'peshëngritës',
      'stadium', 'arenë', 'arena', 'kampionat', 'championship', 'kupë', 'cup',
      'ligë', 'liga', 'ndeshje', 'match', 'fitore', 'humbje', 'barazim', 'draw',
      'gol', 'goal', 'piket', 'pike', 'points', 'skor', 'score', 'trajner', 'coach',
      'drejtor sportiv', 'transfer', 'transferim', 'kontratë', 'kontrata',
      'kampion', 'champion', 'rekord', 'record', 'olimpik', 'olympic'
    ],
    patterns: [
      /(futboll|basketboll|tenis|volejboll|handboll|sport)/i,
      /(superliga|champions league|mundial|olimpik)/i,
      /(lojtar|trajner|ekip|ndeshje)/i
    ]
  },
  { 
    id: 'teknologji', 
    name: 'Teknologji', 
    keywords: [
      'teknologji', 'digital', 'internet', 'aplikacion', 'softuer', 'harduer', 
      'kompjuter', 'telefoni', 'smartphone', 'ai', 'artificial intelligence', 
      'cyber', 'teknologji', 'robot', 'robotik', 'automatizim', 'automatik',
      'informatikë', 'programim', 'programues', 'kod', 'software', 'hardware',
      'app', 'aplikacion', 'mobil', 'tablet', 'laptop', 'pc', 'server',
      'cloud', 'cloud computing', 'data', 'database', 'baza të dhënash',
      'cybersecurity', 'siguria cyber', 'hacker', 'hacking', 'virus', 'malware',
      'blockchain', 'crypto', 'kripto', 'bitcoin', 'ethereum', 'nft',
      'startup', 'tech company', 'kompani teknologjie', 'innovation', 'inovacion',
      'gadget', 'device', 'teknologji e re', 'teknologji e ardhshme', 'future tech',
      '5g', '6g', 'internet i shpejtë', 'wi-fi', 'bluetooth', 'usb', 'cable',
      'screen', 'ekran', 'display', 'monitor', 'keyboard', 'mouse', 'mouse pad'
    ],
    patterns: [
      /(teknologji|digital|internet|cyber|ai|artificial intelligence)/i,
      /(kompjuter|smartphone|software|hardware|app)/i,
      /(robot|blockchain|crypto|startup|innovation)/i
    ]
  }
];

/**
 * Deep category detection with scoring system
 * Checks title, description, content, categories, and URL patterns
 */
function detectCategory(item: NewsItem): string {
  const searchText = `${item.title} ${item.description} ${item.fullContent}`.toLowerCase();
  const linkLower = (item.link || '').toLowerCase();
  const categoriesLower = (item.categories || []).map(cat => 
    typeof cat === 'string' ? cat.toLowerCase() : String(cat).toLowerCase()
  ).join(' ');
  
  const allText = `${searchText} ${linkLower} ${categoriesLower}`.toLowerCase();
  
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
    
    // 1. Check keywords in all text (weight: 2 points)
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (allText.includes(keywordLower)) {
        scores[categoryId] += 2;
        
        // Bonus points if keyword is in title (weight: 3 points)
        if (item.title.toLowerCase().includes(keywordLower)) {
          scores[categoryId] += 3;
        }
        
        // Bonus if keyword is in RSS categories (weight: 4 points)
        if (categoriesLower.includes(keywordLower)) {
          scores[categoryId] += 4;
        }
      }
    }
    
    // 2. Check regex patterns (weight: 5 points)
    if (category.patterns) {
      for (const pattern of category.patterns) {
        if (pattern.test(allText)) {
          scores[categoryId] += 5;
        }
      }
    }
    
    // 3. Check URL patterns for specific categories
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
  
  // Find category with highest score
  let maxScore = 0;
  let detectedCategory = 'all';
  
  for (const [categoryId, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = categoryId;
    }
  }
  
  // Only return a category if it has a meaningful score (at least 2 points)
  return maxScore >= 2 ? detectedCategory : 'all';
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
