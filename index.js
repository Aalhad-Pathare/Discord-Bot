const { isMessageComponentDMInteraction } = require('discord-api-types/utils/v9');
const { Client, Intents, MessageActionRow, MessageButton, DiscordAPIError } = require('discord.js');
const { prefix, token, clientId, guildId } = require('./config.json');
//const { TicTacToe } = require('./databaseObjects');
const { TicTacToe } = require('./databaseObjects.js');
const { REST } = require("@discordjs/rest")
const ytdl = require('ytdl-core');
//const fs = require("fs")

const Discord = require("discord.js");
const { SpeakingMap } = require('@discordjs/voice');

/** creating client with required intents and logging in with token **/

const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER', 'GUILD_MEMBER'],
                                    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });


client.on('message', async message => {
    if(message.author.bot) return;

    if(message.content === "ping") {
        message.reply("pong");
    }    
})


/* Tic Tac Toe */
let EMPTY = Symbol("empty");
let PLAYER = Symbol("player");
let BOT = Symbol("bot");

let tictactoe_state

function makeGrid(){
    components = []
    for(let row = 0; row < 3; row++){
        actionRow = new MessageActionRow()

        for(let col = 0; col < 3; col++){
            messageButton = new MessageButton()
                .setCustomId('tictactoe_' + row + '_' + col)
                .setLabel(' ')
                .setStyle('SECONDARY')
            actionRow.addComponents(messageButton);
            
            switch(tictactoe_state[row][col]){
                case EMPTY:
                    messageButton.setLabel(' ')
                        .setStyle('SECONDARY')
                    break;
                case PLAYER: 
                    messageButton.setLabel('X')
                        .setStyle('PRIMARY')
                    break;
                case BOT: 
                    messageButton.setLabel('O')
                        .setStyle('DANGER')
                    break;
            }
            
        }

        components.push(actionRow)
    }
    return components
}

function getRandomInt(max){
    return Math.floor(Math.random() * max);
}

function isDraw(){
    for(let row = 0; row < 3; row++){
        for(let col = 0; col < 3; col++){
            if(tictactoe_state[row][col] == EMPTY){
                return false;
            }
        }
    }
    return true;
}

function isGameOver(){
    
    for(let i = 0; i < 3; i++){
        if(tictactoe_state[i][0] == tictactoe_state[i][1] && tictactoe_state[i][1] == tictactoe_state[i][2] && tictactoe_state[i][2] != EMPTY){
            return true;
        }

        if(tictactoe_state[0][i] == tictactoe_state[1][i] && tictactoe_state[1][i] == tictactoe_state[2][i] && tictactoe_state[2][i] != EMPTY){
            return true;
        }
    }

    if(tictactoe_state[1][1] != EMPTY ){
        if(
           (tictactoe_state[0][0] == tictactoe_state[1][1] && tictactoe_state[1][1] == tictactoe_state[2][2]) ||
           (tictactoe_state[2][0] == tictactoe_state[1][1] && tictactoe_state[1][1] == tictactoe_state[0][2])
           ){
            return true;
        }
    }
    
    return false;
    
}

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isButton()) return;
    if(!interaction.customId === 'tictactoe') return;

    if(isGameOver()){
        interaction.update({
            components: makeGrid()
        })
        return;
    }


    let parsedFields = interaction.customId.split("_")
    let row = parsedFields[1]
    let col = parsedFields[2]

    if(tictactoe_state[row][col] != EMPTY){
        interaction.update({
            content: "You cannot select that position",
            components: makeGrid()
        })
    }

    tictactoe_state[row][col] = PLAYER;
    
    

    if(isGameOver()){
        let user = await TicTacToe.findOne({
            where: {
                user_id: interaction.user.id
            }
        });
        if(!user){
            user = await TicTacToe.create({ user_id: interaction.user.id});
        }

        await user.increment('score');

        interaction.update({
            content: "You won the game! You have now won " + (user.get('score') + 1) + " time(s)!",
            components: []
        })
        return;
    }

    if(isDraw()){
        interaction.update({
            content: "The game is over with a draw!",
            components: []
        })

        return;
    }

    
    /* Bot Function */

    let botRow    
    let botCol
    do{
        
        botRow = getRandomInt(3)
        botCol = getRandomInt(3)
    }while(tictactoe_state[botRow][botCol] != EMPTY)

    tictactoe_state[botRow][botCol] = BOT;
    
    

    if(isGameOver()){
        interaction.update({
            content: "You lost the game :(",
            components: makeGrid()
        })
        return;
    }

    if(isDraw()){
        interaction.update({
            content: "The game is over with a draw!",
            components: []
        })
        return;
    }

    interaction.update({
        components: makeGrid()
    })

    
})

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isCommand()) return;

    const{ commandName, options } = interaction;

    interaction.reply("Launching a comand");

    if( commandName === 'tictactoe'){
        //await interaction.reply('Working!');
        interaction.reply("Launching the tictactoe game");
        await interaction.deferReply();

        tictactoe_state = [

            [EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY]
        
        ]

        await interaction.reply({content: 'Playing a game of tic-tac-toe', components: makeGrid() })
    }
})





/** Music Bot **/


                                       


//console.log("1");
client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting')
});
client.once('disconnect', () => {
    console.log('Disconnected');
});



const queue = new Map();

async function execute(message, serverQueue) {
    const args = message.content.split(" ");
  
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send(
        "You need to be in a voice channel to play music!"
      );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
        "I need the permissions to join and speak in your voice channel!"
      );
    }
  
    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
     };
  
    if (!serverQueue) {
      const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true
      };
  
      queue.set(message.guild.id, queueContruct);
  
      queueContruct.songs.push(song);
  
      try {
        var connection = await voiceChannel.join();
        queueContruct.connection = connection;
        play(message.guild, queueContruct.songs[0]);
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      return message.channel.send(`${song.title} has been added to the queue!`);
    }
  }
function skip(message, serverQueue){
    if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to stop the music`);
    if(!serverQueue) return message.channel.send("There is no song that I could skip!");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue){
    if(!message.member.voice.channel) return message.channel.send("You have to be in a voice channel to stop the music!");
    if(!serverQueue) return message.channel.send("There is no song that I could stop!");
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
  
    const dispatcher = serverQueue.connection
      .play(ytdl(song.url))
      .on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      })
      .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
  }

client.on('message', async message =>{
    if(message.author.bot) return;

    if(!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if(message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)){
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)){
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}help`)){
        message.channel.send("!play <name> to play a song");
        message.channel.send("!skip to skip the song in queue");
        message.channel.send("!stop to stop the bot");
        
    } else {
        message.channel.send("Please enter a valid command! Type in !help for help");
    }
})


client.login(token);
/** **/






