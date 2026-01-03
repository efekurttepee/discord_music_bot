const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const getConfig = require("../util/getConfig");
const LoadCommands = require("../util/loadCommands");

(async () => {
	const config = await getConfig();
	const rest = new REST({ version: "9" }).setToken(config.token);
	const commands = await LoadCommands().then((cmds) => {
		return [].concat(cmds.slash).concat(cmds.context);
	});

	console.log(`Loaded ${commands.length} commands`);
	const jsonCommands = commands.map(cmd => cmd.toJSON ? cmd.toJSON() : cmd);
	console.log(`Deploying ${jsonCommands.length} commands to global...`);
	await rest
		.put(Routes.applicationCommands(config.clientId), {
			body: jsonCommands,
		})
		.catch(console.log);
	console.log("Successfully deployed commands!");
})();
