var EventEmitter = require("events").EventEmitter,
	Handlers = require("../handlers"),
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
	this.version = configuration.package.version;
	this.setMaxListeners(200);
	
	var LogHandler = require("../handlers/system/logging"),
		Player = require("../handlers/player/channel"),
		constructor = this.constructor = {},
		collections = this.collections = {},
		nouns = this.nouns = {},
		universe = this,
		passcodes = {},
		modeling = {},
		players = {},
		generalError,
		loaded = [],
		support,
		loading,
		db,
		x;
	
	if(configuration.supporting) {
//		console.log("Supported: ", configuration.supporting);
		support = configuration.mongo.connectDB(configuration.supporting.database);
//		console.log("Support: ", support);
	}

	// Standard Handling
	this.loggingHandler = new LogHandler(this);
	constructor.player = Player;
	handlers.push({
		"events": ["player:modify:player"],
		"process": Handlers.player.modify
	});
	
	this.generalError = generalError = function(exception, message) {
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
	collections._trash = db.collection("_trash");
	
	loading = collections.player.find().toArray();
	loading = loading.then(function(buffer) {
		nouns.player = {};
		for(x=0; x<buffer.length; x++) {
			players[buffer[x].id] = new Player(universe, buffer[x]);
			nouns.player[buffer[x].id] = players[buffer[x].id];
			if(buffer[x].passcode) {
				passcodes[buffer[x].id] = buffer[x].passcode;
				delete(buffer[x].passcode);
			}
		}
		return collections[models[0].type].find().toArray();
	});
	models.forEach(function(load, i) {
		constructor[load.type] = load.Model;
		modeling[load.type] = load;

		loading = loading.then(function(buffer) {
			nouns[load.type] = {};
			
			// Underlying Data Bases
			if(support) {
				return new Promise(function(done, fail) {
					var col = support.collection(models[i].type);
					col.find().toArray().then(function(supporting) {
						for(x=0; x<supporting.length; x++) {
							nouns[load.type][supporting[x].id] = new load.Model(supporting[x], load);
							nouns[load.type][supporting[x].id]._type = load.type;
							loaded.push(nouns[load.type][supporting[x].id]);
						}
						done(buffer);
					}).catch(fail);
				});
			} else {
				return buffer;
			}
		}).then(function(buffer) {
			// Main Top-Level Data Base
			for(x=0; x<buffer.length; x++) {
//				if(buffer[x].id === "character:aetherwalker:galvaakglinder") {
//					console.log("Galvak:\n", buffer[x]);
//				}
				nouns[load.type][buffer[x].id] = new load.Model(buffer[x], load);
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
							"event": event,
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
	
	/**
	 * 
	 * 
	 */
	this.connectPlayer = function(connection) {
		if(nouns && nouns.player) {
			var player = nouns.player[connection.id];
//			console.log("Connecting Player: " + connection.id + " -> " + connection.passcode, passcodes);
			if(player) {
				if(!passcodes[player.id] || passcodes[player.id] === connection.passcode) {
					//console.log("Connection for " + connection.username, player);
					player.connect(connection);
				} else {
					console.log("Player Denied[" + connection.id + "]: Passcode Rejected");
					closeSocket(connection, configuration.codes.noplayer);
				}
			} else {
				console.log("Player Doesn't Exist[" + connection.id + "]: ", Object.keys(nouns.player));
				closeSocket(connection, configuration.codes.noplayer);
			}
		} else {
			console.log("Universe Not Ready for Connection[" + connection.id + "]");
			closeSocket(connection, configuration.codes.notready);
		}
	};
	
	this.setPlayerPasscode = function(id, passcode) {
		if(passcode) {
			passcodes[id] = passcode;
		} else {
			delete(passcodes[id]);
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
		//console.log("Nouns: ", nouns);
		return nouns; // TODO: Finish implementation for pruning
		
//		var state;
		if(!player && !mark) {
			return nouns;
		}
	};
};

util.inherits(module.exports, EventEmitter);
