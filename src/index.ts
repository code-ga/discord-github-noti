import {
  Client,
  TextBasedChannel as DiscordTextBasedChannel,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { Probot } from "probot";

const discordClient = new Client({
  intents: ["Guilds"],
});
discordClient.login(process.env.DISCORD_BOT_TOKEN);
const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  new SlashCommandBuilder()
    .setName("prune")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addNumberOption((o) =>
      o
        .setName("amount")
        .setDescription("number of message you want to delete")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDescription("Delete many message"),
];
discordClient.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;
  switch (i.commandName) {
    case "ping":
      i.reply(`Pong! ${i.client.ws.ping}ms`);
      break;
    case "prune":
      if (!i.channel?.isTextBased()) return;
      if (i.channel.isDMBased()) return;
      const result = await i.channel.bulkDelete(
        i.options.getNumber("amount", true)
      );
      i.reply({
        content: `Deleted ${result.size}`,
        ephemeral: true,
      });
      break;
    default:
      i.reply("unknow command");
  }
});
const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN || "");
export = (app: Probot) => {
  discordClient.on("ready", async (client) => {
    try {
      app.log.info(
        `Started refreshing ${commands.length} application (/) commands.`
      );
      const data = (await rest.put(
        Routes.applicationCommands(client.application.id),
        {
          body: commands,
        }
      )) as any;
      app.log.info(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (err) {
      app.log.info("have the error when push slash command", err);
    }

    app.log.info("Discord Client Ready");
    // config
    const orgsNotiChannelID = {
      sharproject: "1117486053960458331",
    };
    // fetch channel
    const orgsNotiChannel: {
      [key: string]: DiscordTextBasedChannel;
    } = {};
    for (const key in orgsNotiChannelID) {
      const channelID =
        orgsNotiChannelID[key as keyof typeof orgsNotiChannelID];
      const channel = await client.channels.fetch(channelID);
      if (!channel?.isTextBased()) return;
      orgsNotiChannel[key] = channel;
    }
    app.on("issues", async (context) => {
      if (!context.payload.organization) return;
      const sendChannel = orgsNotiChannel[context.payload.organization.login];
      if (!sendChannel) return;
      const embed = new EmbedBuilder()
        .setTitle(
          `[${context.payload.repository.full_name}] issue ${context.payload.action} '${context.payload.issue.title}#${context.payload.issue.number}'`
        )
        .setDescription(context.payload.issue.body)
        .setURL(context.payload.issue.html_url);
      sendChannel.send({
        embeds: [embed],
      });
    });
    app.on("issue_comment", async (context) => {
      if (!context.payload.organization) return;
      const sendChannel = orgsNotiChannel[context.payload.organization.login];
      if (!sendChannel) return;
      const embed = new EmbedBuilder()
        .setTitle(
          `[${context.payload.repository.full_name}] issues comment ${context.payload.action} at '${context.payload.issue.title}#${context.payload.issue.number}'`
        )
        .setDescription(context.payload.comment.body)
        .setURL(context.payload.comment.html_url);
      sendChannel.send({
        embeds: [embed],
      });
    });
    app.on("commit_comment", async (context) => {
      if (!context.payload.organization) return;
      const sendChannel = orgsNotiChannel[context.payload.organization.login];
      if (!sendChannel) return;
      const embed = new EmbedBuilder()
        .setTitle(
          `[${context.payload.repository.full_name}] commit comment ${context.payload.action}`
        )
        .setDescription(`${context.payload.comment.body}`)
        .setURL(context.payload.comment.url);
      sendChannel.send({
        embeds: [embed],
      });
    });
    app.on("push", async (context) => {
      if (!context.payload.organization) return;
      const sendChannel = orgsNotiChannel[context.payload.organization.login];
      if (!context.payload.commits.length) return;
      if (!sendChannel) return;
      const embed = new EmbedBuilder()
        .setTitle(
          `[${context.payload.repository.full_name}] ${context.payload.commits.length} commits pushed by ${context.payload.pusher.name}`
        )
        .setDescription(
          `>>> ref: ${context.payload.ref} \n ${context.payload.commits.map(
            (v) => `[${v.message}](${v.url}) (${v.id})`
          )}`
        )
        .setURL(context.payload.repository.commits_url);
      sendChannel.send({
        embeds: [embed],
      });
    });
    app.on("pull_request", async (context) => {
      if (!context.payload.organization) return;
      const sendChannel = orgsNotiChannel[context.payload.organization.login];
      if (!sendChannel) return;
      const embed = new EmbedBuilder()
        .setTitle(
          `[${context.payload.repository.full_name}] pull request ${context.payload.action} '${context.payload.pull_request.title}#${context.payload.pull_request.number}'`
        )
        .setURL(context.payload.pull_request.html_url)
        .setDescription(context.payload.pull_request.body);
      sendChannel.send({
        embeds: [embed],
      });
    });
  });

  // Thanks for opening this issue!

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
