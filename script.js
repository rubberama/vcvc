// ============================================
// NIA VC - Not Investment Advice VC
// YouTube API Integration & Interactive JavaScript
// ============================================

// YouTube Channel Configuration
const YOUTUBE_CONFIG = {
    // Channel ID for Not Investment Advice VC
    channelId: 'UCkrNV__eDuSmX2Y5GYU5ulQ',
    // YouTube API Key - You'll need to replace this with your own API key
    // Get one at: https://console.developers.google.com/
    apiKey: 'YOUR_YOUTUBE_API_KEY',
    // Number of videos to fetch
    maxResults: 12,
    // Channel handle for RSS feed fallback
    channelHandle: '@notinvestmentadviceVC'
};

// Fallback video data (used when API is not available)
// These are the actual full-length videos from the Not Investment Advice VC channel
const FALLBACK_VIDEOS = [
    {
        id: '8j-cSM4qnwQ',
        title: 'Nvidia earnings, The Private Credit bubble, Gemini 3 & The "ARR" lie',
        description: 'This episode dives into Nvidia\'s blockbuster Q3 earnings and the AI market dynamics fueling its growth. The hosts also dissect the looming risks in Private Credit, why Google\'s Gemini 3 could dominate the AI race, and the misleading use of ARR metrics by startups.',
        thumbnail: 'https://i.ytimg.com/vi/8j-cSM4qnwQ/hqdefault.jpg',
        publishedAt: '2025-11-23',
        duration: '46:18'
    },
    {
        id: '9WNieaqHx7I',
        title: "Yann LeCun leaves Meta, Harvey's $8B valuation, AI music hits #1 & Sequoia's leadership shakeup",
        description: 'This episode explores major AI and tech developments including Yann LeCun\'s departure from Meta, Harvey\'s $8 billion valuation in legal AI, and the rise of AI-generated music topping the Billboard charts.',
        thumbnail: 'https://i.ytimg.com/vi/9WNieaqHx7I/hqdefault.jpg',
        publishedAt: '2025-11-16',
        duration: '52:48'
    },
    {
        id: '4tdEx-_IzOE',
        title: "Prediction markets boom, The AI infrastructure bubble, The war for talent & Sora's deepfake threat",
        description: 'In this inaugural episode, VCs Eric Bahn, Ian Park, and Kevin Jiang explore the rapid rise of prediction markets, the AI infrastructure bubble, the competition for AI talent, and the emerging threat of Sora deepfakes.',
        thumbnail: 'https://i.ytimg.com/vi/4tdEx-_IzOE/hqdefault.jpg',
        publishedAt: '2025-11-09',
        duration: '1:06:10'
    }
];


// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSmoothScroll();
    initVideoModal();
    loadYouTubeContent();
    initTypewriter();
});

// ============================================
// Typewriter Effect for Hero Section
// ============================================
function initTypewriter() {
    const words = ['venture capital', 'tech', 'economy', 'investing'];
    const typewriterEl = document.getElementById('typewriter-text');

    if (!typewriterEl) return;

    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;

    const typeSpeed = 80;      // Speed of typing
    const deleteSpeed = 50;    // Speed of deleting
    const pauseDuration = 2000; // How long to pause after typing
    const pauseBeforeType = 500; // Pause before typing next word

    function type() {
        const currentWord = words[wordIndex];

        if (isPaused) {
            setTimeout(type, pauseBeforeType);
            isPaused = false;
            return;
        }

        if (isDeleting) {
            // Deleting characters
            typewriterEl.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                isPaused = true;
            }

            setTimeout(type, deleteSpeed);
        } else {
            // Typing characters
            typewriterEl.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentWord.length) {
                // Finished typing, pause then start deleting
                isDeleting = true;
                setTimeout(type, pauseDuration);
                return;
            }

            setTimeout(type, typeSpeed);
        }
    }

    // Start the typewriter effect
    type();
}


// ============================================
// YouTube Content Loading
// ============================================
async function loadYouTubeContent() {
    // Always render fallback content first for instant loading
    renderFallbackContent();

    // Optionally try to fetch fresh data from RSS in background (non-blocking)
    if (window.location.protocol !== 'file:' && YOUTUBE_CONFIG.apiKey !== 'YOUR_YOUTUBE_API_KEY') {
        try {
            await fetchFromYouTubeAPI();
        } catch (error) {
            console.log('Using pre-loaded video data');
        }
    }
}

// Fetch videos using YouTube RSS Feed (no API key required)
async function fetchFromRSSFeed() {
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CONFIG.channelId}`;

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(rssUrl));

        if (!response.ok) {
            throw new Error('RSS feed fetch failed');
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const entries = xmlDoc.querySelectorAll('entry');
        const videos = [];

        entries.forEach((entry, index) => {
            if (index >= YOUTUBE_CONFIG.maxResults) return;

            const videoId = entry.querySelector('id')?.textContent?.split(':').pop();
            const title = entry.querySelector('title')?.textContent;
            const published = entry.querySelector('published')?.textContent;
            const thumbnail = entry.querySelector('media\\:thumbnail, thumbnail')?.getAttribute('url')
                || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
            const description = entry.querySelector('media\\:description, description')?.textContent || '';

            // Filter out shorts (typically have #shorts in title or description, or very short duration)
            const isShort = title?.toLowerCase().includes('#short') ||
                description?.toLowerCase().includes('#short');

            if (videoId && title && !isShort) {
                videos.push({
                    id: videoId,
                    title: title,
                    description: description.substring(0, 200) + '...',
                    thumbnail: thumbnail,
                    publishedAt: published
                });
            }
        });

        if (videos.length > 0) {
            renderContent(videos);
        } else {
            renderFallbackContent();
        }
    } catch (error) {
        console.warn('RSS fetch failed:', error);
        // Try alternative method using noembed
        await fetchUsingOEmbed();
    }
}

// Alternative: Fetch video info using oEmbed (works for individual videos)
async function fetchUsingOEmbed() {
    // Use the known video IDs from fallback as a starting point
    // In production, you might scrape the channel page or use a backend
    renderFallbackContent();
}

// Fetch from YouTube Data API (requires API key)
async function fetchFromYouTubeAPI() {
    const baseUrl = 'https://www.googleapis.com/youtube/v3';

    // Get channel statistics
    const channelResponse = await fetch(
        `${baseUrl}/channels?part=statistics&id=${YOUTUBE_CONFIG.channelId}&key=${YOUTUBE_CONFIG.apiKey}`
    );
    const channelData = await channelResponse.json();

    if (channelData.items && channelData.items[0]) {
        // Stats handling removed
    }

    // Get uploads playlist ID
    const uploadsResponse = await fetch(
        `${baseUrl}/channels?part=contentDetails&id=${YOUTUBE_CONFIG.channelId}&key=${YOUTUBE_CONFIG.apiKey}`
    );
    const uploadsData = await uploadsResponse.json();
    const uploadsPlaylistId = uploadsData.items[0].contentDetails.relatedPlaylists.uploads;

    // Get videos from uploads playlist
    const videosResponse = await fetch(
        `${baseUrl}/playlistItems?part=snippet&maxResults=${YOUTUBE_CONFIG.maxResults}&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_CONFIG.apiKey}`
    );
    const videosData = await videosResponse.json();

    // Get video details (for duration to filter shorts)
    const videoIds = videosData.items.map(item => item.snippet.resourceId.videoId).join(',');
    const detailsResponse = await fetch(
        `${baseUrl}/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_CONFIG.apiKey}`
    );
    const detailsData = await detailsResponse.json();

    // Create duration map
    const durationMap = {};
    detailsData.items.forEach(item => {
        durationMap[item.id] = {
            duration: parseDuration(item.contentDetails.duration),
            viewCount: item.statistics.viewCount
        };
    });

    // Filter out shorts (videos under 60 seconds)
    const videos = videosData.items
        .filter(item => {
            const videoId = item.snippet.resourceId.videoId;
            const duration = durationMap[videoId]?.duration || 0;
            return duration >= 60; // At least 1 minute
        })
        .map(item => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description.substring(0, 200) + '...',
            thumbnail: item.snippet.thumbnails.maxres?.url ||
                item.snippet.thumbnails.high?.url ||
                item.snippet.thumbnails.medium?.url,
            publishedAt: item.snippet.publishedAt,
            viewCount: durationMap[item.snippet.resourceId.videoId]?.viewCount
        }));

    renderContent(videos);
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

// ============================================
// Content Rendering
// ============================================
function renderContent(videos) {
    if (videos.length === 0) {
        renderFallbackContent();
        return;
    }

    // Render featured episode (first/latest video)
    renderFeaturedEpisode(videos[0]);

    // Render episode grid (remaining videos)
    renderEpisodeGrid(videos.slice(1));
}

function renderFallbackContent() {
    renderFeaturedEpisode(FALLBACK_VIDEOS[0]);
    renderEpisodeGrid(FALLBACK_VIDEOS.slice(1));
}

function renderFeaturedEpisode(video) {
    const container = document.getElementById('featured-episode');
    const publishDate = formatDate(video.publishedAt);

    container.innerHTML = `
        <div class="featured-image" onclick="goToEpisode('${video.id}')">
            <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" class="featured-thumbnail">
            <div class="featured-overlay">
                <button class="play-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </button>
            </div>
        </div>
        <div class="featured-content">
            <div class="episode-meta">
                <span class="episode-category">NIA VC</span>
                <span class="episode-date">${publishDate}</span>
            </div>
            <h3 class="featured-title">${escapeHtml(video.title)}</h3>
            <p class="featured-description">${escapeHtml(video.description || 'Weekly conversation with Ian, Eric, and Kevin on tech, economy, investing, market, and many more...')}</p>
            <div class="featured-actions">
                <a href="episode.html?v=${video.id}" class="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    View Episode
                </a>
                <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" class="btn btn-secondary">
                    Open in YouTube
                </a>
            </div>
        </div>
    `;
}

function renderEpisodeGrid(videos) {
    const container = document.getElementById('episodes-grid');

    if (videos.length === 0) {
        container.innerHTML = '<p class="no-episodes">No additional episodes found.</p>';
        return;
    }

    container.innerHTML = videos.map(video => {
        const publishDate = formatDate(video.publishedAt);
        return `
            <article class="episode-card" onclick="goToEpisode('${video.id}')">
                <div class="card-image">
                    <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" class="card-thumbnail">
                    <div class="card-overlay">
                        <button class="play-btn-sm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </button>
                    </div>
                    ${video.duration ? `<span class="video-duration">${video.duration}</span>` : ''}
                </div>
                <div class="card-content">
                    <div class="episode-meta">
                        <span class="episode-category cat-nia-vc">NIA VC</span>
                        <span class="episode-date">${publishDate}</span>
                    </div>
                    <h3 class="card-title">${escapeHtml(video.title)}</h3>
                    <span class="card-link">View Episode →</span>
                </div>
            </article>
        `;
    }).join('');
}

// Navigate to episode detail page
function goToEpisode(videoId) {
    window.location.href = `episode.html?v=${videoId}`;
}



// ============================================
// Video Modal
// ============================================
function initVideoModal() {
    const modal = document.getElementById('video-modal');
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    const closeModal = () => {
        modal.classList.remove('active');
        document.getElementById('video-iframe').src = '';
        document.body.style.overflow = '';
    };

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

function openVideoModal(videoId) {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-iframe');

    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ============================================
// Navigation
// ============================================
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');

    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 10) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });

    // Mobile menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
            navActions.classList.toggle('show');
            mobileMenuBtn.classList.toggle('active');
        });
    }

    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

            if (navLink && scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                navLink.classList.add('active');
            }
        });
    });
}

// ============================================
// Smooth Scroll
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// ============================================
// Utility Functions
// ============================================
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Auto-refresh (check for new videos periodically)
// ============================================
// Refresh content every 30 minutes when page is visible
let refreshInterval;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(refreshInterval);
    } else {
        refreshInterval = setInterval(loadYouTubeContent, 30 * 60 * 1000);
    }
});

// Initial refresh interval
refreshInterval = setInterval(loadYouTubeContent, 30 * 60 * 1000);
