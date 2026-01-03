const axios = require("axios");

class SpotifyResolver {
    constructor(client) {
        this.client = client;
        this.token = null;
        this.tokenExpiration = 0;
    }

    async getToken() {
        if (this.token && Date.now() < this.tokenExpiration) {
            return this.token;
        }

        const clientId = this.client.config.spotifyClientId;
        const clientSecret = this.client.config.spotifyClientSecret;

        if (!clientId || !clientSecret) {
            console.error("Spotify credentials are missing in config!");
            return null;
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');

            const response = await axios.post('https://accounts.spotify.com/api/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
                }
            });

            this.token = response.data.access_token;
            this.tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 5000;
            return this.token;
        } catch (error) {
            console.error("[SpotifyResolver] Failed to fetch token:", error.response?.data || error.message);
            return null;
        }
    }

    async resolve(url) {
        const token = await this.getToken();
        if (!token) return { type: 'ERROR', tracks: [] };

        if (url.includes("/track/")) {
            return this.getTrack(url, token);
        } else if (url.includes("/playlist/")) {
            return this.getPlaylist(url, token);
        } else if (url.includes("/album/")) {
            return this.getAlbum(url, token);
        }

        return { type: 'UNSUPPORTED', tracks: [] };
    }

    async getTrack(url, token) {
        try {
            const id = url.split("/track/")[1].split("?")[0];
            const res = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const track = res.data;
            return {
                type: 'TRACK',
                tracks: [`${track.name} ${track.artists[0].name}`]
            };
        } catch (e) {
            console.error("[SpotifyResolver] Track error:", e.message);
            return { type: 'ERROR', tracks: [] };
        }
    }

    async getPlaylist(url, token) {
        try {
            const id = url.split("/playlist/")[1].split("?")[0];
            const res = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`, { // Limit to 50 for performance
                headers: { Authorization: `Bearer ${token}` }
            });
            const tracks = res.data.items.map(item => item.track).filter(t => t).map(t => `${t.name} ${t.artists[0].name}`);
            return {
                type: 'PLAYLIST',
                tracks: tracks
            };
        } catch (e) {
            console.error("[SpotifyResolver] Playlist error:", e.message);
            return { type: 'ERROR', tracks: [] };
        }
    }

    async getAlbum(url, token) {
        try {
            const id = url.split("/album/")[1].split("?")[0];
            const res = await axios.get(`https://api.spotify.com/v1/albums/${id}/tracks?limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const tracks = res.data.items.map(t => `${t.name} ${t.artists[0].name}`);
            return {
                type: 'PLAYLIST',
                tracks: tracks
            };
        } catch (e) {
            console.error("[SpotifyResolver] Album error:", e.message);
            return { type: 'ERROR', tracks: [] };
        }
    }
}

module.exports = SpotifyResolver;
