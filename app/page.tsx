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
}

interface NewsFeed {
  title: string;
  link: string;
  description: string;
  items: NewsItem[];
}

/**
 * Main page component that displays news from Telegrafi RSS feed
 */
export default function Home() {
  const [news, setNews] = useState<NewsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      setNews(data);
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
      {/* Modern Header with Logo */}
      <header className="header">
        <div className="header-background"></div>
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo-title">Lajme-AI</h1>
            <p className="logo-subtitle">Inteligjencë Artificiale për Lajme</p>
          </div>
          <div className="header-right">
            <p className="intro-text">
              Lajme-AI përdor inteligjencë artificiale për të mbledhur lajmet nga të gjitha portalet dhe për t'ju prezantuar ato në mënyrë të qartë, të balancuar dhe plotësisht neutrale, pa asnjë ndikim politik, komercial apo të çfarëdo lloji tjetër.
            </p>
          </div>
        </div>
      </header>

      <div className="container">
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
            {news.items.map((item, index) => (
              <article
                key={item.guid}
                className="news-card"
                style={{ animationDelay: `${index * 0.05}s` }}
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
        <p>© 2026 Lajme-AI. Të gjitha të drejtat e rezervuara.</p>
      </footer>
    </main>
  );
}
