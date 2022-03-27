import fs from 'fs';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { clientId, guildId, token } from './config.js';
import logger from './utils/logger';

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

for (let i = 0; i < commandFiles.length; i += 1) {
    const command = require(`./commands/${commandFiles[i]}`);
    logger.info(`Creating command '${command.data.name}'...`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => logger.info('Successfully registered application commands.'))
    .catch(logger.error);
