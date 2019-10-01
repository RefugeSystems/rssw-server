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
 * @param {Object} configuration
 * @param {Array} models
 * @param {Array} handlers
 */
module.exports = function(configuration, models, handlers) {
	this.setMaxListeners(200);
	var Player = require("../handlers/player/channel"),
		nouns = this.nouns = {},
		collections = {},
		universe = this,
		modeling = {},
		players = {},
		generalError,
		loading,
		db,
		x;

	generalError = function(exception, message) {
		universe.emit("error", {
			"message": message || "General Error",
			"time": Date.now(),
			"error": exception
		});
	};
	
	db = configuration.mongo.connectDB(configuration.core.database);
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
		modeling[load.type] = load;
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
	}).then(function() {
		handlers.forEach(function(handler) {
			universe.on(handler.event, function(event) {
				try {
					handler.process(universe, event);
				} catch(error) {
					universe.emit("error", {
						"message": "Event handling error",
						"event_type": handler.event,
						"time": Date.now(),
						"error": error
					});
				}
			});
		});
	}).catch(function(err) {
		universe.emit("error", {
			"message": err.message || "Unspecified Error",
			"code": "fault:loading",
			"error": err
		});
	});
	
	universe.on("player:model:modify", function(event) {
		if(event.player.master && event.data && event.type && universe.nouns[event.type]) {
			var record = universe.nouns[event.type][event.id],
				notify = {},
				insert;
			if(!record) {
				record = universe.nouns[event.type][event.id] = {};
				insert = true;
			} else {
				insert = false;
			}
			Object.assign(record, event.data);
			if(insert) {
				collections[event.type].insertOne(record)
				.catch(generalError);
			} else {
				collections[event.type].update({"id":record.id}, {"$set":record})
				.catch(generalError);
			}
			
			notify.relevant = record.owners || [];
			if(record.owner) {
				notify.relevant.push(record.owner);
			}
			notify.time = Date.now();
			notify.modification = event.data;
			notify.id = event.id;
			notify.type = event.type;
			universe.emit("model:modified", notify);
		}
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
		var state = {};
		
	};
};

util.inherits(module.exports, EventEmitter);
