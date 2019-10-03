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
		loaded = [],
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
		nouns.player = {};
		for(x=0; x<buffer.length; x++) {
			players[buffer[x].id] = new Player(universe, buffer[x]);
			nouns.player[buffer[x].id] = players[buffer[x].id];
		}
		return collections[models[0].type].find().toArray();
	});
	models.forEach(function(load, i) {
		modeling[load.type] = load;
		loading = loading.then(function(buffer) {
			nouns[load.type] = {};
			for(x=0; x<buffer.length; x++) {
				nouns[load.type][buffer[x].id] = new load.Model(buffer[x]);
				nouns[load.type][buffer[x].id]._type = load.type;
				loaded.push(nouns[load.type][buffer[x].id]);
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
			handler.events.forEach(function(eventType) {
				universe.on(eventType, function(event) {
					try {
						handler.process(universe, event);
					} catch(error) {
						universe.emit("error", {
							"message": "Event handling error",
							"event_type": eventType,
							"time": Date.now(),
							"error": error
						});
					}
				});
			});
		});
	}).catch(function(err) {
		universe.emit("error", {
			"message": err.message || "Unspecified Error",
			"code": "fault:loading",
			"error": err
		});
	});
	
	var allowedToModify = function(event) {
		return event.data && event.type && universe.nouns[event.type] && 
			(event.player.master || // Master
					universe.nouns[event.type][event.id].owner === event.player.id || // Owning Player
					(universe.nouns[event.type][event.id].owners && universe.nouns[event.type][event.id].owners.indexOf(event.player.id) !== -1)); // One of many owners
	};
	
	universe.on("player:model:modify", function(event) {
		if(allowedToModify(event)) {
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
			record._last = Date.now();
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
		var player = players[connection.id];
		if(player) {
			console.log("Connection for " + connection.username, player);
			player.connect(connection);
		} else {
			console.log("Player Doesn't Exist[" + connection.id + "]: ", players[connection.username]);
			closeSocket(connection, configuration.codes.noplayer);
		}
	};
	
	/**
	 * 
	 * @method currentState
	 * @param {Player} [player] The player to which this update is relevant if any
	 * @param {Number} [mark] The timestamp from which the state should be retrieved
	 */
	this.currentState = function(player, mark) {
		mark = mark || 0;
		console.log("Nouns: ", nouns);
		return nouns; // TODO: Finish implementation for pruning
		
		var state;
		if(!player && !mark) {
			return nouns;
		}
	};
};

util.inherits(module.exports, EventEmitter);
