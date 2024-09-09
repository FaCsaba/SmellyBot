import { ChannelType, Client, EmbedBuilder, GatewayIntentBits, PermissionFlagsBits, PermissionsBitField, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from "dotenv";
import { db } from './db';
import { channels, users } from './db/schema';
import { eq, sql } from 'drizzle-orm';

dotenv.config();
const TOKEN = process.env['TOKEN']!
if (TOKEN === undefined) throw new Error("TOKEN not found in your .env file!");
const CLIENT_ID = process.env['CLIENT_ID']!
if (CLIENT_ID === undefined) throw new Error("CLIENT_ID not found in your .env file!");

const CommandRegisterSmellyChannel = new SlashCommandBuilder()
    .setName("register_smelly_channel")
    .setDescription("Sets the channel as the dedicated smelly channel.")
    .addChannelOption(option =>
        option
            .setName("smelly_channel")
            .setRequired(true)
            .setDescription("the channel to register as the smelly one")
            .addChannelTypes(ChannelType.GuildVoice))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const CommandListSmellyBoys = new SlashCommandBuilder()
    .setName("list_smelly_boys")
    .setDescription("Lists all the smelly boys who banised to the locker");

const commands = [
    CommandRegisterSmellyChannel.toJSON(),
    CommandListSmellyBoys.toJSON()
];

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

async function main() {
    await registerCommands();
    let watched_channels = new Set((await db.select().from(channels)).map(ch => ch.id));
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}!`);
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === CommandRegisterSmellyChannel.name) {
            await interaction.deferReply({ ephemeral: true });

            const channelId = interaction.options.getChannel("smelly_channel")!.id;
            await db.insert(channels).values({ id: channelId }).onConflictDoNothing();
            watched_channels.add(channelId);

            await interaction.editReply({ content: `Registered <#${channelId}> as the smelly channel.` });
        }

        if (interaction.commandName === CommandListSmellyBoys.name) {
            await interaction.deferReply();

            const smelly_boys = (await db.select().from(users)).sort((a, b) => b.count - a.count);
            const idxToPlace = (idx: number) => [":first_place:", ":second_place:", "third_place:"][idx] ?? `${idx}:`;
            const desc = smelly_boys.reduce((prev, curr, currIdx) => {
                return prev + `${idxToPlace(currIdx)} <@${curr.id}> ${curr.count}`;
            }, "");
            const embed = new EmbedBuilder()
                .setTitle("Smelliest boys!")
                .setDescription(desc);
            
            await interaction.editReply({ embeds: [embed], content: "" });
        }
    });

    client.on('voiceStateUpdate', async (_, state) => {
        if (state.channelId && watched_channels.has(state.channelId)) {
            await db
                .insert(users)
                .values({ id: state.id, count: 1 })
                .onConflictDoUpdate({
                    target: users.id,
                    set: { count: sql`${users.count} + 1` }
                });
            // await db
            //     .update(users)
            //     .set({
            //         smelly: sql`${users.smelly} + 1`
            //     })
            //     .where(eq(users.id, state.id));
        }
    });

    console.log("Logging in...");
    client.login(TOKEN);
}

(async () => await main())();