// ============================================
// NIA VC Backend Server
// AI-Powered Episode Summary Generator
// Using Perplexity API (primary) + Gemini (fallback)
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize APIs
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// CORS configuration - allow all origins for local development
app.use(cors());

app.use(express.json());

// Cache directory for storing generated summaries
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'NIA VC Backend is running',
        providers: {
            perplexity: !!PERPLEXITY_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY
        }
    });
});

// Get channel stats (subscribers, views)
app.get('/api/channel-stats', async (req, res) => {
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

        // Extract view count from about section
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

        res.json({
            subscribers: subscribers || 63,  // Fallback to last known
            totalViews: totalViews || 520,   // Fallback to last known
            videoCount: videoCount || 20,    // Fallback to last known
            fetchedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Channel Stats Error]', error.message);
        // Return fallback values on error
        res.json({
            subscribers: 63,
            totalViews: 520,
            videoCount: 20,
            error: error.message,
            fetchedAt: new Date().toISOString()
        });
    }
});

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

// Get episode summary (cached or generate new)
app.get('/api/summary/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    try {
        // Check cache first
        const cacheFile = path.join(CACHE_DIR, `${videoId}.json`);

        if (!forceRefresh && fs.existsSync(cacheFile)) {
            const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            console.log(`[Cache Hit] Returning cached summary for ${videoId}`);
            return res.json({ ...cached, cached: true });
        }

        console.log(`[Generating] Creating new summary for ${videoId}`);

        // Get video info and transcript
        const videoData = await getVideoData(videoId);

        if (!videoData) {
            return res.status(404).json({
                error: 'Could not fetch video data',
                message: 'Video not found or inaccessible'
            });
        }

        // Generate summary - try Perplexity first, then Gemini
        let summary;
        try {
            summary = await generateWithPerplexity(videoData, videoId);
        } catch (perplexityError) {
            console.log(`[Perplexity Failed] ${perplexityError.message}, trying Gemini...`);
            try {
                summary = await generateWithGemini(videoData, videoId);
            } catch (geminiError) {
                throw new Error(`All AI providers failed. Perplexity: ${perplexityError.message}, Gemini: ${geminiError.message}`);
            }
        }

        // Cache the result
        fs.writeFileSync(cacheFile, JSON.stringify(summary, null, 2));
        console.log(`[Cached] Saved summary for ${videoId}`);

        res.json({ ...summary, cached: false });

    } catch (error) {
        console.error(`[Error] Failed to generate summary for ${videoId}:`, error.message);
        res.status(500).json({
            error: 'Failed to generate summary',
            message: error.message
        });
    }
});

// Get video info only
app.get('/api/video/:videoId', async (req, res) => {
    const { videoId } = req.params;

    try {
        const videoData = await getVideoData(videoId);
        if (!videoData) {
            return res.status(404).json({ error: 'Video not found' });
        }
        res.json(videoData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all cached summaries
app.get('/api/cache', (req, res) => {
    try {
        const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
        const summaries = files.map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf-8'));
            return {
                videoId: f.replace('.json', ''),
                title: data.title,
                generatedAt: data.generatedAt
            };
        });
        res.json(summaries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Video Data Fetching
// ============================================

async function getVideoData(videoId) {
    try {
        // Fetch YouTube page
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) {
            console.error(`[Fetch Error] Status ${response.status}`);
            return null;
        }

        const html = await response.text();

        // Extract player response JSON
        const playerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);

        let title = '', description = '', transcript = '';

        if (playerMatch) {
            try {
                const playerData = JSON.parse(playerMatch[1]);
                const videoDetails = playerData.videoDetails || {};
                title = videoDetails.title || '';
                description = videoDetails.shortDescription || '';

                // Try to get captions
                const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                if (captionTracks && captionTracks.length > 0) {
                    const track = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
                    if (track?.baseUrl) {
                        transcript = await fetchCaptions(track.baseUrl);
                    }
                }
            } catch (e) {
                console.error('[Parse Error]', e.message);
            }
        }

        // Fallback title from meta tags
        if (!title) {
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            if (titleMatch) {
                title = titleMatch[1].replace(' - YouTube', '').trim();
            }
        }

        console.log(`[Video] ${title}`);
        console.log(`[Transcript] ${transcript ? transcript.length + ' chars' : 'Not available'}`);

        return {
            videoId,
            title,
            description,
            transcript,
            hasTranscript: !!transcript
        };

    } catch (error) {
        console.error(`[Video Error] ${videoId}:`, error.message);
        return null;
    }
}

async function fetchCaptions(captionUrl) {
    try {
        const url = captionUrl + '&fmt=srv3';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        if (!response.ok) return null;

        const xml = await response.text();
        const textMatches = xml.match(/<text[^>]*>([^<]*)<\/text>/g);
        if (!textMatches) return null;

        const transcript = textMatches
            .map(match => {
                const textMatch = match.match(/>([^<]*)</);
                return textMatch ? decodeHtmlEntities(textMatch[1]) : '';
            })
            .filter(text => text.trim())
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        const maxLength = 30000;
        return transcript.length > maxLength
            ? transcript.substring(0, maxLength) + '...'
            : transcript;

    } catch (error) {
        console.error('[Caption Error]', error.message);
        return null;
    }
}

function decodeHtmlEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

// ============================================
// AI Providers
// ============================================

function buildPrompt(videoData) {
    const { title, description, transcript, hasTranscript } = videoData;
    const content = transcript || description || '';

    return `You are analyzing a podcast/video ${hasTranscript ? 'transcript' : 'description'}.

Video Title: ${title}
${!hasTranscript ? '\nNote: Full transcript not available, using video description only.' : ''}

Based on the ${hasTranscript ? 'transcript' : 'description'} below, generate a JSON response with:

1. "title": Use the actual video title: "${title}"
2. "description": A 2-3 sentence engaging description of what this episode covers
3. "keyTakeaways": An array of 5-6 key insights or takeaways from the discussion
4. "topics": An array of 5-8 main topics discussed (short phrases)
5. "highlights": An array of 2-3 notable quotes or interesting moments (brief excerpts)

IMPORTANT: 
- Keep responses concise and punchy
- Write in an engaging, professional tone
- Focus on the most valuable insights
- Avoid generic statements
- Return ONLY valid JSON, no markdown code blocks

CONTENT:
${content}`;
}

async function generateWithPerplexity(videoData, videoId) {
    if (!PERPLEXITY_API_KEY) {
        throw new Error('Perplexity API key not configured');
    }

    const prompt = buildPrompt(videoData);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'sonar',
            messages: [
                { role: 'system', content: 'You analyze video content and generate structured JSON summaries. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
        throw new Error('No content in Perplexity response');
    }

    const parsed = parseJsonResponse(content);

    console.log(`[Perplexity] Success - generated summary for ${videoId}`);

    return {
        videoId,
        ...parsed,
        hasTranscript: videoData.hasTranscript,
        generatedAt: new Date().toISOString(),
        model: 'perplexity-llama-3.1-sonar'
    };
}

async function generateWithGemini(videoData, videoId) {
    const prompt = buildPrompt(videoData);

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const parsed = parseJsonResponse(content);

    console.log(`[Gemini] Success - generated summary for ${videoId}`);

    return {
        videoId,
        ...parsed,
        hasTranscript: videoData.hasTranscript,
        generatedAt: new Date().toISOString(),
        model: 'gemini-2.0-flash'
    };
}

function parseJsonResponse(content) {
    // Clean up response - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
    cleanContent = cleanContent.trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
}

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║       NIA VC AI Summary Backend                ║
║   Perplexity (primary) + Gemini (fallback)     ║
╠════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}       ║
║                                                ║
║  Providers:                                    ║
║  • Perplexity: ${PERPLEXITY_API_KEY ? '✓ Configured' : '✗ Not set'}              ║
║  • Gemini: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Not set'}                  ║
║                                                ║
║  Endpoints:                                    ║
║  • GET  /api/health          - Health check    ║
║  • GET  /api/summary/:id     - Get summary     ║
║  • GET  /api/video/:id       - Get video info  ║
║  • GET  /api/cache           - List cached     ║
╚════════════════════════════════════════════════╝
    `);
});
