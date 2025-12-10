# NIA VC AI Summary Backend

This backend generates AI-powered summaries for YouTube episodes using OpenAI GPT-4o-mini.

## Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Set up your API key
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Start the server
```bash
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/summary/:videoId` | GET | Get AI summary for a video |
| `/api/summary/bulk` | POST | Generate summaries for multiple videos |
| `/api/cache` | GET | List all cached summaries |

### Example: Get a summary
```bash
curl http://localhost:3001/api/summary/8j-cSM4qnwQ
```

### Example: Force refresh a summary
```bash
curl http://localhost:3001/api/summary/8j-cSM4qnwQ?refresh=true
```

## How It Works

1. **Request comes in** for a video ID
2. **Check cache** - if already generated, return cached version
3. **Fetch transcript** from YouTube using youtube-transcript
4. **Send to OpenAI** GPT-4o-mini for summarization
5. **Cache result** as JSON file for future requests
6. **Return summary** with title, description, key takeaways, topics, highlights

## Cost Estimate

- GPT-4o-mini costs ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
- Average video transcript ≈ 5,000 tokens
- **Cost per summary: ~$0.01-0.03**

## Customization

Edit `server.js` to change:
- **Model**: Change `gpt-4o-mini` to `gpt-4o` for higher quality (but higher cost)
- **Prompt**: Modify the prompt template for different output formats
- **Cache location**: Change `CACHE_DIR` for different storage path

## Troubleshooting

**"Could not fetch transcript"**
- Video may not have captions enabled
- Try a different video with auto-generated captions

**"OPENAI_API_KEY is not set"**
- Make sure you created `.env` file with your API key

**"Rate limited"**
- OpenAI has rate limits; wait and try again
