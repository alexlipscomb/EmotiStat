import archiver from 'archiver';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildEmoji, Permissions } from 'discord.js';
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
    if (!interaction.memberPermissions?.has(Permissions.FLAGS.ADMINISTRATOR)) {
        interaction.reply('You need to be an administrator to use this command.');
        return;
    }

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
        limit: 2,
        interval: 100,
    });

    const throttled = throttle(async (emoji: GuildEmoji): Promise<number> => {
        const { name, url, id } = emoji;

        const emojiFilename = `${name}-${id}-${url.split('.').pop()}`;

        logger.debug(url);

        const res = await fetch(url);

        if (res.status !== 200) {
            logger.warn(`Failed to get HTTP 200 Response: ${name}-${id}-${url.split('.').pop()} RESPONSE: ${res.status}`);
            return 0;
        }

        logger.debug(`Saving: ${name}-${id}-${url.split('.').pop()}`);
        const emojiPath = path.join(serverPath, emojiFilename);

        const dest = fs.createWriteStream(emojiPath);
        dest.on('error', (err) => {
            logger.error(err);
        });

        res.body?.pipe(dest);
        return 1;
    });

    const savedEmotes = await Promise.all(
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

    const numSaved = savedEmotes.reduce((acc, curr) => acc + curr, 0);

    let content = '';

    if (numSaved === emojis!.size) {
        content = 'All emojis were saved successfully!\nDownload the zip below:'; // TODO add list of unsaved emojis
    } else {
        content = `${numSaved} of ${emojis!.size} emojis were saved successfully!\nDownload the zip below:`;
    }

    await interaction.editReply({
        content,
        files: [{
            attachment: path.join(serverPath, 'emoji.zip'),
            name: 'emoji.zip',
        }],
    });
}
