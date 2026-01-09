'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';

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

/**
 * Full article page component
 */
export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        // Fetch all news and find the article by guid
        const response = await fetch('/api/news');
        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }
        const data = await response.json();
        const foundArticle = data.items.find(
          (item: NewsItem) => item.guid === params.id || encodeURIComponent(item.guid) === params.id
        );
        
        if (foundArticle) {
          setArticle(foundArticle);
        } else {
          setError('Artikulli nuk u gjet');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gabim në ngarkimin e artikullit');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArticle();
    }
  }, [params.id]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('sq-AL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <main className="main-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Duke ngarkuar artikullin...</p>
        </div>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="main-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error || 'Artikulli nuk u gjet'}</p>
          <button className="error-button" onClick={() => router.push('/')}>
            Kthehu në faqen kryesore
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-container">
      <ThemeToggle />
      <header className="header article-header">
        <div className="header-background"></div>
        <div className="header-content">
          <div className="logo-text">
            <h1 className="logo-title">Lajme-AI</h1>
          </div>
        </div>
      </header>

      <div className="container">
        <button
          className="back-button"
          onClick={() => router.push('/')}
        >
          ← Kthehu
        </button>

        <article className="article-page">
          {/* Categories */}
          {article.categories.length > 0 && (
            <div className="article-categories">
              {article.categories.map((category, idx) => (
                <span key={idx} className="category-tag">
                  {category}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="article-title">{article.title}</h1>

          {/* Meta info */}
          <div className="article-meta">
            <div className="article-date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{formatDate(article.pubDate)}</span>
            </div>
          </div>

          {/* Full Content */}
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.fullContent }}
          />

          {/* Action buttons */}
          <div className="article-actions">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-link"
            >
              Referenca →
            </a>
          </div>
        </article>
      </div>
      
      {/* Footer */}
      <footer className="site-footer">
        <p>© 2026 Lajme-AI. Të gjitha të drejtat e rezervuara.</p>
      </footer>
    </main>
  );
}

