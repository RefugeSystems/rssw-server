var EventEmitter = require("events").EventEmitter,
	Random = require("rs-random"),
	util = require("util"),
	closeSocket;


closeSocket = function(connection, conf) {
	connection.close(conf.code, conf.reacon);
};

/**
 * Handles the processing of events to sync between different settings.
 * @class Universe
 * @extends EventEmitter
 * @constructor
 * @param {Array} models
 * @param {Object} configuration
 * @param {Array} [extensions]
 */
module.exports = function(models, configuration, extensions) {
	this.setMaxListeners(200);
	var Player = require("../handlers/player/channel"),
		collections = {},
		universe = this,
		players = {},
		nouns = {},
		loading,
		x;

	var db = configuration.mongo.connectDB(configuration.core.database);
	collections.player = db.collection("player");
	for(x=0; x<models.length; x++) {
		collections[models[x].type] = db.collection(models[x].type);
	}
	
	loading = collections.player.find().toArray();
	loading = loading.then(function(buffer) {
		console.log(" - Loading Players");
		for(x=0; x<buffer.length; x++) {
			players[buffer.id] = new Player(universe, buffer[x]);
		}
		return collections[models[0].type].find().toArray();
	});
	models.forEach(function(load, i) {
		loading = loading.then(function(buffer) {
			console.log(" - Loading " + load.type);
			nouns[load.type] = {};
			for(x=0; x<buffer.length; x++) {
				nouns[load.type][buffer[x].id] = new load.Model(buffer[x]);
			}
			i = i + 1;
			if(i < models.length) {
				return collections[models[i].type].find().toArray();
			}
		});
	});
	loading.then(function() {
		universe.emit("online", {
			"time": Date.now()
		});
	});
	loading.catch(function(err) {
		universe.emit("error", {
			"message": err.message || "Unspecified Error",
			"code": "fault:loading",
			"error": err
		});
	});
	
	this.connectPlayer = function(connection) {
		if(players[connection.user]) {
			console.log("Connection for " + connection.user);
			players[connection.user].connect(connection);
		} else {
			console.log("Player Doesn't Exist[" + connection.user + "]: ", players[connection.user]);
			closeSocket(connection, configuration.codes.noplayer);
		}
	};
	
	this.currentState = function(player) {
		console.log("State for Player: " + player.id);
		return {};
	};
};

util.inherits(module.exports, EventEmitter);
