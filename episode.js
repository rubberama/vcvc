// ============================================
// Episode Detail Page JavaScript
// Uses pre-generated AI data from episodes-data.js
// Includes typewriter animation for AI-generated feel
// ============================================

// ============================================
// Initialize Page
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadEpisodeFromURL();
    initShareButtons();
});

// ============================================
// Load Episode Data
// ============================================
function loadEpisodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || urlParams.get('id');

    if (!videoId) {
        renderEpisode(Object.values(EPISODES_DATA)[0]);
        return;
    }

    const episode = EPISODES_DATA[videoId];

    if (episode) {
        renderEpisode(episode);
    } else {
        // Fallback: try to fetch from backend API for unknown videos
        fetchEpisodeFromAPI(videoId);
    }

    // Load related episodes
    renderRelatedEpisodes(videoId);
}

// Fetch episode data from backend API for videos not in static data
async function fetchEpisodeFromAPI(videoId) {
    try {
        const response = await fetch(`http://localhost:3001/api/summary/${videoId}`);
        if (response.ok) {
            const data = await response.json();
            renderEpisode({
                videoId,
                title: data.title || 'Episode',
                description: data.description || 'Weekly conversation with Ian, Eric, and Kevin on tech, economy, investing, market, and many more...',
                publishedAt: data.generatedAt || new Date().toISOString(),
                topics: (data.topics || []).map(t => typeof t === 'string' ? { text: t } : t),
                keyTakeaways: data.keyTakeaways || [],
                highlights: data.highlights || [],
                aiGenerated: true
            });
        } else {
            // API failed, render basic fallback
            renderEpisode({
                videoId,
                title: 'Episode',
                description: 'Weekly conversation with Ian, Eric, and Kevin on tech, economy, investing, market, and many more...',
                publishedAt: new Date().toISOString(),
                topics: [],
                keyTakeaways: [],
                highlights: [],
                aiGenerated: false
            });
        }
    } catch (error) {
        console.error('Failed to fetch from API:', error);
        renderEpisode({
            videoId,
            title: 'Episode',
            description: 'Weekly conversation with Ian, Eric, and Kevin on tech, economy, investing, market, and many more...',
            publishedAt: new Date().toISOString(),
            topics: [],
            keyTakeaways: [],
            highlights: [],
            aiGenerated: false
        });
    }
}

// ============================================
// Render Episode with AI Animation
// ============================================
function renderEpisode(episode) {
    // Update page title
    document.getElementById('page-title').textContent = `${episode.title} | NIA VC`;
    document.getElementById('meta-description').setAttribute('content', episode.description || '');

    // Update header
    document.getElementById('episode-title').textContent = episode.title;
    document.getElementById('episode-date').textContent = formatDate(episode.publishedAt);

    // Update video player
    document.getElementById('youtube-player').src =
        `https://www.youtube.com/embed/${episode.videoId}?rel=0&modestbranding=1`;

    // Render description with typewriter effect
    const descriptionEl = document.getElementById('episode-description');
    if (episode.aiGenerated) {
        typewriterEffect(descriptionEl, episode.description, 7);
    } else {
        descriptionEl.textContent = episode.description;
    }

    // Render topics with timestamps
    const topicsList = document.getElementById('topics-list');
    if (episode.topics && episode.topics.length > 0) {
        renderTopicsWithAnimation(topicsList, episode.topics, episode.videoId);
    }

    // Add key takeaways section
    if (episode.keyTakeaways && episode.keyTakeaways.length > 0) {
        setTimeout(() => {
            addKeyTakeawaysSection(episode.keyTakeaways);
        }, 800);
    }

    // Add highlights section
    if (episode.highlights && episode.highlights.length > 0) {
        setTimeout(() => {
            addHighlightsSection(episode.highlights);
        }, 1200);
    }

    // Update share links
    updateShareLinks(episode.title);
}

// ============================================
// Typewriter Animation Effect
// ============================================
function typewriterEffect(element, text, speed = 20, callback) {
    element.innerHTML = '';
    element.classList.add('typing');

    // Add cursor
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '|';

    let i = 0;
    const textNode = document.createTextNode('');
    element.appendChild(textNode);
    element.appendChild(cursor);

    // Small loading delay to simulate "thinking"
    setTimeout(() => {
        const timer = setInterval(() => {
            if (i < text.length) {
                textNode.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                cursor.remove();
                element.classList.remove('typing');
                if (callback) callback();
            }
        }, speed);
    }, 500);
}

// ============================================
// Topics with Timestamps
// ============================================
function renderTopicsWithAnimation(container, topics, videoId) {
    container.innerHTML = '';

    topics.forEach((topic, index) => {
        setTimeout(() => {
            const li = document.createElement('li');
            li.className = 'topic-item fade-in';

            // Handle both string topics and object topics with timestamps
            const topicText = typeof topic === 'string' ? topic : topic.text;
            const timestamp = typeof topic === 'object' ? topic.timestamp : null;

            if (timestamp) {
                const seconds = parseTimestamp(timestamp);
                li.innerHTML = `
                    <span class="topic-text">${escapeHtml(topicText)}</span>
                    <a href="#" class="topic-timestamp" onclick="seekToTime(${seconds}); return false;" title="Jump to ${timestamp}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        ${timestamp}
                    </a>
                `;
            } else {
                li.innerHTML = `<span class="topic-text">${escapeHtml(topicText)}</span>`;
            }

            container.appendChild(li);

            // Trigger animation
            requestAnimationFrame(() => {
                li.classList.add('visible');
            });
        }, index * 100);
    });
}

// Parse timestamp string (e.g., "1:23:45" or "12:30") to seconds
function parseTimestamp(timestamp) {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

// Seek video player to specific time
function seekToTime(seconds) {
    const iframe = document.getElementById('youtube-player');

    // Get the video ID from current URL params
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || urlParams.get('id');

    if (!videoId) return;

    // Rebuild the embed URL with start time - this is the proper way
    iframe.src = `https://www.youtube.com/embed/${videoId}?start=${seconds}&autoplay=1&rel=0&modestbranding=1`;

    // Scroll to video
    iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// Key Takeaways Section
// ============================================
function addKeyTakeawaysSection(takeaways) {
    const topicsSection = document.querySelector('.topics-section');
    if (!topicsSection) return;

    // Check if section already exists
    if (document.querySelector('.takeaways-section')) return;

    const section = document.createElement('div');
    section.className = 'takeaways-section fade-in';
    section.innerHTML = `
        <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Key Takeaways
        </h3>
        <ul class="takeaways-list"></ul>
    `;

    topicsSection.insertAdjacentElement('afterend', section);

    const list = section.querySelector('.takeaways-list');
    takeaways.forEach((takeaway, index) => {
        setTimeout(() => {
            const li = document.createElement('li');
            li.className = 'fade-in';
            li.textContent = takeaway;
            list.appendChild(li);
            requestAnimationFrame(() => li.classList.add('visible'));
        }, index * 150);
    });

    requestAnimationFrame(() => section.classList.add('visible'));
}

// ============================================
// Highlights Section
// ============================================
function addHighlightsSection(highlights) {
    const takeawaysSection = document.querySelector('.takeaways-section') || document.querySelector('.topics-section');
    if (!takeawaysSection) return;

    // Check if section already exists
    if (document.querySelector('.highlights-section')) return;

    const section = document.createElement('div');
    section.className = 'highlights-section fade-in';
    section.innerHTML = `
        <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Notable Moments
        </h3>
        <div class="highlights-list"></div>
    `;

    takeawaysSection.insertAdjacentElement('afterend', section);

    const list = section.querySelector('.highlights-list');
    highlights.forEach((highlight, index) => {
        setTimeout(() => {
            const blockquote = document.createElement('blockquote');
            blockquote.className = 'fade-in';
            blockquote.textContent = highlight;
            list.appendChild(blockquote);
            requestAnimationFrame(() => blockquote.classList.add('visible'));
        }, index * 200);
    });

    requestAnimationFrame(() => section.classList.add('visible'));
}

// ============================================
// Related Episodes
// ============================================
function renderRelatedEpisodes(currentVideoId) {
    const container = document.getElementById('related-episodes');
    const episodes = Object.values(EPISODES_DATA)
        .filter(ep => ep.videoId !== currentVideoId)
        .slice(0, 3);

    if (episodes.length === 0) {
        container.innerHTML = '<p class="no-episodes">More episodes coming soon!</p>';
        return;
    }

    container.innerHTML = episodes.map(episode => `
        <article class="episode-card" onclick="window.location.href='episode.html?v=${episode.videoId}'">
            <div class="card-image">
                <img src="https://i.ytimg.com/vi/${episode.videoId}/hqdefault.jpg" alt="${escapeHtml(episode.title)}" class="card-thumbnail" onerror="this.src='https://i.ytimg.com/vi/${episode.videoId}/mqdefault.jpg'">
                <div class="card-overlay">
                    <button class="play-btn-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </button>
                </div>
                ${episode.duration ? `<span class="video-duration">${episode.duration}</span>` : ''}
            </div>
            <div class="card-content">
                <div class="episode-meta">
                    <span class="episode-category cat-nia-vc">NIA VC</span>
                    <span class="episode-date">${formatDate(episode.publishedAt)}</span>
                </div>
                <h3 class="card-title">${escapeHtml(episode.title)}</h3>
                <span class="card-link">View Episode →</span>
            </div>
        </article>
    `).join('');
}

// ============================================
// Share Functionality
// ============================================
function initShareButtons() {
    const copyBtn = document.getElementById('copy-link-btn');

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            copyBtn.classList.add('copied');
            copyBtn.querySelector('span').textContent = 'Copied!';

            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.querySelector('span').textContent = 'Copy Link';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            copyBtn.classList.add('copied');
            copyBtn.querySelector('span').textContent = 'Copied!';

            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.querySelector('span').textContent = 'Copy Link';
            }, 2000);
        }
    });
}

function updateShareLinks(title) {
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    const encodedTitle = encodeURIComponent(title);

    document.getElementById('twitter-share').href =
        `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    document.getElementById('linkedin-share').href =
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
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
