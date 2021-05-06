const ytdl = require('ytdl-core');
const { google } = require('googleapis');

// eslint-disable-next-line import/no-unresolved
const { discordPrefix, youtubeToken } = require('../config.json');

const youtube = google.youtube({
  version: 'v3',
  auth: youtubeToken,
});

const { log } = require('./utils');

const ytExp = /\?v=(.+)/g;

const queue = [];
let dispatcher = null;
let voiceChannel = null;
let isPlaying = false;
let isReady = false;
let index = 0;
let connection = null;
let repeatIndex = -1;
let loopQueue = false;
let stopped = false;

const playAudio = (signal) => {
  try {
    if (connection != null && queue[index] != null) {
      const { id } = queue[index];
      isPlaying = true;
      dispatcher = connection.play(ytdl(id, { filter: 'audioonly' }));
      dispatcher.on('finish', () => {
        isPlaying = false;
        if (repeatIndex === index) {
          playAudio(signal);
        }
        if (index + 1 >= queue.length) {
          index = 0;
          if (loopQueue) playAudio(signal);
        } else {
          index += 1;
          playAudio(signal);
        }
      });
      dispatcher.on('error', (error) =>
        log('playAudio', 'error', error.message)
      );
    }
  } catch (error) {
    log('playAudio', 'error', error.message);
    isPlaying = false;
  }
};

const addAudio = (signal) => {
  if (signal.argument.includes('youtu.be/')) {
    signal.argument.replace('youtu.be/', 'youtube.com/watch?v=');
  }
  const match = ytExp.exec(signal.argument);
  if (match) {
    ytdl
      .getInfo(signal.argument)
      .then((info) => {
        const song = {
          id: info.videoDetails.videoId,
          title: info.videoDetails.title.replace(/&(.*?);/g, ''),
        };
        queue.push(song);
        if (!isPlaying) playAudio(signal);
        signal.message.reply(`${song.title} added to queue.`);
      })
      .catch((error) => {
        log('ytdl.getInfo', 'error', error.message);
        signal.message.reply('Invalid URL!');
      });
  } else {
    youtube.search.list(
      {
        part: 'snippet',
        type: 'video',
        q: signal.argument,
      },
      (error, response) => {
        if (error) {
          log('add', 'error', error.message);
          signal.message.reply('No songs found!');
        }
        if (response) {
          const item = response.data.items[0];
          const song = {
            id: item.id.videoId,
            title: item.snippet.title.replace(/&(.*?);/g, ''),
          };
          queue.push(song);
          if (!isPlaying) playAudio(signal);
          signal.message.reply(`${song.title} added to queue.`);
        }
      }
    );
  }
};

exports.play = (signal) => {
  try {
    if (isReady && signal.argument) {
      addAudio(signal);
    } else {
      voiceChannel = signal.message.member.voice.channel;
      if (voiceChannel) {
        voiceChannel
          .join()
          .then((channelConnection) => {
            connection = channelConnection;
            isReady = true;
            if (signal.argument) {
              addAudio(signal);
            } else if (stopped) {
              playAudio(signal);
              stopped = false;
            } else {
              signal.message.reply(
                `Please provide the title or link of the song you want to play!`
              );
            }
          })
          .catch((error) => {
            isReady = false;
            log('start', 'error', error.message);
          });
      } else {
        signal.message.reply('Please join a voice channel to start playing!');
      }
    }
  } catch (error) {
    log('play', 'error', error.message);
    isReady = false;
  }
};

exports.remove = (signal) => {
  if (queue[signal.argument] != null) {
    const { title } = queue[signal.argument];
    queue.splice(signal.argument, 1);
    signal.message.reply(`#${signal.argument}: ${title} deleted from queue.`);
  } else {
    signal.message.reply(`No song found at index: ${signal.argument}`);
  }
};

exports.next = (signal) => {
  if (queue.length > 1) {
    index += 1;
    if (index >= queue.length) {
      index = 0;
    }
    playAudio(signal);
  } else {
    signal.message.reply(`You should add more songs to the queue`);
  }
};

exports.back = (signal) => {
  if (queue.length > 1) {
    index -= 1;
    if (index < 0) {
      index = queue.length;
    }
    playAudio(signal);
  } else {
    signal.message.reply(`You should add more songs to the queue`);
  }
};

exports.queue = (signal) => {
  if (queue.length === 0) {
    signal.message.reply('The queue is empty!');
  } else {
    let msg = '';
    let i = 0;
    queue.forEach((song) => {
      msg += `#${i}: ${song.title}\n`;
      i += 1;
    });
    signal.message.channel.send(msg);
  }
};

exports.current = (signal) => {
  signal.message.reply(`${queue[index].title} is now playing`);
};

exports.repeat = (signal) => {
  if (isPlaying && repeatIndex === -1) {
    repeatIndex = index;
    signal.message.reply(`Index #${repeatIndex} is now set to repeat`);
  } else {
    repeatIndex = -1;
    signal.message.reply(`Repeat is now disabled`);
  }
};

exports.loop = (signal) => {
  loopQueue = !loopQueue;
  signal.message.reply(`Loop is now set to ${loopQueue}`);
};

exports.stop = () => {
  try {
    if (dispatcher && voiceChannel) {
      voiceChannel.leave();
      dispatcher = null;
      voiceChannel = null;
      isPlaying = false;
      isReady = false;
      stopped = true;
    }
  } catch (error) {
    log('stopAudio', 'error', error.message);
    isPlaying = false;
  }
};

exports.help = (signal) => {
  const msg =
    `${discordPrefix}play x or ${discordPrefix}p x: play a song using YouTube title/link, add songs to the queue\n` +
    `${discordPrefix}next or ${discordPrefix}n: play the next song in the queue\n` +
    `${discordPrefix}back or ${discordPrefix}b: play the previous song in the queue\n` +
    `${discordPrefix}stop or ${discordPrefix}s: stop playing song\n` +
    `${discordPrefix}delete x or ${discordPrefix}d x: remove a song from the queue at index x\n` +
    `${discordPrefix}queue or ${discordPrefix}q: show the queue\n` +
    `${discordPrefix}repeat or ${discordPrefix}r: repeat currently playing song\n` +
    `${discordPrefix}loop or ${discordPrefix}l: repeat the whole queue\n` +
    `${discordPrefix}current or ${discordPrefix}c: show currently playing song\n`;
  signal.message.channel.send(msg);
};
