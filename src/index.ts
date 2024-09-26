import { ChannelType, Client, EmbedBuilder, GatewayIntentBits, PermissionFlagsBits, PermissionsBitField, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from "dotenv";
import { DB, User } from './db';

dotenv.config();
const TOKEN = process.env['TOKEN']!
if (TOKEN === undefined) throw new Error("TOKEN not found in your .env file!");
const CLIENT_ID = process.env['CLIENT_ID']!
if (CLIENT_ID === undefined) throw new Error("CLIENT_ID not found in your .env file!");

const db = new DB("db/smelly.db");

const CommandRegisterSmellyChannel = new SlashCommandBuilder()
    .setName("register_smelly_channel")
    .setDescription("Sets the channel as the dedicated smelly channel.")
    .addChannelOption(option =>
        option
            .setName("smelly_channel")
            .setRequired(true)
            .setDescription("The channel to register as the smelly one.")
            .addChannelTypes(ChannelType.GuildVoice))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const CommandListSmellyBoys = new SlashCommandBuilder()
    .setName("list_smelly_boys")
    .setDescription("Lists all the smelly boys who banised to the locker.");

const CommandSetSmellyCount = new SlashCommandBuilder()
    .setName("set_smelly_count")
    .setDescription("Set a user's smelly count.")
    .addUserOption(option =>
        option
            .setName("user")
            .setRequired(true)
            .setDescription("The user to set the count to."))
    .addIntegerOption(option =>
        option
            .setName("count")
            .setRequired(true)
            .setDescription("The specified smelly count."))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const commands = [
    CommandRegisterSmellyChannel,
    CommandListSmellyBoys,
    CommandSetSmellyCount
].map(c => c.toJSON());

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log("Registering slash commands.");
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log("Registered slash commands.");
    } catch (error) {
        console.error(error);
    }
}

function idxToPlace(idx: number): string {
    return [":first_place:", ":second_place:", ":third_place:"][idx] ?? `${idx+1}:`;
}

async function main() {
    await registerCommands();
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}!`);
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === CommandRegisterSmellyChannel.name) {
            await interaction.deferReply({ ephemeral: true });

            const channelId = interaction.options.getChannel("smelly_channel")!.id;
            db.addChannel(channelId);

            await interaction.editReply({ content: `Registered <#${channelId}> as the smelly channel.` });
        }

        if (interaction.commandName === CommandListSmellyBoys.name) {
            await interaction.deferReply();

            const smelly_boys = Object.values(db.data.users).sort((a, b) => b.count - a.count);
            const desc = smelly_boys.reduce((prev, curr, currIdx) => {
                return prev + `${idxToPlace(currIdx)} <@${curr.id}> ${curr.count}\n`;
            }, "") || null;
            const embed = new EmbedBuilder()
                .setTitle("Smelliest boys!")
                .setDescription(desc);

            await interaction.editReply({ embeds: [embed], content: "" });
        }

        if (interaction.commandName === CommandSetSmellyCount.name) {
            await interaction.deferReply({ ephemeral: true });

            const userId = interaction.options.getUser("user", true).id;
            const count = interaction.options.getInteger("count", true);

            const user = db.data.users[userId] ?? { id: userId };
            user.count = count;

            db.addOrUpdateUser(user);

            await interaction.editReply({ content: `Set <@${userId}>'s smelly count to ${count}.`});
        }
    });

    client.on('voiceStateUpdate', async (_, state) => {
        if (state.channelId && db.data.channels.includes(state.channelId)) {
            const user: User | undefined = db.data.users[state.id]
            if (user !== undefined) {
                db.addOrUpdateUser({ id: state.id, count: user.count + 1 })
            } else {
                db.addOrUpdateUser({ id: state.id, count: 1 });
            }
        }
    });

    console.log("Logging in...");
    client.login(TOKEN);
}

(async () => await main())();