import { Client } from 'discord.js';
import logger from '../utils/logger.js';

export const name = 'ready';
export const once = true;
export function execute(client: Client) {
    logger.info(`Ready! Logged in as ${client.user?.tag}`);
}
