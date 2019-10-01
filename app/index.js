

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
	var Universe = require("./universe"),
		WebSocket = require("ws"),
		URL = require("url").URL,
		HTTPS = require("https"),
		HTTP = require("http"),
		fs = require("fs"),
	
		options = {},
		universe,
		handler,
		server,
		log;
	
	if(!configuration) {
		configuration = require("a-configuration");
	}
	log = log || configuration.log || console;
	universe = new Universe(configuration, models, handlers);
	universe.on("error", function(event) {
		log.error(event);
	});
	universe.on("online", function(event) {
		log.info(event);
	});
	
	if(configuration.server.key) {
		options.ca = fs.readFileSync(configuration.server.interm || configuration.server.certificateAuthority || configuration.server.ca, "utf-8");
		options.cert = fs.readFileSync(configuration.server.certificate || configuration.server.crt || configuration.server.public, "utf-8");
		options.key = fs.readFileSync(configuration.server.privateKey || configuration.server.key || configuration.server.private, "utf-8");
		server = HTTPS.createServer(options, app);
	} else {
		server = HTTP.createServer();
	}
	
	options.noServer = true;
	handler = new WebSocket.Server(options);
	handler.on("connection", function(connection, request) {
		log.info({
			"user": connection.user,
			"ip": request.ip
		}, "New Connection Received");
		
		connection.session = request.session;
		connection.request = request;
		connection.host = request.ip;
		
		if(request.session) {
			connection.name = request.session.name;
			connection.user = request.session.user;
		} else {
			connection.name = request.url.searchParams.get("name");
			connection.user = request.url.searchParams.get("user");
		}
		
		console.log("Registering Client: ", connection.session);
		universe.connectPlayer(connection);
	});
	
	server.on("upgrade", function(request, socket, head) {
		request.url = new URL("http://self" + request.url);
		console.log("Upgrade URL: ", request.url);
	
		if(request.url.pathname === "/connect") {
			request.query = request.url.query; // This doesn't appear to be handled by WS
			request.path = request.url.pathname;
			
			console.log("Verifying Client: ", request.query);
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
	var handlers = [],
		models = [];
	
	models.push({
		"type": "test",
		"Model": function(details) {
			Object.assign(this, details);
			
			this.update = function(delta) {
				
			};
		}
	});
	
	new module.exports(configuration, models, handlers);
}).catch(function(err) {
	console.log("Err: ", err);
});
