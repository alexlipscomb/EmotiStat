import archiver from 'archiver';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildEmoji } from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import pThrottle from 'p-throttle';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('save')
    .setDescription('Saves the emotes on the server to a .zip');

export async function execute(interaction: CommandInteraction): Promise<void> {
    const { guild } = interaction;

    if (guild === undefined) {
        await interaction.reply('You must be in a server to use this command!');
        return;
    }

    const emojiManager = guild?.emojis;
    const emojis = await emojiManager?.fetch();

    if (emojis === undefined) {
        await interaction.reply('No emojis found!');
    }

    await interaction.reply(`Saving ${emojis?.size} emojis...`);

    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);

    const serverPath = path.join(dirname, '..', guild!.id, 'emojis/');
    await fs.promises.mkdir(serverPath, { recursive: true });

    const throttle = pThrottle({
        limit: 1,
        interval: 100,
    });

    const throttled = throttle(async (emoji: GuildEmoji) => {
        const { name, url, id } = emoji;

        logger.debug(`Saving: ${name}-${id}-${url.split('.').pop()}`);
        const emojiFilename = `${name}-${id}-${url.split('.').pop()}`;

        const res = await fetch(url);

        const emojiPath = path.join(serverPath, emojiFilename);
        res.body?.pipe(fs.createWriteStream(emojiPath));

        return emojiPath;
    });

    await Promise.all(
        emojis!.map((emoji) => throttled(emoji)),
    );

    const archiveOutput = fs.createWriteStream(path.join(serverPath, 'emoji.zip'));
    const archive = archiver('zip', {
        zlib: { level: 9 },
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(archiveOutput);

    archive.directory(serverPath, false);

    await archive.finalize();

    await interaction.editReply({
        content: `Saved ${emojis!.size} emojis! Download the zip below:`,
        files: [{
            attachment: path.join(serverPath, 'emoji.zip'),
            name: 'emoji.zip',
        }],
    });
}
