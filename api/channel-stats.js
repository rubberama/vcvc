// Vercel Serverless Function: Channel Stats
// Fetches YouTube channel statistics

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const channelUrl = 'https://www.youtube.com/@notinvestmentadviceVC';

        const response = await fetch(channelUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch channel page');
        }

        const html = await response.text();

        // Extract subscriber count
        let subscribers = null;
        const subMatch = html.match(/"subscriberCountText":\s*\{\s*"simpleText":\s*"([^"]+)"/);
        if (subMatch) {
            subscribers = parseYouTubeCount(subMatch[1]);
        }

        // Extract view count
        let totalViews = null;
        const viewMatch = html.match(/"viewCountText":\s*\{\s*"simpleText":\s*"([^"]+)"/);
        if (viewMatch) {
            totalViews = parseYouTubeCount(viewMatch[1]);
        }

        // Extract video count
        let videoCount = null;
        const vidMatch = html.match(/"videosCountText":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/);
        if (vidMatch) {
            videoCount = parseInt(vidMatch[1].replace(/,/g, '')) || null;
        }

        console.log(`[Channel Stats] Subscribers: ${subscribers}, Views: ${totalViews}, Videos: ${videoCount}`);

        res.status(200).json({
            subscribers: subscribers || 63,
            totalViews: totalViews || 520,
            videoCount: videoCount || 20,
            fetchedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Channel Stats Error]', error.message);
        res.status(200).json({
            subscribers: 63,
            totalViews: 520,
            videoCount: 20,
            error: error.message,
            fetchedAt: new Date().toISOString()
        });
    }
}

// Helper: Parse YouTube count strings like "1.2K" or "10,234"
function parseYouTubeCount(str) {
    if (!str) return null;
    const cleanStr = str.replace(/[^0-9KMBkmb.,]/g, '').toUpperCase();

    if (cleanStr.includes('K')) {
        return Math.round(parseFloat(cleanStr.replace('K', '')) * 1000);
    } else if (cleanStr.includes('M')) {
        return Math.round(parseFloat(cleanStr.replace('M', '')) * 1000000);
    } else if (cleanStr.includes('B')) {
        return Math.round(parseFloat(cleanStr.replace('B', '')) * 1000000000);
    }
    return parseInt(cleanStr.replace(/,/g, '')) || null;
}
