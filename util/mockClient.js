const { Client } = require('discord.js');

class MockClient {
    constructor() {
        this.user = { username: "VibeMusic (Preview)" };
        this.slashCommands = new Map();
        // Fix: Go up one level to find config.js in root
        this.config = require('../config');
        // Mock manager
        this.manager = {
            players: new Map(), // Empty players
        };
        this.guilds = {
            cache: new Map() // Empty guilds
        }
    }
}

let clientInstance = null;

module.exports = {
    getClient: () => {
        if (!clientInstance) clientInstance = new MockClient();
        return clientInstance;
    }
};
