const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const LoadCommands = require("../util/loadCommands");

/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 */
module.exports = async (client) => {
	client.manager.init(client.user.id);
	client.user.setPresence(client.config.presence);
	client.log("Successfully Logged in as " + client.user.tag);

	// Auto-deploy slash commands on startup
	try {
		client.log("Deploying slash commands...");
		const rest = new REST({ version: "9" }).setToken(client.config.token);
		const commands = await LoadCommands().then((cmds) => {
			return [].concat(cmds.slash).concat(cmds.context);
		});

		const jsonCommands = commands.map(cmd => cmd.toJSON ? cmd.toJSON() : cmd);
		client.log(`Deploying ${jsonCommands.length} commands to Discord...`);

		await rest.put(Routes.applicationCommands(client.config.clientId), {
			body: jsonCommands,
		});

		client.log(`Successfully deployed ${jsonCommands.length} slash commands!`);
	} catch (error) {
		client.error("Failed to deploy slash commands:");
		client.error(error);
	}
};
