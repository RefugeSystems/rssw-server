/**
 *
 *
 * @class GameCore
 * @constructor
 * @param {Array} models Objects defining a "type" and "construct" method to create objects based on
 * 		objects
 * @param {Array} [extensions] Array of additional parts to incorporate into the Universe.
 * @param {Object} [configuration] The configuration. Defaults to default a-configuration require.
 * @param {Object} [log] What to use for the log factors. Defaults to console.
 */
module.exports = function(configuration, models, handlers, log) {
	require("./extensions/string.js");
	require("./extensions/array.js");
	var Universe = require("./universe"),
		Storage = require("./storage"), // require("./storage"),
		WebSocket = require("ws"),
		URL = require("url").URL,
		HTTPS = require("https"),
		HTTP = require("http"),
		path = require("path"),
		fs = require("fs"),

		options = {},
		universe,
		handler,
		storage,
		support,
		server,
		log,
		x;

	if(!configuration) {
		configuration = require("a-configuration");
	}
	log = log || configuration.log || console;

	storage = Storage.getConfiguredConnection(configuration.database, configuration);
	if(configuration.database_supporting) {
		support = [];
		for(x=configuration.database_supporting.length - 1; 0 <= x; x--) {
			support.push(Storage.getConfiguredConnection(configuration.database_supporting[x], configuration));
		}
	}

	universe = new Universe(configuration, storage, models, handlers, support);
	universe.on("error", function(event) {
		var data = {};
		data.type = "error";
		data.origin = "universe";
		data.time = new Date();
		data.date = data.time.toISOString();
		data.time = data.time.getTime();
		data.event = event;
		log.error(data);
	});
	universe.on("online", function(event) {
		var data = {};
		data.type = "online";
		data.origin = "universe";
		data.time = new Date();
		data.date = data.time.toISOString();
		data.time = data.time.getTime();
		data.event = event;
		data.port = configuration.server.port;
		log.info(data);
	});
	universe.on("warning", function(event) {
		var data = {};
		data.type = "warning";
		data.origin = "universe";
		data.time = new Date();
		data.date = data.time.toISOString();
		data.time = data.time.getTime();
		data.event = event;
		log.warn(data);
	});

	if(configuration.server.key) {
		options.ca = fs.readFileSync(configuration.server.interm || configuration.server.certificate_authority || configuration.server.certificateAuthority || configuration.server.ca, "utf-8");
		options.cert = fs.readFileSync(configuration.server.certificate || configuration.server.crt || configuration.server.public, "utf-8");
		options.key = fs.readFileSync(configuration.server.privateKey || configuration.server.key || configuration.server.private, "utf-8");
		server = HTTPS.createServer(options);
	} else {
		server = HTTP.createServer();
	}

	options.noServer = true;
	handler = new WebSocket.Server(options);
	// This is essentially an extra bounce, can be moved to a direct Universe connection or at least out of the core server initialization for clarity
	handler.on("connection", function(connection, request) {
		connection.session = request.session;
		connection.request = request;
		connection.host = request.ip;

		if(request.session) {
			connection.username = request.session.username;
			connection.passcode = request.session.passcode;
			connection.name = request.session.name;
			connection.id = request.session.id;
		} else {
			connection.username = request.url.searchParams.get("username");
			connection.passcode = request.url.searchParams.get("passcode");
			connection.name = request.url.searchParams.get("name");
			connection.id= request.url.searchParams.get("id");
		}

		log.info({
			"user": connection.id,
			"username": connection.username,
			"ip": request.connection.remoteAddress,
			"receivedPasscode": !!connection.passcode
		}, "New Connection Received");

//		console.log("Registering Client: ", connection.session);
		if(connection.passcode) {
			connection.passcode = connection.passcode.sha256();
		}
		universe.connectPlayer(connection);
	});

	if(configuration.server.web_root) {
		// __dirname is the app folder for this script, so indexing up one level to get the root where the "standard included" UI folder will be
		if(configuration.server.web_root[0] === "/" || configuration.server.web_root[1] === ":") {
			configuration.server.web_root = path.normalize(configuration.server.web_root);
		} else {
			configuration.server.web_root = path.normalize(__dirname + path.sep + ".." + path.sep + configuration.server.web_root);
		}
	}

	// Implement a simple request server to serve the UI if desired
	// TODO: Update build process to push a new Repo of the Server+UI with this configured in example configurations
	server.on("request", function(request, response) {
		if(configuration.server.redirect) {
			response.setHeader("Location", configuration.server.redirect);
			response.statusMessage = "See UI Site";
			response.statusCode = 301;
			response.end();
		} else if(request.method.toLowerCase() === "get" && configuration.server.web_root && request.url.indexOf("..") === -1) {
			var pathing,
				type;
			if(request.url === "/") {
				pathing = path.normalize(configuration.server.web_root + request.url + "index.html");
			} else {
				pathing = path.normalize(configuration.server.web_root + request.url);
			}

			// TODO: Fold into standard logging at debug level
			console.log("GET[" + request.url + "]: " + pathing);
			if(pathing.startsWith(configuration.server.web_root)) {
				fs.readFile(pathing, function(err, data) {
					if(err) {
						response.statusMessage = "Requested File Not Found";
						response.statusCode = 404;
						response.end();
					} else {
						type = path.extname(pathing);
						if(type) {
							type = type.substring(1);
						}
						switch(type) {
							case "js":
								response.setHeader("Content-Type", "text/javascript");
								break;
							case "json":
								response.setHeader("Content-Type", "application/json");
								break;
							case "htm":
								type = "html";
							case "css":
							case "html":
								response.setHeader("Content-Type", "text/" + type);
								break;
							case "jpg":
								type = "jpeg";
							case "jpeg":
							case "png":
							case "gif":
								response.setHeader("Content-Type", "image/" + type);
								break;
							case "svg":
								response.setHeader("Content-Type", "image/svg+xml");
								break;
							default:
								response.setHeader("Content-Type", "text/plain");
								break;
						}
						response.statusCode = 200;
						response.end(data);
					}
				});
			} else {
				response.statusMessage = "Malformed URL";
				response.statusCode = 400;
				response.end();
			}
		} else {
			response.statusMessage = "Invalid Request Received";
			response.statusCode = 400;
			response.end();
		}
	});

	server.on("upgrade", function(request, socket, head) {
		request.url = new URL("http://self" + request.url);
//		console.log("Upgrade URL: ", request.url);

		if(request.url.pathname === "/connect") {
			request.query = request.url.query; // This doesn't appear to be handled by WS
			request.path = request.url.pathname;

//			console.log("Verifying Client: ", request.query);
			if(configuration.sessions && configuration.sessions.verify) {
				configuration.sessions.verify(request)
				.then(function(session) {
					if(session) {
						log.info({"req": request, "session": session}, "Websocket accepted");
						request.session = session;
						handler.handleUpgrade(request, socket, head, function(ws) {
							handler.emit("connection", ws, request);
						});
					} else {
						log.warn({"req": request}, "Rejected websocket request for lack of session");
						// TODO: Respond nicely
						socket.destroy();
					}
				}).catch(function(error) {
					log.error({"error": error, "stack": error.stack, "req": info.req}, "Failed to find session data for user while verifying websocket client: " + error.message);
					// TODO: Respond nicely
					socket.destroy();
				});
			} else {
				handler.handleUpgrade(request, socket, head, function(ws) {
					handler.emit("connection", ws, request);
				});
			}
		} else {
			socket.destroy();
		}
	});

	server.listen(configuration.server.port);
};

var configuration = require("a-configuration");

configuration._await
.then(function() {
	var utilityHandler = require("./handlers/utility"),
		journalHandler = require("./handlers/journals/update"),
		itemHandler = require("./handlers/items/exchange"),
		roomHandler = require("./handlers/rooms/exchange"),
		characterHandler = require("./handlers/character"),
		masterHandlers = require("./handlers/master"),
		messageHandler,
		playerHandler,
		nounHandler,

		handlers = [],
		models = [];

	utilityHandler.registerNoun("widgetconfiguration", models, handlers);
	utilityHandler.registerNoun("modifierattrs", models, handlers);
	utilityHandler.registerNoun("modifierstats", models, handlers);
	utilityHandler.registerNoun("archetype", models, handlers);
	utilityHandler.registerNoun("condition", models, handlers);
	utilityHandler.registerNoun("datapoint", models, handlers);
	utilityHandler.registerNoun("datausage", models, handlers);
//	utilityHandler.registerNoun("inventory", models, handlers);
	utilityHandler.registerNoun("knowledge", models, handlers);
	utilityHandler.registerNoun("streamurl", models, handlers);
	utilityHandler.registerNoun("itemtype", models, handlers);
//	utilityHandler.registerNoun("loglevel", models, handlers);
	utilityHandler.registerNoun("location", models, handlers);
	utilityHandler.registerNoun("playlist", models, handlers);
	utilityHandler.registerNoun("maneuver", models, handlers);
	utilityHandler.registerNoun("journal", models, handlers);
	utilityHandler.registerNoun("session", models, handlers);
	utilityHandler.registerNoun("setting", models, handlers);
	utilityHandler.registerNoun("ability", models, handlers);
	utilityHandler.registerNoun("dataset", models, handlers);
//	utilityHandler.registerNoun("loadout", models, handlers);
//	utilityHandler.registerNoun("history", models, handlers);
	utilityHandler.registerNoun("effect", models, handlers);
//	utilityHandler.registerNoun("planet", models, handlers);
	utilityHandler.registerNoun("widget", models, handlers);
	utilityHandler.registerNoun("image", models, handlers);
	utilityHandler.registerNoun("skill", models, handlers);
	utilityHandler.registerNoun("note", models, handlers);
	utilityHandler.registerNoun("type", models, handlers);
	utilityHandler.registerNoun("item", models, handlers);
	utilityHandler.registerNoun("race", models, handlers);
	utilityHandler.registerNoun("room", models, handlers);
	utilityHandler.registerNoun("slot", models, handlers);
	utilityHandler.registerNoun("sex", models, handlers);

	handlers.push(characterHandler.create);
	handlers.push(masterHandlers.control);
	handlers.push(journalHandler.update);
	handlers.push(itemHandler.give);
	handlers.push(itemHandler.take);
	handlers.push(roomHandler.give);
	handlers.push(roomHandler.take);

	handlers.push(require("./handlers/entity/rolled"));

	models.push({
		"Model": require("./models/entity.js"),
		"type": "entity"
	});
	models.push({
		"Model": require("./models/party.js"),
		"type": "party"
	});
	models.push({
		"Model": require("./models/event.js"),
		"type": "event"
	});

	new module.exports(configuration, models, handlers);
}).catch(function(err) {
	console.log("Err: ", err);
});
