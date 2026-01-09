import { NextRequest, NextResponse } from 'next/server';

/**
 * Image proxy API route to bypass hotlinking protection
 * GET /api/image-proxy?url=<encoded-image-url>&referer=<optional-article-url>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');
    const refererUrl = searchParams.get('referer');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(imageUrl);

    // Only allow images from trusted sources
    if (!decodedUrl.includes('telegrafi.com')) {
      return NextResponse.json(
        { error: 'Invalid image source' },
        { status: 403 }
      );
    }

    // Determine the best referer URL
    let finalReferer: string;
    if (refererUrl) {
      finalReferer = decodeURIComponent(refererUrl);
    } else {
      finalReferer = 'https://telegrafi.com/';
    }
    
    // Fetch the image with proper headers
    const origin = 'https://telegrafi.com';
    
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': finalReferer,
        'Origin': origin,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,sq;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Failed to fetch image: ${decodedUrl}`);
      console.error(`Status: ${response.status}, StatusText: ${response.statusText}`);
      console.error(`Referer used: ${finalReferer}`);
      console.error(`Error response: ${errorText.substring(0, 500)}`);
      
      // Return a more informative error
      return NextResponse.json(
        { 
          error: `Failed to fetch image: ${response.status} ${response.statusText}`,
          url: decodedUrl,
          referer: finalReferer
        },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Error proxying image:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      url: imageUrl,
    });
    return NextResponse.json(
      { 
        error: 'Failed to proxy image',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

