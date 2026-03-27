import { createClient, Client } from 'bedrock-protocol';
import CONFIG from "../config.json" assert {type: 'json'};

const getFormattedTime = () => {
	const now = new Date();
	const hh = String(now.getHours()).padStart(2, '0');
	const mm = String(now.getMinutes()).padStart(2, '0');
	const ss = String(now.getSeconds()).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const mo = String(now.getMonth() + 1).padStart(2, '0');
	const yyyy = now.getFullYear();
	return `[${hh}:${mm}:${ss} ${dd}/${mo}/${yyyy}]`;
};

const originalLog = console.log;
console.log = (...args) => originalLog(`${getFormattedTime()}`, ...args);

const originalError = console.error;
console.error = (...args) => originalError(`${getFormattedTime()}`, ...args);

let loop: NodeJS.Timeout;
let client: Client | undefined;
let isReconnecting = false;
let retryDelay = 5000;

const disconnect = (): void => {
	clearInterval(loop);
	if (client) {
		try { client.close(); } catch (_) { }
	}
};

const reconnect = (): void => {
	if (isReconnecting) return;
	isReconnecting = true;
	console.log(`Trying to reconnect in ${retryDelay / 1000} seconds...\n`);

	disconnect();
	setTimeout(() => {
		isReconnecting = false;
		createBot();
	}, retryDelay);
};

const createBot = (): void => {
	client = createClient({
		host: CONFIG.client.host,
		port: +CONFIG.client.port,
		username: CONFIG.client.username,
		offline: true
	});

	client.on('error', (error: any) => {
		console.error(`AFKBot got an error:`, error);
	});

	client.on('disconnect', (packet: any) => {
		console.error(`\n\nAFKbot is disconnected:`, packet);
		reconnect();
	});

	client.on('close', () => {
		console.log("Connection closed.");
		reconnect();
	});

	client.on('spawn', () => {
		console.log(`AFKBot spawned in as ${CONFIG.client.username}\n\n`);
		console.log(`Bot is connected and idling...`);

		// Wave action every 3 seconds
		loop = setInterval(() => {
			if (!client) return;
			try {
				if (typeof client.entityId !== 'undefined') {
					client.write('animate', {
						action_id: 1, // swing arm
						runtime_entity_id: client.entityId
					});
				}
			} catch (_) { }
		}, 3000);
	});

	client.on('join', () => {
		console.log(`AFKBot joined the server!\n\n`);
	});
};

export default (): void => {
	createBot();
};