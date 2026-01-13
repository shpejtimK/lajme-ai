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
  'https://www.botasot.info/rss/lajme',
  'https://zeri.info/rss',
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
 * Helper function to check if item contains social media posts (Instagram/Facebook)
 */
function containsSocialMediaPost(item: any): boolean {
  // Check title
  const title = (item.title || '').toLowerCase();
  if (title.includes('instagram') || title.includes('facebook') || 
      title.includes('post në instagram') || title.includes('post në facebook') ||
      title.includes('postim në instagram') || title.includes('postim në facebook')) {
    return true;
  }
  
  // Check description/content
  const description = (item.description || '').toLowerCase();
  const content = (item.content || item.contentSnippet || '').toLowerCase();
  const contentEncoded = ((item as any).contentEncoded || (item as any)['content:encoded'] || '').toLowerCase();
  const allContent = (description + ' ' + content + ' ' + contentEncoded).toLowerCase();
  
  // Check for Instagram/Facebook links or embeds
  if (allContent.includes('instagram.com') || 
      allContent.includes('facebook.com') ||
      allContent.includes('fb.com') ||
      allContent.includes('instagr.am') ||
      allContent.includes('embed instagram') ||
      allContent.includes('embed facebook') ||
      allContent.includes('iframe.*instagram') ||
      allContent.includes('iframe.*facebook') ||
      allContent.includes('post në instagram') ||
      allContent.includes('post në facebook') ||
      allContent.includes('postim në instagram') ||
      allContent.includes('postim në facebook')) {
    return true;
  }
  
  // Check link
  const link = (item.link || '').toLowerCase();
  if (link.includes('instagram.com') || link.includes('facebook.com') || link.includes('fb.com')) {
    return true;
  }
  
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
      const feedUrl = RSS_FEEDS[index];
      if (feed && feed.items) {
        // Determine source name from URL
        let sourceName = 'Unknown';
        if (feedUrl.includes('telegrafi.com')) {
          sourceName = 'Telegrafi';
        } else if (feedUrl.includes('insajderi.org')) {
          sourceName = 'Insajderi';
        } else if (feedUrl.includes('dukagjini.com')) {
          sourceName = 'Dukagjini';
        } else if (feedUrl.includes('gazetaexpress.com')) {
          sourceName = 'Gazeta Express';
        } else if (feedUrl.includes('botasot.info')) {
          sourceName = 'Bota Sot';
        } else if (feedUrl.includes('kallxo.com')) {
          sourceName = 'Kallxo';
        } else if (feedUrl.includes('zeri.info')) {
          sourceName = 'Zeri';
        } 
        
        // Log feed info for debugging
        console.log(`Feed ${sourceName}: ${feed.items.length} items found`);
        
        // Add source to each item
        feed.items.forEach((item: any) => {
          allItems.push({
            ...item,
            _source: sourceName
          });
        });
      } else {
        // Log if feed failed or has no items
        console.log(`Feed ${feedUrl}: ${feed ? 'no items' : 'failed to fetch'}`);
      }
    });
    
    // Filter out non-news categories and social media posts
    const filteredItems = allItems.filter((item) => {
        // Filter out non-news categories
        if (isExcludedCategory(item)) {
          if (item._source === 'Kallxo') {
            console.log(`Kallxo item filtered by category: ${item.title}`);
          }
          return false;
        }
        
        // Filter out social media posts (Instagram/Facebook)
        if (containsSocialMediaPost(item)) {
          if (item._source === 'Kallxo') {
            console.log(`Kallxo item filtered by social media: ${item.title}`);
          }
          return false;
        }
        
        return true;
      });
    
    // Log filtered counts by source
    const sourceCounts: { [key: string]: number } = {};
    filteredItems.forEach((item) => {
      const source = item._source || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    console.log('Items after filtering by source:', sourceCounts);

    // Process items (with async support for Gazeta Express image fetching)
    const newsItems = await Promise.all(
      filteredItems.map(async (item) => {
      // Extract image URL from multiple possible sources
      // Check all sources and use the first valid image found
      let imageUrl = null;
     

// ← Your original extraction methods continue here (mediaContent, enclosure, etc.)
// They will only run if imageUrl is still null (for other sources)
if (!imageUrl) {
  if (item.mediaContent && item.mediaContent[0]?.$.url) {
    imageUrl = item.mediaContent[0].$.url;
  }
  // ... rest of your if (!imageUrl) blocks for enclosure, thumbnail, etc.
} 
      // Helper function to extract image from HTML string
      // Preserves the exact URL as it appears in the HTML
      const extractImageFromHTML = (html: string): string | null => {
        if (!html || typeof html !== 'string') return null;
        
        // Try various patterns to extract the exact URL
        // Order matters - try more specific patterns first
        const patterns = [
          /<img[^>]+src\s*=\s*["']([^"']+)["']/i,  // src="url" or src='url' with flexible spacing
          /<img[^>]+src\s*=\s*([^\s>]+)/i,         // src=url (no quotes) with flexible spacing
          /<img[^>]+src=["']([^"']+)["']/i,        // src="url" or src='url'
          /<img[^>]+src=([^\s>]+)/i,               // src=url (no quotes)
          /src\s*=\s*["']([^"']+)["']/i,           // Just src="url" anywhere
          /src\s*=\s*([^\s>]+)/i,                  // Just src=url anywhere
        ];
        
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            const url = match[1] || match[2];
            if (url && url.trim()) {
              // Clean up the URL (remove any trailing characters that shouldn't be there)
              let cleanUrl = url.trim().replace(/[<>"']+$/, '');
              // Decode HTML entities if present
              cleanUrl = cleanUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
              // Return the URL exactly as extracted
              return cleanUrl;
            }
          }
        }
        return null;
      };
      
        // Extract image URL from RSS feed sources
      if (!imageUrl) {
        // For Gazeta Express, collect all possible image URLs and prioritize ones with resolution in filename
        const isGazetaExpress = item._source === 'Gazeta Express';
        let candidateUrls: string[] = [];
        
        // Method 1: Try media:content (most reliable for RSS feeds)
        if (item.mediaContent) {
          if (Array.isArray(item.mediaContent)) {
            // Collect all media:content URLs
            item.mediaContent.forEach((media: any) => {
              if (media?.$?.url) {
                candidateUrls.push(media.$.url);
              }
            });
          } else if (item.mediaContent[0]?.$.url) {
            candidateUrls.push(item.mediaContent[0].$.url);
          }
        }
        
        // Method 2: Try enclosure (common RSS field for media)
        // Handle both object format and array format
        if (item.enclosure) {
          // Check if enclosure is an array (some RSS parsers return arrays)
          if (Array.isArray(item.enclosure) && item.enclosure.length > 0) {
            item.enclosure.forEach((enc: any) => {
              if (enc.url && enc.type && enc.type.startsWith('image/')) {
                candidateUrls.push(enc.url);
              }
            });
          } else if (item.enclosure.url) {
            // Standard object format
            if (item.enclosure.type && item.enclosure.type.startsWith('image/')) {
              candidateUrls.push(item.enclosure.url);
            }
          }
        }
        
        // Method 3: Try media:thumbnail
        if ((item as any)['media:thumbnail']) {
          const thumbnail = (item as any)['media:thumbnail'];
          if (thumbnail.$ && thumbnail.$.url) {
            candidateUrls.push(thumbnail.$.url);
          } else if (typeof thumbnail === 'string') {
            candidateUrls.push(thumbnail);
          }
        }
        
        // For Gazeta Express, prioritize URLs with resolution in filename (e.g., -800x600, _1200x800)
        if (isGazetaExpress && candidateUrls.length > 0) {
          // Pattern to match resolution in filename: -800x600, _1200x800, etc.
          const resolutionPattern = /[-_]\d+x\d+/i;
          
          // Find URLs with resolution in filename
          const urlsWithResolution = candidateUrls.filter(url => resolutionPattern.test(url));
          
          if (urlsWithResolution.length > 0) {
            // Use the first URL with resolution
            imageUrl = urlsWithResolution[0];
          } else {
            // Fallback to first candidate if none have resolution
            imageUrl = candidateUrls[0];
          }
        } else if (candidateUrls.length > 0) {
          // For other sources, use first candidate
          imageUrl = candidateUrls[0];
        }
        
        // Method 4: Try content:encoded (WordPress feeds like Dukagjini use this for full content with images)
        // Normalize contentEncoded to string first (RSS parser may return objects or arrays)
        if (!imageUrl) {
          let contentEncodedStr = null;
          
          // Helper to extract string from various formats
          const extractString = (value: any): string | null => {
            if (!value) return null;
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) {
              // If it's an array, take the first element
              return extractString(value[0]);
            }
            if (typeof value === 'object') {
              // Try common RSS parser object formats
              return value._ || value['#text'] || value.$?.text || String(value);
            }
            return String(value);
          };
          
          if ((item as any).contentEncoded) {
            contentEncodedStr = extractString((item as any).contentEncoded);
          } else if ((item as any)['content:encoded']) {
            contentEncodedStr = extractString((item as any)['content:encoded']);
          }
          
          if (contentEncodedStr && typeof contentEncodedStr === 'string' && contentEncodedStr.length > 0) {
            // For Dukagjini, try to extract image from content:encoded
            imageUrl = extractImageFromHTML(contentEncodedStr);
          }
        }
        
        // Method 5: Extract from content HTML (supports various img tag formats)
        if (!imageUrl && item.content) {
          imageUrl = extractImageFromHTML(item.content);
        }
        
        // Method 6: Try description field
        if (!imageUrl && item.description) {
          imageUrl = extractImageFromHTML(item.description);
        }
        
        // Method 7: Fallback to contentSnippet
        if (!imageUrl && item.contentSnippet) {
          imageUrl = extractImageFromHTML(item.contentSnippet);
        }
        
        // Method 8: As a last resort, try extracting from fullContent (already normalized)
        // This is especially useful for Dukagjini where content:encoded contains the full HTML
        if (!imageUrl) {
          // Get full content - same logic as below but just for image extraction
          let fullContentForImage = (item as any).contentEncoded || 
                                    (item as any)['content:encoded'] || 
                                    item.content || 
                                    item.contentSnippet || 
                                    item.description || 
                                    '';
          
          // Normalize if it's an object
          if (fullContentForImage && typeof fullContentForImage !== 'string') {
            if (Array.isArray(fullContentForImage)) {
              fullContentForImage = fullContentForImage[0];
            }
            if (typeof fullContentForImage === 'object') {
              fullContentForImage = fullContentForImage._ || fullContentForImage['#text'] || String(fullContentForImage);
            } else {
              fullContentForImage = String(fullContentForImage);
            }
          }
          
          if (fullContentForImage && typeof fullContentForImage === 'string') {
            imageUrl = extractImageFromHTML(fullContentForImage);
          }
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
      // Prefer content:encoded (used by Dukagjini and other WordPress feeds) over other fields
      let fullContent = (item as any).contentEncoded || 
                        (item as any)['content:encoded'] || 
                        item.content || 
                        item.contentSnippet || 
                        item.description || 
                        '';
      
      // Remove any sentence starting with "The post" - simple universal approach
      // This pattern appears in RSS feeds (WordPress theme adds it)
      if (fullContent) {
        // Remove entire sentences/paragraphs that start with "The post"
        // Pattern: "The post" followed by anything until end of sentence (period, exclamation, question mark) or end of tag
        fullContent = fullContent.replace(/The\s+post[\s\S]+?[.!?]\s*/gi, '');
        fullContent = fullContent.replace(/The\s+post[\s\S]+?<\/p>/gi, '');
        fullContent = fullContent.replace(/The\s+post[\s\S]+?<\/div>/gi, '');
        // Remove if wrapped in HTML tags
        fullContent = fullContent.replace(/<[^>]*>[\s\S]*?The\s+post[\s\S]+?[.!?][\s\S]*?<\/[^>]*>/gi, '');
        fullContent = fullContent.replace(/<p[^>]*>[\s\S]*?The\s+post[\s\S]+?<\/p>/gi, '');
        fullContent = fullContent.replace(/<div[^>]*>[\s\S]*?The\s+post[\s\S]+?<\/div>/gi, '');
      }
      
      // For Bota Sot, decode HTML entities and fetch full article if description is truncated
      if (item._source === 'Bota Sot') {
        // Decode HTML entities in the description
        if (fullContent) {
          fullContent = fullContent
            .replace(/&euml;/g, 'ë')
            .replace(/&ccedil;/g, 'ç')
            .replace(/&uuml;/g, 'ü')
            .replace(/&nbsp;/g, ' ')
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–');
        }
        
        // Try to fetch full article content if description is truncated
        if (item.link && (!fullContent || fullContent.length < 500 || fullContent.includes('......'))) {
          try {
            const articleResponse = await fetch(item.link, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.botasot.info/',
              },
            });
            
            if (articleResponse.ok) {
              const html = await articleResponse.text();
              
              // More comprehensive patterns to find article content
              // Try multiple strategies with non-greedy matching
              const patterns = [
                // Bota Sot specific patterns
                /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                // Generic patterns
                /<article[^>]*>([\s\S]*?)<\/article>/i,
                /<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*id="article"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*id="post"[^>]*>([\s\S]*?)<\/div>/i,
                // Try to find main content by looking for paragraphs
                /<main[^>]*>([\s\S]*?)<\/main>/i,
              ];
              
              let bestMatch = null;
              let bestLength = 0;
              
              for (const pattern of patterns) {
                // Find all matches using exec in a loop
                const regex = new RegExp(pattern.source, 'gi');
                let match;
                while ((match = regex.exec(html)) !== null) {
                  if (match && match[1]) {
                    const content = match[1];
                    // Check if this looks like article content (has multiple paragraphs)
                    const paragraphCount = (content.match(/<p[^>]*>/gi) || []).length;
                    if (content.length > bestLength && paragraphCount >= 2) {
                      bestMatch = content;
                      bestLength = content.length;
                    }
                  }
                }
              }
              
              // If we found a good match, use it
              if (bestMatch && bestLength > 500) {
                let extracted = bestMatch;
                // Clean up - remove scripts, styles, ads, navigation, etc.
                extracted = extracted.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                extracted = extracted.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                extracted = extracted.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
                extracted = extracted.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
                extracted = extracted.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
                extracted = extracted.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
                extracted = extracted.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
                extracted = extracted.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
                
                // Remove unnecessary links (read more, source, social media, etc.)
                extracted = extracted.replace(/<a[^>]*class="[^"]*(?:read-more|readmore|more|source|link|button|btn)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                extracted = extracted.replace(/<a[^>]*href="[^"]*(?:read-more|readmore|more|source|facebook|twitter|instagram|linkedin|share)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                
                // Remove social media sharing buttons and widgets
                extracted = extracted.replace(/<div[^>]*class="[^"]*(?:share|social|facebook|twitter|instagram|linkedin|whatsapp)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
                extracted = extracted.replace(/<div[^>]*id="[^"]*(?:share|social)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
                
                // Remove common ad/related content classes
                extracted = extracted.replace(/<div[^>]*class="[^"]*(?:ad|advertisement|sidebar|related|share|social|widget|recommended|popular)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
                
                // Remove empty divs and spans
                extracted = extracted.replace(/<div[^>]*>\s*<\/div>/gi, '');
                extracted = extracted.replace(/<span[^>]*>\s*<\/span>/gi, '');
                
                // Remove links that are just URLs or "click here" type links, but keep meaningful links
                extracted = extracted.replace(/<a[^>]*href="[^"]*"[^>]*>(?:Click here|Read more|More|Source|Link|http[s]?:\/\/)[\s\S]*?<\/a>/gi, '');
                
                // Clean up extra whitespace but preserve paragraph structure
                extracted = extracted.replace(/\s+/g, ' ');
                extracted = extracted.replace(/<\/p>\s*<p[^>]*>/gi, '</p>\n<p>');
                extracted = extracted.trim();
                
                if (extracted.length > 500) {
                  fullContent = extracted;
                }
              } else {
                // Fallback: try to extract all paragraphs from the page
                const allParagraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
                if (allParagraphs && allParagraphs.length >= 3) {
                  // Get paragraphs that are likely article content (not too short, not in header/footer)
                  const articleParagraphs = allParagraphs
                    .map(p => {
                      let clean = p.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                      // Remove unnecessary links from paragraphs
                      clean = clean.replace(/<a[^>]*class="[^"]*(?:read-more|readmore|more|source|link|button)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                      clean = clean.replace(/<a[^>]*href="[^"]*(?:read-more|readmore|more|source|facebook|twitter|instagram)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                      clean = clean.replace(/<[^>]+>/g, ' ').trim();
                      return clean.length > 50 ? p : null;
                    })
                    .filter(p => p !== null)
                    .slice(0, 20); // Take first 20 substantial paragraphs
                  
                  if (articleParagraphs.length >= 3) {
                    fullContent = articleParagraphs.join('\n');
                  }
                }
              }
            }
          } catch (error) {
            // If fetching fails, keep the original description
            console.error(`Error fetching Bota Sot article: ${item.link}`, error);
          }
        }
      }
      
      // For Zeri, decode HTML entities and fetch full article if description is truncated
      if (item._source === 'Zeri') {
        // Decode HTML entities in the description
        if (fullContent) {
          fullContent = fullContent
            .replace(/&euml;/g, 'ë')
            .replace(/&ccedil;/g, 'ç')
            .replace(/&uuml;/g, 'ü')
            .replace(/&nbsp;/g, ' ')
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–');
        }
        
        // Try to fetch full article content if description is truncated
        if (item.link && (!fullContent || fullContent.length < 500 || fullContent.includes('......'))) {
          try {
            const articleResponse = await fetch(item.link, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://zeri.info/',
              },
            });
            
            if (articleResponse.ok) {
              const html = await articleResponse.text();
              
              // Patterns to find article content for Zeri
              const patterns = [
                // Zeri specific patterns
                /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                // Generic patterns
                /<article[^>]*>([\s\S]*?)<\/article>/i,
                /<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*id="article"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*id="post"[^>]*>([\s\S]*?)<\/div>/i,
                /<main[^>]*>([\s\S]*?)<\/main>/i,
              ];
              
              let bestMatch = null;
              let bestLength = 0;
              
              for (const pattern of patterns) {
                const regex = new RegExp(pattern.source, 'gi');
                let match;
                while ((match = regex.exec(html)) !== null) {
                  if (match && match[1]) {
                    const content = match[1];
                    const paragraphCount = (content.match(/<p[^>]*>/gi) || []).length;
                    if (content.length > bestLength && paragraphCount >= 2) {
                      bestMatch = content;
                      bestLength = content.length;
                    }
                  }
                }
              }
              
              // If we found a good match, use it
              if (bestMatch && bestLength > 500) {
                let extracted = bestMatch;
                
                // Aggressive cleanup for Zeri
                extracted = extracted.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                extracted = extracted.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                extracted = extracted.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
                extracted = extracted.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
                extracted = extracted.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
                extracted = extracted.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
                extracted = extracted.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
                extracted = extracted.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
                
                // Remove unnecessary links
                extracted = extracted.replace(/<a[^>]*class="[^"]*(?:read-more|readmore|more|source|link|button|btn)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                extracted = extracted.replace(/<a[^>]*href="[^"]*(?:read-more|readmore|more|source|facebook|twitter|instagram|linkedin|share)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                extracted = extracted.replace(/<a[^>]*href="[^"]*"[^>]*>(?:Click here|Read more|More|Source|Link|http[s]?:\/\/|www\.)[\s\S]*?<\/a>/gi, '');
                
                // Remove social media and sharing widgets
                extracted = extracted.replace(/<div[^>]*class="[^"]*(?:share|social|facebook|twitter|instagram|linkedin|whatsapp)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
                extracted = extracted.replace(/<div[^>]*id="[^"]*(?:share|social)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
                
                // Remove ads, sidebar, related content
                extracted = extracted.replace(/<div[^>]*class="[^"]*(?:ad|advertisement|sidebar|related|share|social|widget|recommended|popular|article-list|news-list)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
                
                // Remove empty elements
                extracted = extracted.replace(/<div[^>]*>\s*<\/div>/gi, '');
                extracted = extracted.replace(/<span[^>]*>\s*<\/span>/gi, '');
                
                // Extract only paragraphs - remove everything else to get clean content
                const paragraphs = extracted.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
                if (paragraphs && paragraphs.length >= 2) {
                  // Clean each paragraph
                  const cleanParagraphs = paragraphs
                    .map(p => {
                      // Remove links from paragraphs
                      let clean = p.replace(/<a[^>]*class="[^"]*(?:read-more|readmore|more|source|link|button)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                      clean = clean.replace(/<a[^>]*href="[^"]*(?:read-more|readmore|more|source|facebook|twitter|instagram)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                      clean = clean.replace(/<a[^>]*href="[^"]*"[^>]*>(?:Click here|Read more|More|Source|Link|http[s]?:\/\/|www\.)[\s\S]*?<\/a>/gi, '');
                      // Remove scripts and styles
                      clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                      clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                      // Check if paragraph has substantial text content
                      const textContent = clean.replace(/<[^>]+>/g, ' ').trim();
                      return textContent.length > 30 ? clean : null;
                    })
                    .filter(p => p !== null);
                  
                  if (cleanParagraphs.length >= 2) {
                    fullContent = cleanParagraphs.join('\n');
                  }
                } else {
                  // If no paragraphs found, use the cleaned extracted content
                  extracted = extracted.replace(/\s+/g, ' ');
                  extracted = extracted.replace(/<\/p>\s*<p[^>]*>/gi, '</p>\n<p>');
                  extracted = extracted.trim();
                  if (extracted.length > 500) {
                    fullContent = extracted;
                  }
                }
              } else {
                // Fallback: try to extract all paragraphs from the page
                const allParagraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
                if (allParagraphs && allParagraphs.length >= 3) {
                  const articleParagraphs = allParagraphs
                    .map(p => {
                      let clean = p.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                      // Remove unnecessary links from paragraphs
                      clean = clean.replace(/<a[^>]*class="[^"]*(?:read-more|readmore|more|source|link|button)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                      clean = clean.replace(/<a[^>]*href="[^"]*(?:read-more|readmore|more|source|facebook|twitter|instagram)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
                      clean = clean.replace(/<a[^>]*href="[^"]*"[^>]*>(?:Click here|Read more|More|Source|Link|http[s]?:\/\/|www\.)[\s\S]*?<\/a>/gi, '');
                      clean = clean.replace(/<[^>]+>/g, ' ').trim();
                      return clean.length > 50 ? p : null;
                    })
                    .filter(p => p !== null)
                    .slice(0, 20); // Take first 20 substantial paragraphs
                  
                  if (articleParagraphs.length >= 3) {
                    fullContent = articleParagraphs.join('\n');
                  }
                }
              }
            }
          } catch (error) {
            // If fetching fails, keep the original description
            console.error(`Error fetching Zeri article: ${item.link}`, error);
          }
        }
      }
      
      // Additional cleanup - remove any remaining sentences starting with "The post"
      // Second pass to catch any instances that might have been added during processing
      if (fullContent) {
        // Remove entire sentences/paragraphs that start with "The post"
        fullContent = fullContent.replace(/The\s+post[\s\S]+?[.!?]\s*/gi, '');
        fullContent = fullContent.replace(/The\s+post[\s\S]+?<\/p>/gi, '');
        fullContent = fullContent.replace(/The\s+post[\s\S]+?<\/div>/gi, '');
        // Remove if wrapped in HTML tags
        fullContent = fullContent.replace(/<[^>]*>[\s\S]*?The\s+post[\s\S]+?[.!?][\s\S]*?<\/[^>]*>/gi, '');
        fullContent = fullContent.replace(/<p[^>]*>[\s\S]*?The\s+post[\s\S]+?<\/p>/gi, '');
        fullContent = fullContent.replace(/<div[^>]*>[\s\S]*?The\s+post[\s\S]+?<\/div>/gi, '');
        
        // Clean up any trailing whitespace and empty tags
        fullContent = fullContent.replace(/<p[^>]*>\s*<\/p>/gi, '');
        fullContent = fullContent.replace(/<div[^>]*>\s*<\/div>/gi, '');
        fullContent = fullContent.trim();
      }
      
      // Clean description for preview (first 300 chars)
      // Use fullContent if available, otherwise fall back to RSS description
      let description = fullContent || item.description || item.content || item.contentSnippet || '';
      // Remove HTML tags for preview
      description = description.replace(/<[^>]*>/g, '').trim();
      // Decode HTML entities in description
      // First decode numeric entities
      description = description.replace(/&#(\d+);/g, (_match: string, dec: string) => {
        return String.fromCharCode(parseInt(dec, 10));
      });
      // Decode hexadecimal entities
      description = description.replace(/&#x([0-9a-fA-F]+);/g, (_match: string, hex: string) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      // Decode Albanian-specific named entities (for Bota Sot and other sources)
      description = description.replace(/&euml;/g, 'ë');
      description = description.replace(/&Euml;/g, 'Ë');
      description = description.replace(/&ccedil;/g, 'ç');
      description = description.replace(/&Ccedil;/g, 'Ç');
      description = description.replace(/&uuml;/g, 'ü');
      description = description.replace(/&Uuml;/g, 'Ü');
      // Decode common named entities
      description = description.replace(/&quot;/g, '"');
      description = description.replace(/&apos;/g, "'");
      description = description.replace(/&amp;/g, '&');
      description = description.replace(/&lt;/g, '<');
      description = description.replace(/&gt;/g, '>');
      description = description.replace(/&nbsp;/g, ' ');
      description = description.replace(/&mdash;/g, '—');
      description = description.replace(/&ndash;/g, '–');
      description = description.replace(/&ldquo;/g, '"');
      description = description.replace(/&rdquo;/g, '"');
      description = description.replace(/&lsquo;/g, "'");
      description = description.replace(/&rsquo;/g, "'");
      // Remove any sentence starting with "The post" from description as well
      // Simple universal approach - remove any sentence that starts with "The post"
      description = description.replace(/The\s+post[\s\S]+?[.!?]\s*/gi, '');
      // Remove extra whitespace and newlines
      description = description.replace(/\s+/g, ' ').trim();
      
      // CRITICAL: Always ensure description is max 300 characters (296 text + 1 space + 3 dots)
      // The description field has a maximum length of 300 characters
      // Strategy: Truncate to 296 chars max, then add " ..." to make exactly 300 total
      
      // First, remove any existing trailing dots, ellipsis, or whitespace
      description = description.replace(/[.\u2026]+\s*$/, '').trim();
      
      // Truncate to exactly 296 characters (reserving 4 for " ..." - 1 space + 3 dots)
      if (description.length > 296) {
        // Truncate to 296 chars, try to cut at word boundary for better readability
        let truncated = description.substring(0, 296);
        // Try to find the last space to avoid cutting words
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 250) {
          truncated = truncated.substring(0, lastSpace);
        }
        description = truncated.trim();
        // Ensure we didn't exceed 296 after trimming
        if (description.length > 296) {
          description = description.substring(0, 296);
        }
      }
      
      // FINAL STEP: Always add " ..." (space + 3 dots) to make exactly 300 characters total
      // This ensures every description is exactly 300 chars: 296 text + 1 space + 3 dots
      description = description + ' ...';
      
      // Final safety check: if somehow it exceeds 300, force it to 296 + " ..."
      if (description.length > 300) {
        description = description.substring(0, 296) + ' ...';
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

      // Initialize finalFullContent with fullContent
      let finalFullContent = fullContent;
      
      // General cleanup for all sources - remove unnecessary links and improve formatting
      if (finalFullContent) {
        // Decode HTML entities (numeric and named)
        // Handle numeric entities like &#8220; (left double quote), &#8221; (right double quote), etc.
        finalFullContent = finalFullContent.replace(/&#(\d+);/g, (_match: string, dec: string) => {
          return String.fromCharCode(parseInt(dec, 10));
        });
        // Handle hexadecimal entities like &#x201C;
        finalFullContent = finalFullContent.replace(/&#x([0-9a-fA-F]+);/g, (_match: string, hex: string) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        // Decode Albanian-specific named entities (for Bota Sot and other sources)
        finalFullContent = finalFullContent.replace(/&euml;/g, 'ë');
        finalFullContent = finalFullContent.replace(/&Euml;/g, 'Ë');
        finalFullContent = finalFullContent.replace(/&ccedil;/g, 'ç');
        finalFullContent = finalFullContent.replace(/&Ccedil;/g, 'Ç');
        finalFullContent = finalFullContent.replace(/&uuml;/g, 'ü');
        finalFullContent = finalFullContent.replace(/&Uuml;/g, 'Ü');
        // Handle common named entities
        finalFullContent = finalFullContent.replace(/&quot;/g, '"');
        finalFullContent = finalFullContent.replace(/&apos;/g, "'");
        finalFullContent = finalFullContent.replace(/&amp;/g, '&');
        finalFullContent = finalFullContent.replace(/&lt;/g, '<');
        finalFullContent = finalFullContent.replace(/&gt;/g, '>');
        finalFullContent = finalFullContent.replace(/&nbsp;/g, ' ');
        finalFullContent = finalFullContent.replace(/&mdash;/g, '—');
        finalFullContent = finalFullContent.replace(/&ndash;/g, '–');
        finalFullContent = finalFullContent.replace(/&ldquo;/g, '"');
        finalFullContent = finalFullContent.replace(/&rdquo;/g, '"');
        finalFullContent = finalFullContent.replace(/&lsquo;/g, "'");
        finalFullContent = finalFullContent.replace(/&rsquo;/g, "'");
        
        // Remove unnecessary links (read more, source, social media, etc.)
        finalFullContent = finalFullContent.replace(/<a[^>]*class="[^"]*(?:read-more|readmore|more|source|link|button|btn)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
        finalFullContent = finalFullContent.replace(/<a[^>]*href="[^"]*(?:read-more|readmore|more|source|facebook|twitter|instagram|linkedin|share)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
        
        // Remove social media sharing buttons and widgets
        finalFullContent = finalFullContent.replace(/<div[^>]*class="[^"]*(?:share|social|facebook|twitter|instagram|linkedin|whatsapp)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        finalFullContent = finalFullContent.replace(/<div[^>]*id="[^"]*(?:share|social)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        
        // Remove empty divs and spans
        finalFullContent = finalFullContent.replace(/<div[^>]*>\s*<\/div>/gi, '');
        finalFullContent = finalFullContent.replace(/<span[^>]*>\s*<\/span>/gi, '');
        
        // Remove links that are just URLs or generic text
        finalFullContent = finalFullContent.replace(/<a[^>]*href="[^"]*"[^>]*>(?:Click here|Read more|More|Source|Link|http[s]?:\/\/|www\.)[\s\S]*?<\/a>/gi, '');
        
        // Clean up extra whitespace but preserve paragraph structure
        finalFullContent = finalFullContent.replace(/\s+/g, ' ');
        finalFullContent = finalFullContent.replace(/<\/p>\s*<p[^>]*>/gi, '</p>\n<p>');
        finalFullContent = finalFullContent.trim();
      }
      
      // Check if fullContent contains social media posts and filter them out
      if (finalFullContent) {
        const contentLower = finalFullContent.toLowerCase();
        // Check for Instagram/Facebook posts in the content
        if (contentLower.includes('a post shared by') ||
            contentLower.includes('instagram.com/p/') ||
            contentLower.includes('facebook.com/') ||
            contentLower.includes('fb.com/') ||
            contentLower.includes('embed instagram') ||
            contentLower.includes('embed facebook') ||
            contentLower.includes('instagram post') ||
            contentLower.includes('facebook post') ||
            (contentLower.includes('@') && (contentLower.includes('instagram') || contentLower.includes('facebook')))) {
          // Remove Instagram/Facebook embeds and related content
          finalFullContent = finalFullContent
            .replace(/<blockquote[^>]*class="[^"]*instagram[^"]*"[^>]*>[\s\S]*?<\/blockquote>/gi, '')
            .replace(/<blockquote[^>]*class="[^"]*facebook[^"]*"[^>]*>[\s\S]*?<\/blockquote>/gi, '')
            .replace(/<div[^>]*class="[^"]*instagram[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/<div[^>]*class="[^"]*facebook[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/<iframe[^>]*instagram[^>]*>[\s\S]*?<\/iframe>/gi, '')
            .replace(/<iframe[^>]*facebook[^>]*>[\s\S]*?<\/iframe>/gi, '')
            .replace(/A post shared by[\s\S]*?(@[\w]+)/gi, '')
            .replace(/<a[^>]*href="[^"]*instagram\.com[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*href="[^"]*facebook\.com[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*href="[^"]*fb\.com[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
          
          // Also remove any paragraphs that mention Instagram/Facebook posts
          const paragraphs = finalFullContent.split(/<\/?p[^>]*>/i);
          finalFullContent = paragraphs
            .filter((p: string) => {
              const pLower = p.toLowerCase();
              return !(pLower.includes('a post shared by') || 
                      pLower.includes('instagram.com') || 
                      pLower.includes('facebook.com') ||
                      (pLower.includes('@') && (pLower.includes('instagram') || pLower.includes('facebook'))));
            })
            .join('</p><p>');
        }
      }

      // Add image to the beginning of content if we have one and it's not already in the content
      if (finalImageUrl && finalFullContent && !finalFullContent.includes('<img')) {
        const titleText = normalizeField(item.title) || 'Article image';
        finalFullContent = `<img src="${finalImageUrl}" alt="${titleText}" style="max-width: 100%; height: auto; margin-bottom: 1rem; border-radius: 8px;" />\n${finalFullContent}`;
      }

      return {
        title: normalizeField(item.title) || 'No title',
        link: normalizeField(item.link) || '',
        description: description,
        fullContent: finalFullContent, // Full article content with HTML and image
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

