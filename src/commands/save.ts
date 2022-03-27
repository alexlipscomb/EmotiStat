import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import logger from '../utils/logger.js';

// For future reference:
// emoji.guild.id, emoji.id, emoji.name, emoji.url, emoji.createdAt

export const data = new SlashCommandBuilder()
    .setName('save')
    .setDescription('Saves the emotes on the server to a .zip');

export async function execute(interaction: CommandInteraction): Promise<void> {
    await interaction.reply('Saving...');
    const emojiManager = interaction.guild?.emojis;

    const emojis = await emojiManager?.fetch();
    logger.debug(emojis?.size);

    if (emojis !== undefined) {
        await interaction.editReply(`Saving ${emojis.size} emojis...`);
    } else {
        await interaction.editReply('No emojis found');
    }

    // TODO save as zip file
}
