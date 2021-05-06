const discord = require('discord.js');

const discordBot = new discord.Client();
const { log } = require('./lib/utils');
const {
  play,
  next,
  back,
  remove,
  queue,
  repeat,
  current,
  loop,
  stop,
  help,
} = require('./lib/commands');

const { discordToken, discordPrefix } = require('./config.json');

discordBot.on('ready', () => {
  try {
    discordBot.user.setActivity(`${discordPrefix}help`, { type: 'LISTENING' });
    log('Discord Bot Startup', 'info', `Logged in as ${discordBot.user.tag}!`);
  } catch (error) {
    log('Discord Bot Startup', 'error', error.message);
  }
});

const execute = {
  play,
  next,
  back,
  delete: remove,
  queue,
  repeat,
  current,
  loop,
  stop,
  help,
  p: play,
  n: next,
  b: back,
  d: remove,
  q: queue,
  r: repeat,
  s: stop,
  c: current,
  l: loop,
  h: help,
};

discordBot.on('message', async (message) => {
  if (message.author.bot) return;
  try {
    if (message.content.startsWith(`${discordPrefix}`)) {
      const command = message.content
        .split(' ')[0]
        .replace(discordPrefix, '')
        .toLowerCase();
      const argument = message.content
        .replace(`${discordPrefix}${command}`, '')
        .trim();
      const signal = { bot: discordBot, message, argument };
      if (execute[command]) execute[command](signal);
      log('execute', 'info', `command ${command}`);
    }
  } catch (error) {
    log('message', 'error', error);
  }
});

discordBot.login(discordToken);
