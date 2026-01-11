import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

// Create a new RSS parser instance
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['dc:creator', 'creator'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

// RSS feed URLs
const RSS_FEEDS = [
  'https://telegrafi.com/feeds/feed.rss',
  'https://insajderi.org/feed/',
];

/**
 * Helper function to fetch and parse a single RSS feed
 */
async function fetchFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);
    return feed;
  } catch (error) {
    console.error(`Error fetching feed from ${url}:`, error);
    return null;
  }
}


// Categories to exclude (non-news categories)
const excludedCategories = [
  'sport', 'sports', 'futboll', 'basketboll', 'tenis', 'tennis', 'futbol',
  'art', 'arte', 'kulturë', 'kulture', 'kulturi', 'culture', 'kultura',
  'showbiz', 'show biz', 'show-biz', 'entertainment', 'zbavitje',
  'horoskop', 'horoscope', 'astro', 'astrologji', 'astrology',
  'lifestyle', 'jetë', 'jetes', 'mode', 'fashion',
  'auto', 'automotive', 'makina', 'car', 'cars',
  'gastronomi', 'gastronomy', 'ushqim', 'food', 'receta', 'recipe',
  'magazine', 'revistë', 'revista',
];

/**
 * Helper function to check if item should be excluded based on categories
 */
function isExcludedCategory(item: any): boolean {
  const categories = item.categories || [];
  
  // If no categories, include it (assume it's news)
  if (categories.length === 0) {
    return false;
  }
  
  // Check if any category matches excluded categories
  for (const category of categories) {
    // Normalize category to string (RSS parser sometimes returns objects)
    let categoryStr = '';
    if (typeof category === 'string') {
      categoryStr = category;
    } else if (category && typeof category === 'object') {
      // Handle RSS parser objects with _ (text) or $ (attributes)
      categoryStr = category._ || category['#text'] || (category.$ && category.$.term) || String(category);
    } else {
      categoryStr = String(category);
    }
    
    const normalizedCategory = categoryStr.toLowerCase().trim();
    
    // Check against excluded categories (case-insensitive partial match)
    for (const excluded of excludedCategories) {
      if (normalizedCategory === excluded || 
          normalizedCategory.includes(excluded) || 
          excluded.includes(normalizedCategory)) {
        return true; // Exclude this item
      }
    }
  }
  
  // If no excluded categories found, include it
  return false;
}

/**
 * API route handler to fetch and parse RSS feeds from multiple sources
 * GET /api/news
 */
export async function GET() {
  try {
    // Fetch and parse all RSS feeds in parallel
    const feedPromises = RSS_FEEDS.map(url => fetchFeed(url));
    const feeds = await Promise.all(feedPromises);
    
    // Filter out any failed feeds
    const validFeeds = feeds.filter(feed => feed !== null);
    
    if (validFeeds.length === 0) {
      throw new Error('No feeds could be fetched');
    }

    // Combine all items from all feeds with source tracking
    const allItems: any[] = [];
    feeds.forEach((feed, index) => {
      if (feed && feed.items) {
        const feedUrl = RSS_FEEDS[index];
        // Determine source name from URL
        let sourceName = 'Unknown';
        if (feedUrl.includes('telegrafi.com')) {
          sourceName = 'Telegrafi';
        } else if (feedUrl.includes('insajderi.org')) {
          sourceName = 'Insajderi';
        }
        
        // Add source to each item
        feed.items.forEach((item: any) => {
          allItems.push({
            ...item,
            _source: sourceName
          });
        });
      }
    });
    
    // Filter out non-news categories only (no duplicate detection)
    const filteredItems = allItems.filter((item) => {
        // Filter out non-news categories
        if (isExcludedCategory(item)) {
          return false;
        }
        
        return true;
      });

    // Process items (with async support for Gazeta Express image fetching)
    const newsItems = await Promise.all(
      filteredItems.map(async (item) => {
      // Extract image URL from multiple possible sources
      // Check all sources and use the first valid image found
      let imageUrl = null;
      
      // Helper function to extract image from HTML string
      // Preserves the exact URL as it appears in the HTML
      const extractImageFromHTML = (html: string): string | null => {
        if (!html) return null;
        
        // Try various patterns to extract the exact URL
        const patterns = [
          /<img[^>]+src=["']([^"']+)["']/i,  // src="url" or src='url'
          /<img[^>]+src=([^\s>]+)/i,         // src=url (no quotes)
        ];
        
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            const url = match[1] || match[2];
            if (url) {
              // Return the URL exactly as extracted, no modifications yet
              return url;
            }
          }
        }
        return null;
      };
      
      // Extract image URL from RSS feed sources
      if (!imageUrl) {
        // Method 1: Try description field first
        if (item.description) {
          imageUrl = extractImageFromHTML(item.description);
        }
        
        // Method 2: Try media:content (most reliable for RSS feeds)
        if (!imageUrl && item.mediaContent && item.mediaContent[0]?.$.url) {
          imageUrl = item.mediaContent[0].$.url;
        }
        
        // Method 3: Try enclosure (common RSS field for media)
        if (!imageUrl && item.enclosure && item.enclosure.url) {
          // Check if it's an image type
          if (item.enclosure.type?.startsWith('image/')) {
            imageUrl = item.enclosure.url;
          }
        }
        
        // Method 4: Try media:thumbnail
        if (!imageUrl && (item as any)['media:thumbnail']) {
          const thumbnail = (item as any)['media:thumbnail'];
          if (thumbnail.$ && thumbnail.$.url) {
            imageUrl = thumbnail.$.url;
          } else if (typeof thumbnail === 'string') {
            imageUrl = thumbnail;
          }
        }
        
        // Method 5: Extract from content HTML (supports various img tag formats)
        if (!imageUrl && item.content) {
          imageUrl = extractImageFromHTML(item.content);
        }
        
        // Method 6: Try content:encoded (some feeds use this)
        if (!imageUrl && (item as any).contentEncoded) {
          imageUrl = extractImageFromHTML((item as any).contentEncoded);
        }
        // Also try the raw field name
        if (!imageUrl && (item as any)['content:encoded']) {
          imageUrl = extractImageFromHTML((item as any)['content:encoded']);
        }
        
        // Method 7: Fallback to contentSnippet
        if (!imageUrl && item.contentSnippet) {
          imageUrl = extractImageFromHTML(item.contentSnippet);
        }
      }
      
      // Clean up image URL
      if (imageUrl) {
        // Trim whitespace
        imageUrl = imageUrl.trim();
        
        // Decode HTML entities (necessary for URLs extracted from HTML)
        imageUrl = imageUrl.replace(/&amp;/g, '&');
        imageUrl = imageUrl.replace(/&quot;/g, '"');
        imageUrl = imageUrl.replace(/&#39;/g, "'");
        imageUrl = imageUrl.replace(/&lt;/g, '<');
        imageUrl = imageUrl.replace(/&gt;/g, '>');
      }

      // Get full content - preserve HTML for full article display
      // Prefer content (full HTML) over contentSnippet
      let fullContent = item.content || item.contentSnippet || item.description || '';
      
      // Clean description for preview (first 300 chars)
      let description = fullContent;
      // Remove HTML tags for preview
      description = description.replace(/<[^>]*>/g, '').trim();
      // Remove extra whitespace and newlines
      description = description.replace(/\s+/g, ' ').trim();
      // Limit preview description length
      if (description.length > 300) {
        description = description.substring(0, 300) + '...';
      }

      // For Gazeta Express images, use the proxy to bypass hotlinking protection
      let finalImageUrl = imageUrl;
      if (imageUrl && imageUrl.includes('gazetaexpress.com')) {
        // Include the article link as referer for better compatibility
        const refererParam = item.link ? `&referer=${encodeURIComponent(item.link)}` : '';
        finalImageUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}${refererParam}`;
      }

      // Normalize categories to strings (RSS parser sometimes returns objects)
      // Helper function to extract string from category object
      const extractCategoryString = (cat: any): string => {
        if (typeof cat === 'string') {
          return cat;
        }
        if (!cat || typeof cat !== 'object') {
          return '';
        }
        // Try various properties that RSS parsers use
        if (cat._ !== undefined) {
          if (typeof cat._ === 'string') {
            return cat._;
          }
          if (typeof cat._ === 'object' && cat._._ && typeof cat._._ === 'string') {
            return cat._._;
          }
        }
        if (cat['#text'] && typeof cat['#text'] === 'string') {
          return cat['#text'];
        }
        if (cat.$ && cat.$ && typeof cat.$ === 'object') {
          if (cat.$.term && typeof cat.$.term === 'string') {
            return cat.$.term;
          }
        }
        // Last resort: return empty string to filter out
        return '';
      };
      
      const normalizedCategories = (item.categories || [])
        .map(extractCategoryString)
        .filter((cat: string) => cat && typeof cat === 'string' && cat.trim().length > 0);

      // Helper function to normalize field values to strings
      const normalizeField = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        if (value && typeof value === 'object') {
          // Handle RSS parser objects with _ (text) or $ (attributes)
          // Try various properties that RSS parsers use
          if (value._ && typeof value._ === 'string') {
            return value._;
          }
          if (value['#text'] && typeof value['#text'] === 'string') {
            return value['#text'];
          }
          if (value.$ && value.$.term && typeof value.$.term === 'string') {
            return value.$.term;
          }
          // If _ exists but is an object, try to stringify it
          if (value._) {
            return String(value._);
          }
          // Last resort: convert to string
          return String(value);
        }
        return String(value || '');
      };

      return {
        title: normalizeField(item.title) || 'No title',
        link: normalizeField(item.link) || '',
        description: description,
        fullContent: fullContent, // Full article content with HTML
        pubDate: normalizeField(item.pubDate) || '',
        creator: normalizeField(item.creator) || 'Unknown',
        categories: normalizedCategories,
        imageUrl: finalImageUrl,
        guid: normalizeField(item.guid) || normalizeField(item.link) || '',
        source: item._source || 'Unknown', // Source portal name
      };
      })
    );

    // Sort items by publication date (newest first)
    newsItems.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      title: 'Lajme-AI - News Aggregator',
      link: '',
      description: 'News from multiple sources',
      items: newsItems,
    });
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news feed' },
      { status: 500 }
    );
  }
}

