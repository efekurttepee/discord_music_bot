import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const data = new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restarts the bot (Owner only)');

export async function execute(interaction) {
    // Split by comma and remove any accidental spaces
    const ownerIds = (process.env.OWNER_ID || '').split(',').map(id => id.trim());

    if (!ownerIds.includes(interaction.user.id)) {
        return interaction.reply({ content: '❌ You are not authorized to use this command!', ephemeral: true });
    }

    // Send restart notification
    const reply = await interaction.reply({ content: '🔄 System is restarting...' }).then(msg => msg.fetch());

    // Save restart state to file
    const restartState = {
        channelId: reply.channelId,
        messageId: reply.id
    };

    const filePath = path.join(__dirname, '../restart_state.json');
    fs.writeFileSync(filePath, JSON.stringify(restartState, null, 2));

    // Restart the bot by exiting the process
    // The process manager (like PM2 or Render) will automatically restart it
    setTimeout(() => {
        process.exit(1);
    }, 1000);
}
