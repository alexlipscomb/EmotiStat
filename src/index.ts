import fs from 'fs';
import { Client, Collection, Intents } from 'discord.js';
import logger from './utils/logger.js';
import { token } from './config.js';

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const eventFiles = fs.readdirSync('./events').filter((file) => file.endsWith('.js'));

for (let i = 0; i < eventFiles.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const event = await import(`./events/${eventFiles[i]}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

for (let i = 0; i < commandFiles.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const command = await import(`./commands/${commandFiles[i]}`);
    client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    logger.info(`${interaction.user.tag} used '${interaction.commandName}' in ${interaction.channel}`);

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(token);
