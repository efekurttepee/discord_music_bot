# Genius API Setup for Lyrics Command

## How to Get Genius API Token

1. Go to https://genius.com/api-clients
2. Sign in or create a Genius account
3. Click "New API Client"
4. Fill in the form:
   - **App Name**: Your Bot Name (e.g., "Discord Music Bot")
   - **App Website URL**: Your website or GitHub repo
   - **Redirect URI**: http://localhost (not used, but required)
5. Click "Save"
6. Copy the **"Client Access Token"** (NOT the Client ID or Secret)

## Add to Railway Environment Variables

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add new variable:
   - **Key**: `GENIUS_API_TOKEN`
   - **Value**: Paste your Client Access Token
5. Redeploy

## Add to Local Config (if testing locally)

If you have a `config.js` or `dev-config.js` file, add:

```javascript
geniusApiToken: process.env.GENIUS_API_TOKEN || "your-token-here",
```

## Usage

Once configured, the `/lyrics` command will work:
- `/lyrics` - Get lyrics for currently playing song
- `/lyrics song: Artist - Song Name` - Search for specific song

**Note:** The command will show a helpful error message if the token is not configured.
