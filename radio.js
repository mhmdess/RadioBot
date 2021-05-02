const discord = require('discord.js');
const ytdl = require('ytdl-core');
const { google } = require('googleapis');

const discordBot = new discord.Client();
const utils = require('./lib/utils');

const { discordToken, discordPrefix, youtubeToken } = require('./config.json');

const youtube = google.youtube({
  version: 'v3',
  auth: youtubeToken,
});

discordBot.on('ready', () => {
  try {
    discordBot.user.setActivity(`${discordPrefix}help`, { type: 'LISTENING' });
    utils.log(
      'Discord Bot Startup',
      'info',
      `Logged in as ${discordBot.user.tag}!`
    );
  } catch (error) {
    utils.log('Discord Bot Startup', 'error', error.message);
  }
});

const ytExp = /\?v=(.+)/g;
const queue = [];
let dispatcher = null;
let voiceChannel = null;
let playing = false;
let index = 0;
let connection = null;
let repeat = false;

function playSong(conn, i) {
  return new Promise((resolve, reject) => {
    try {
      if (conn != null && queue[i] != null) {
        const { id } = queue[i];
        const { title } = queue[i];
        discordBot.user.setActivity(title, { type: 'LISTENING' });
        playing = true;
        dispatcher = conn.play(ytdl(id, { filter: 'audioonly' }));
        dispatcher.on('end', () => {
          let j = i + 1;
          if (j >= queue.length) {
            j = 0;
          }
          resolve(j);
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function loop() {
  await playSong(connection, index)
    .then((i) => {
      index = i;
      if (repeat) {
        loop();
      }
    })
    .catch((error) => {
      utils.log('loop', 'error', error.message);
    });
}

discordBot.on('message', async (message) => {
  if (message.author.bot) return;
  let x = '';
  x = message.content.substr(message.content.indexOf(' ') + 1).toLowerCase();
  if (message.content === `${discordPrefix}on`) {
    try {
      if (queue.length > 0) {
        if (!playing) {
          voiceChannel = message.member.voice.channel;
          if (voiceChannel !== null) {
            voiceChannel
              .join()
              .then((channelConnection) => {
                connection = channelConnection;
                loop();
              })
              .catch((error) => {
                utils.log('start', 'error', error.message);
                playing = false;
              });
          } else {
            message.reply('Please join a voice channel to start the Radio');
            playing = false;
          }
        } else {
          message.reply('Radio is already turned on!');
        }
      } else {
        message.reply(
          `No songs found! Please add some songs first using ${discordPrefix}add command.`
        );
      }
    } catch (error) {
      utils.log('start', 'error', error.message);
      playing = false;
    }
    playing = false;
  } else if (
    x !== '' &&
    (message.content.indexOf(`${discordPrefix}add`) === 0 ||
      message.content.indexOf(`${discordPrefix}a`)) === 0
  ) {
    if (x.indexOf('youtu.be/') > 0) {
      x.replace('youtu.be/', 'youtube.com/watch?v=');
    }
    const match = ytExp.exec(x);
    if (match) {
      ytdl.getInfo(x, (error, info) => {
        const song = {
          id: info,
          title: info.title.replace(/\\&(.*?)\\;/g, ''),
        };
        queue.push(song);
        message.reply(`${song.title} added to queue. Index: ${queue.length}`);
        if (error) {
          message.reply('Invalid URL!');
        }
      });
    } else {
      youtube.search.list(
        {
          part: 'snippet',
          type: 'video',
          q: x,
        },
        (error, response) => {
          if (error) {
            utils.log('add', 'error', error.message);
            message.reply('No songs found!');
          }
          if (response) {
            const item = response.data.items[0];
            const song = {
              id: item.id.videoId,
              title: item.snippet.title.replace(/\\&(.*?)\\;/g, ''),
            };
            queue.push(song);
            message.reply(`${song.title} added to queue.`);
          }
        }
      );
    }
  } else if (
    message.content.indexOf(`${discordPrefix}remove`) === 0 ||
    message.content.indexOf(`${discordPrefix}r`) === 0
  ) {
    if (queue[x] != null) {
      const { title } = queue[x];
      queue.splice(x, 1);
      message.reply(`#${x}: ${title} removed from queue.`);
    } else {
      message.reply(`No song found at index: ${x}`);
    }
  } else if (
    x !== '' &&
    (message.content.indexOf(`${discordPrefix}play`) === 0 ||
      message.content.indexOf(`${discordPrefix}p`) === 0)
  ) {
    if (queue[x] != null) {
      if (playing) {
        index = x;
        loop();
      } else {
        message.reply(
          `Radio is still turned off! Start it using ${discordPrefix}start command`
        );
      }
    } else {
      message.reply(`No song found at index: ${x}`);
    }
  } else if (
    message.content.indexOf(`${discordPrefix}next`) === 0 ||
    message.content.indexOf(`${discordPrefix}n`) === 0
  ) {
    if (playing) {
      index += 1;
      if (index >= queue.length) {
        index = 0;
      }
      loop();
    } else {
      message.reply(
        `Radio is still turned off! Start it using ${discordPrefix}start command`
      );
    }
  }
  if (
    x === '' &&
    (message.content.indexOf(`${discordPrefix}prev`) === 0 ||
      message.content.indexOf(`${discordPrefix}p`) === 0)
  ) {
    if (playing) {
      index -= 1;
      if (index < 0) {
        index = queue.length;
      }
      loop();
    } else {
      message.reply(
        `Radio is still turned off! Start it using ${discordPrefix}start command`
      );
    }
  } else if (
    message.content.indexOf(`${discordPrefix}queue`) === 0 ||
    message.content.indexOf(`${discordPrefix}q`) === 0
  ) {
    if (queue.length === 0) {
      message.reply('The queue is empty!');
    } else {
      let msg = '';
      let i = 0;
      queue.forEach((song) => {
        msg += `#${i}: ${song.title}\n`;
        i += 1;
      });
      message.channel.send(msg);
    }
  } else if (
    message.content.indexOf(`${discordPrefix}current`) === 0 ||
    message.content.indexOf(`${discordPrefix}c`) === 0
  ) {
    message.reply(`${queue[index].title} is now playing`);
  } else if (message.content === `${discordPrefix}off`) {
    if (voiceChannel !== null) {
      voiceChannel.leave();
      dispatcher = null;
      voiceChannel = null;
    }
  } else if (
    message.content.indexOf(`${discordPrefix}repeat`) === 0 ||
    message.content.indexOf(`${discordPrefix}t`) === 0
  ) {
    repeat = !repeat;
  }
  if (
    message.content.indexOf(`${discordPrefix}help`) === 0 ||
    message.content.indexOf(`${discordPrefix}h`) === 0
  ) {
    const msg =
      `${discordPrefix}on: turn on the radio` +
      `${discordPrefix}add x or ${discordPrefix}a x: add a song using a link or search by title` +
      `${discordPrefix}remove x or ${discordPrefix}r x: remove a song from the queue at index x` +
      `${discordPrefix}play x or ${discordPrefix}p x: play a song from the queue at index x` +
      `${discordPrefix}next or ${discordPrefix}n: play the next song in the queue` +
      `${discordPrefix}prev or ${discordPrefix}p: play the previous song in the queue` +
      `${discordPrefix}queue or ${discordPrefix}q: show the queue` +
      `${discordPrefix}repeat or ${discordPrefix}t: repeat playing queue` +
      `${discordPrefix}current or ${discordPrefix}c: show currently playing song` +
      `${discordPrefix}off: to turn of the radio`;
    message.channel.send(msg);
  }
});

discordBot.login(discordToken);
