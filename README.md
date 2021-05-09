# RadioBot

🤖 A music discord bot

* This project is still under development

## Install node.js
### On Ubuntu
- `sudo apt install nodejs npm`
### On Windows
- Download and install the latest stable version from https://nodejs.org/en/
## Install ffmpeg
### On Ubuntu
- `sudo apt-get install ffmpeg`
### On Windows
- Download ffmpeg 64-bit build from http://ffmpeg.zeranoe.com/builds/
- Unzip it and add its dirctory `[path]ffmpeg\bin` to the Path variable in the System Environment Variables
## Config
* token: discord token
* prefix: discord prefix
* youtubeToken: youtube token to search and get video links
## Commands
* -play x or -p x: play a song using YouTube title/link, add songs to the queue
* -next or -n: play the next song in the queue
* -back or -b: play the previous song in the queue
* -stop or -s: stop playing song
* -delete x or -d x: remove a song from the queue at index x
* -queue or -q: show the queue
* -repeat or -r: repeat currently playing song
* -loop or -l: repeat the whole queue
* -current or -c: show currently playing song
## Running the bot
`node radio.js`
