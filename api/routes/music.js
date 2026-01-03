const { Router } = require("express");
const { getClient } = require("../../");
const Auth = require("../middlewares/auth");

const api = Router();


const resolveGuild = (client, req) => {
    if (req.body && req.body.guildId) return req.body.guildId;
    if (req.query && req.query.guildId) return req.query.guildId;

    // Auto-detect based on user's voice state
    if (req.user && req.user.id) {
        const userId = req.user.id;
        // Check all active players
        for (const [guildId, player] of client.manager.players) {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;
            const member = guild.members.cache.get(userId);
            if (member && member.voice.channelId === player.voiceChannel) {
                return guildId;
            }
        }
    }
    return null;
}

api.post("/play", Auth, (req, res) => {
    const client = getClient();
    const guildId = resolveGuild(client, req);
    if (!guildId) return res.status(400).json({ error: "Could not determine guild. Are you in a voice channel with the bot?" });

    const player = client.manager.players.get(guildId);
    if (!player) return res.status(404).json({ error: "No player found" });

    player.pause(!player.paused);
    res.json({ paused: player.paused });
});

api.post("/skip", Auth, (req, res) => {
    const client = getClient();
    const guildId = resolveGuild(client, req);
    if (!guildId) return res.status(400).json({ error: "Could not determine guild" });

    const player = client.manager.players.get(guildId);
    if (!player) return res.status(404).json({ error: "No player found" });

    player.stop();
    res.json({ success: true });
});

api.post("/volume", Auth, (req, res) => {
    const client = getClient();
    const guildId = resolveGuild(client, req);
    const { volume } = req.body;
    if (!guildId || !volume) return res.status(400).json({ error: "Missing args" });

    const player = client.manager.players.get(guildId);
    if (!player) return res.status(404).json({ error: "No player found" });

    player.setVolume(Number(volume));
    res.json({ volume: Number(volume) });
});

api.get("/info", Auth, (req, res) => {
    const client = getClient();
    const guildId = resolveGuild(client, req);
    // If no guild found, return not playing instead of error for the info endpoint
    if (!guildId) return res.json({ playing: false });

    const player = client.manager.players.get(guildId);
    if (!player || !player.queue.current) return res.json({ playing: false });

    res.json({
        playing: !player.paused,
        track: player.queue.current,
        volume: player.volume, // Added volume
        position: player.position,
        duration: player.queue.current.duration
    });
});

module.exports = api;
