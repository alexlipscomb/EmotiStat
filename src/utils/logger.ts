import pkg from 'log4js';

const { getLogger } = pkg;

const logger = getLogger();
logger.level = 'debug';

export default logger;
