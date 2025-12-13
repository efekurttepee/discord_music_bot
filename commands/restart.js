import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const data = new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Botu yeniden başlat (Sadece sahibi)');

export async function execute(interaction) {
    // Check permissions (Owner only)
    const ownerIds = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).filter(id => id);
    
    if (ownerIds.length > 0 && !ownerIds.includes(interaction.user.id)) {
        return await interaction.reply({ 
            content: '❌ Bu komutu kullanma yetkiniz yok!', 
            ephemeral: true 
        });
    }

    // IMMEDIATELY defer reply to prevent timeout
    await interaction.deferReply();

    try {
        // Edit the deferred reply
        const message = await interaction.editReply({ content: '🔄 Sistem yeniden başlatılıyor...', fetchReply: true });

        // Save restart state to file
        const restartState = {
            channelId: message.channelId,
            messageId: message.id
        };

        const filePath = path.join(__dirname, '../restart_state.json');
        fs.writeFileSync(filePath, JSON.stringify(restartState, null, 2));

        // Restart the bot by exiting the process
        // The process manager (like PM2 or Render) will automatically restart it
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    } catch (error) {
        console.error('Restart command error:', error);
        try {
            await interaction.editReply({ 
                content: `❌ Yeniden başlatma sırasında bir hata oluştu: ${error.message}` 
            });
        } catch (editError) {
            console.error('Failed to edit reply:', editError);
        }
    }
}
