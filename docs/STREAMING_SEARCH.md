# Streaming Search Implementation

## Overview

The TripPlanner app now uses **streaming search** to maximize Gemini API efficiency while providing a responsive user experience. Instead of requesting just 10-15 places per API call, the app now requests **150-200 places in a single request** and streams results progressively to the UI.

## Key Benefits

### 1. **API Efficiency** 🎯
- **Before**: 10-15 places per request
- **After**: 150-200 places per request
- **Result**: ~10-15x more value from each API call

### 2. **Better UX** ⚡
- Results appear in batches of 10 as Gemini generates them
- No need to wait for all 200 places before seeing results
- Progressive loading keeps the UI responsive

### 3. **Free Tier Friendly** 💰
- Maximizes the value of limited API requests
- Single search provides comprehensive coverage of a city
- Reduces need for "Load More" requests

## How It Works

### Backend (Server-Sent Events)

The backend uses Gemini's `generateContentStream()` API and sends results via Server-Sent Events (SSE):

```javascript
// server/index.js
app.post('/api/search', async (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stream from Gemini
  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: prompt, // Asks for 150-200 places
    config: {
      maxOutputTokens: 16384 // Increased for larger responses
    }
  });

  // Process and send batches of 10
  for await (const chunk of stream) {
    // Parse places from chunk
    // Send batch when we have 10 places
    if (pendingPlaces.length >= 10) {
      res.write(`data: ${JSON.stringify({ batchNumber, results: pendingPlaces })}\n\n`);
    }
  }
});
```

### Frontend (Progressive Updates)

The frontend receives and displays batches as they arrive:

```typescript
// geminiService.ts
export const fetchSuggestionsStream = async (
  city: string,
  query: string,
  onBatch: (batch: TripRecommendation[], batchNumber: number) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
) => {
  const response = await fetch(API_ENDPOINT, { method: 'POST', ... });
  const reader = response.body?.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Parse SSE data and call onBatch for each batch
    const parsed = JSON.parse(data);
    onBatch(parsed.results, parsed.batchNumber);
  }
};
```

### Hook Integration

The `useTripPlanner` hook manages streaming state:

```typescript
// hooks/useTripPlanner.ts
await fetchSuggestionsStream(
  currentCity, 
  query,
  (batch, batchNumber) => {
    // Add each batch as it arrives
    setPendingSuggestions(prev => [...prev, ...batch]);
    console.log(`Batch ${batchNumber}: ${batch.length} places`);
  },
  () => console.log('Search completed'),
  (error) => console.error('Error:', error)
);
```

## User Experience Flow

1. **User searches** for "coffee shops" in "Tokyo"
2. **Request sent** to backend asking for 150-200 places
3. **Batch 1** arrives (10 places) → UI updates immediately
4. **Batch 2** arrives (10 places) → UI adds 10 more
5. **Batch 3** arrives... and so on
6. **After 15-20 batches** → 150-200 total places loaded
7. **Total time** → Similar to old approach, but with 10x more results

## Configuration

### Prompt Settings

```javascript
const prompt = `Find 150-200 specific, diverse places in ${city} for: "${query}".

RULES:
1. Mix popular spots with hidden local gems
2. Diversify across different neighborhoods
3. Avoid chains unless highly relevant
4. Keep descriptions under 20 words
`;
```

### Batch Size

Currently set to **10 places per batch**. Can be adjusted:

```javascript
// server/index.js
if (pendingPlaces.length >= 10) { // Change this number
  sendBatch(pendingPlaces);
}
```

### Token Limits

```javascript
maxOutputTokens: 16384 // Supports ~200 place entries
```

## Fallback Behavior

The old `fetchSuggestions()` function is still available for non-streaming scenarios or if SSE is not supported by the client.

## Testing

### Test Streaming Locally

1. Start the backend: `npm run dev:backend`
2. Start the frontend: `npm run dev`
3. Search for a query
4. Open browser console to see batch logs:
   ```
   Batch 1: 10 places
   Batch 2: 10 places
   ...
   Search completed
   ```

### Test with cURL

```bash
curl -N -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"city": "Tokyo", "query": "coffee shops"}'
```

You'll see SSE stream:
```
data: {"batchNumber":1,"results":[...10 places...]}

data: {"batchNumber":2,"results":[...10 places...]}

data: {"done":true}
```

## Performance Metrics

### Before Streaming
- **Request**: 10-15 places
- **API Calls for 150 places**: 10-15 calls
- **User wait time**: Wait → Click "Load More" → Wait → Repeat

### After Streaming
- **Request**: 150-200 places
- **API Calls for 150 places**: 1 call
- **User wait time**: See first results in ~2-3 seconds, full results in ~20-30 seconds

## Error Handling

The streaming implementation includes comprehensive error handling:

```typescript
try {
  await fetchSuggestionsStream(...);
} catch (error) {
  // Frontend shows error to user
  // Backend logs error and sends error event
  res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
}
```

## Future Improvements

1. **Resume capability**: Store stream position to resume if interrupted
2. **Adaptive batch size**: Larger batches for fast connections
3. **Caching**: Cache results locally to avoid re-fetching
4. **Priority streaming**: Popular places first, then hidden gems
5. **Background loading**: Continue loading while user browses results

## Limitations

1. **Gemini Rate Limits**: Still subject to Gemini API rate limits
2. **Browser Support**: Requires browsers that support Streaming Fetch API (all modern browsers)
3. **Connection**: Requires stable internet connection for streaming
4. **Token Limits**: Max ~200 places per request due to token limits

## Deployment Notes

### Vercel Deployment

The current `/api/search.js` Vercel function needs updating to support streaming. Vercel supports streaming with specific configuration.

To enable streaming on Vercel:

1. Update `api/search.js` with streaming logic similar to `server/index.js`
2. Add to `vercel.json`:
```json
{
  "functions": {
    "api/search.js": {
      "maxDuration": 60
    }
  }
}
```

Note: Vercel has a 60-second timeout on Hobby plan, which should be enough for streaming 150-200 results.

## Conclusion

Streaming search is a game-changer for free-tier users. It provides:
- 10-15x more results per API call
- Progressive loading for better UX
- Maximized value from limited API quota
- Comprehensive city coverage in a single search

The implementation is backward-compatible and includes proper error handling and fallback mechanisms.
