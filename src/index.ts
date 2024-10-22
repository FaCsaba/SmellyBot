import { ApplicationCommandType, ChannelType, Client, ContextMenuCommandBuilder, EmbedBuilder, Events, GatewayIntentBits, InteractionContextType, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from "dotenv";
import { DB } from './db';

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

const CommandRegisterShowerChannel = new SlashCommandBuilder()
    .setName("register_shower_channel")
    .setDescription("Sets the channel that shall wash the sins of those stepping inside.")
    .addChannelOption(option =>
        option
            .setName("shower_channel")
            .setRequired(true)
            .setDescription("The channel that shall cleanse the wicked of sins told by the smelly channel.")
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

const CommandPasswords = new SlashCommandBuilder()
    .setName("passwords")
    .setDescription("Get a list of registered passwords");

const CommandRegisterPassword = new ContextMenuCommandBuilder()
    .setName("register_password")
    .setType(ApplicationCommandType.Message)
    .setContexts(InteractionContextType.Guild);

const CommandRemovePassword = new ContextMenuCommandBuilder()
    .setName("remove_password")
    .setType(ApplicationCommandType.Message)
    .setContexts(InteractionContextType.Guild);

const commands = [
    CommandRegisterSmellyChannel,
    CommandRegisterShowerChannel,
    CommandListSmellyBoys,
    CommandSetSmellyCount,
    CommandPasswords,
    CommandRegisterPassword,
    CommandRemovePassword,
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
    return [":first_place:", ":second_place:", ":third_place:"][idx] ?? `${idx + 1}:`;
}

async function main() {
    await registerCommands();
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}!`);
    });

    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isMessageContextMenuCommand()) {
            if (interaction.commandName === CommandRegisterPassword.name) {
                await interaction.deferReply();

                const password = interaction.targetMessage.content;
                const messageId = interaction.targetMessage.id;
                const userId = interaction.targetMessage.author.id;

                db.addPassword(userId, messageId, password);

                await interaction.editReply({ content: `Registered new password: \`${password}\`.` });
            } else if (interaction.commandName === CommandRemovePassword.name) {
                await interaction.deferReply();

                const password = interaction.targetMessage.content;
                const messageId = interaction.targetMessage.id;
                db.removePassword(messageId);

                await interaction.editReply({ content: `Removed \`${password}\` from password list.` });
            }
        } else if (interaction.isChatInputCommand()) {
            if (interaction.commandName === CommandRegisterSmellyChannel.name) {
                await interaction.deferReply({ ephemeral: true });

                const channelId = interaction.options.getChannel("smelly_channel")!.id;
                db.addChannel(channelId);

                await interaction.editReply({ content: `Registered <#${channelId}> as the smelly channel.` });
            }

            if (interaction.commandName === CommandRegisterShowerChannel.name) {
                await interaction.deferReply({ ephemeral: true });

                const channelId = interaction.options.getChannel("shower_channel")!.id;
                db.addShowerChannel(channelId);

                await interaction.editReply({ content: `Registered <#${channelId}> as the shower channel.` });
            }

            if (interaction.commandName === CommandListSmellyBoys.name) {
                await interaction.deferReply();

                const smelly_boys = Object.values(db.data.users).filter(user => user.count > 0).sort((a, b) => b.count - a.count);
                const desc = smelly_boys.reduce((prev, curr, currIdx) => {
                    return prev + `${idxToPlace(currIdx)} <@!${curr.id}> ${curr.count}\n`;
                }, "") || "No smelly boys yet!";
                const embed = new EmbedBuilder()
                    .setTitle("Smelliest boys!")
                    .setDescription(desc);

                await interaction.editReply({ embeds: [embed], content: "" });
            }

            if (interaction.commandName === CommandSetSmellyCount.name) {
                await interaction.deferReply({ ephemeral: true });

                const userId = interaction.options.getUser("user", true).id;
                const count = interaction.options.getInteger("count", true);

                const user = db.data.users[userId] ?? { id: userId, count: 0 };
                user.count = count;

                db.addOrUpdateUser(user);

                await interaction.editReply({ content: `Set <@!${userId}>'s smelly count to ${count}.` });
            }

            if (interaction.commandName === CommandPasswords.name) {
                await interaction.deferReply();

                let description = db.data.passwords.reduce((prev, curr, currIdx) => {
                    return prev + `${currIdx + 1} <@!${curr.userId}>: ${curr.password}\n`;
                }, "") || "No passwords yet!";

                if (db.data.passwords.length > 0) {
                    const userToPasswordCount = db.data.passwords.reduce((prev: Record<string, number>, curr) => {
                        prev[curr.userId] = (prev[curr.userId] ?? 0) + 1;
                        return prev;
                    }, {});
                    const userToPasswordCountArray = Object.entries(userToPasswordCount);
                    const [userId, count] = userToPasswordCountArray.reduce(([userId1, count1], [userId2, count2]) => {
                        if (count1 > count2) return [userId1, count1];
                        return [userId2, count2];
                    }, userToPasswordCountArray[0]!);
                    description += `\nMost passwords by: <@!${userId}>, they made ${count} passwords.`;
                }
                const embed = new EmbedBuilder()
                    .setTitle("Passwords:")
                    .setDescription(description);

                await interaction.editReply({ embeds: [embed], content: "" });
            }
        }
    });

    client.on(Events.VoiceStateUpdate, async (_, state) => {
        if (!state.channelId) return;

        if (db.data.channels.includes(state.channelId)) {
            const user = db.data.users[state.id]
            if (user !== undefined) {
                db.addOrUpdateUser({ id: state.id, count: user.count + 1 })
            } else {
                db.addOrUpdateUser({ id: state.id, count: 1 });
            }
        }

        if (db.data.showerChannels.includes(state.channelId)) {
            const user = db.data.users[state.id];
            if (user !== undefined) {
                const count = user.count - 1;
                if (count < 0) return;
                db.addOrUpdateUser({ id: state.id, count });
            } else {
                db.addOrUpdateUser({ id: state.id, count: 0 });
            }
        }
    });

    console.log("Logging in...");
    client.login(TOKEN);
}

(async () => await main())();