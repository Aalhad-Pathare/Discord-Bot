const { isMessageComponentDMInteraction } = require('discord-api-types/utils/v9');
const { Client, Intents, MessageActionRow, MessageButton, DiscordAPIError } = require('discord.js');
const { token } = require('./config.json');
//const { TicTacToe } = require('./databaseObjects');
const { TicTacToe } = require('./databaseObjects.js');
const { REST } = require("@discord.js/rest")
const { Routes } = require("@discord-api-types/v9")
const fs = require("fs")
const{ Player } = require("discord-player")
const LOAD_SLASH = process.argv[2] == "load" 


const client = new Client({ intents: [Intents.FLAGS.GUILDS,
                                      Intents.FLAGS.GUILD_MESSAGES,
                                       "GUILD_VOICE_STATES"] });



/** Music Bot **/

client.slashcommands = new Discord.Collection()
client.player = new Player(client, {
    ytdlOptions: {
        quality: "highestaudio",
        highestWaterMark:  1 << 25
    }
})

let commands = []

const slashFiles = fs.readdirSync("./slash").filter(file => file.endsWith(".js"))
for (const file of slashFiles){
    const slashcmd = require(`./slash/${file}`)
    client.slashcommands.set(slashcmd.data.name, slashcmd)
    if(LOAD_SLASH) commands.push(slashcmd.data.toJSON())
}

if(LOAD_SLASH){
    const rest = new REST({version: "9"}).setToken(token)
    console.log("Deploying slash commands")
    rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: commands})
    .then(() =>{
        console.log("Sucesfully loaded")
        process.exit(0)
    }).catch((err) =>{
        if(err){
            console.log(err)
            process.exit(1)
        }
    })
}
else{
    client.on("ready", () => {
        console.log(`Logged in as ${client.user.tag}`)
    })
    client.on("interactionCreate", (interaction) => {
        async function handleCommand() {
            if (!interaction.isCommand()) return

            const slashcmd = client.slashcommands.get(interaction.commandName)
            if (!slashcmd) interaction.reply("Not a valid slash command")

            await interaction.deferReply()
            await slashcmd.run({ client, interaction })
        }
        handleCommand()
    })
}
                                       
client.login(token);

//console.log("1");
client.once('ready', () => {
    console.log('Ready!');
})

client.on('messageCreate', (message) => {
    if(message.author.id === client.user.id) return;

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

client.on('interactionCreate', async interaction => {
    if(!interaction.isButton()) return;
    if(!interaction.customId.startsWith('tictactoe')) return;

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

client.on('interactionCreate', async interaction => {
    if(!interaction.isCommand()) return;

    const{ commandName } = interaction;

    if( commandName === 'tictactoe'){
        //await interaction.reply('Working!');

        tictactoe_state = [

            [EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY]
        
        ]

        await interaction.reply({content: 'Playing a game of tic-tac-toe', components: makeGrid() })
    }
})

/** **/








