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
module.exports = function(configuration, storage, models, handlers, support) {
	this.version = configuration.package.version;
	this.bounds = configuration.bounds;
	this.setMaxListeners(200);

	var LogHandler = require("../handlers/system/logging"),
		Player = require("../handlers/player/channel"),
		constructor = this.constructor = {},
		collections = this.collections = {},
		nouns = this.nouns = {},
		supportLoad = {},
		universe = this,
		passcodes = {},
		modeling = {},
		players = {},
		loaded = [],
		support,
		loading,
		db,
		x;

	if(!configuration.codes) {
		configuration.codes = {};
	}
	if(!configuration.codes.disconnect) {
		configuration.codes.disconnect = "disconnected";
	}
	if(!configuration.codes.noplayer) {
		configuration.codes.noplayer = "noplayer";
	}
	if(!configuration.codes.notready) {
		configuration.codes.notready = "notready";
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

	collections.player = storage.collection("player");
	for(x=0; x<models.length; x++) {
		collections[models[x].type] = storage.collection(models[x].type);
	}
	collections._trash = storage.collection("_trash");

	loading = collections.player.getAll();
	loading = loading.then(function(buffer) {
		nouns.player = {};
		for(x=0; x<buffer.length; x++) {
			if(!players[buffer[x].id]) {
				players[buffer[x].id] = new Player(universe, buffer[x]);
				nouns.player[buffer[x].id] = players[buffer[x].id];
				if(buffer[x].passcode) {
					passcodes[buffer[x].id] = buffer[x].passcode;
					delete(buffer[x].passcode);
				}
			} else {
				universe.emit("warning", {
					"message": "Duplicate Object",
					"time": Date.now(),
					"type": "player",
					"data": buffer[x]
				});
			}
		}
		return collections[models[0].type].getAll();
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
					col.getAll().then(function(supporting) {
						for(x=0; x<supporting.length; x++) {
							if(!nouns[load.type][supporting[x].id]) {
								supportLoad[supporting[x].id] = true;
								nouns[load.type][supporting[x].id] = new load.Model(supporting[x], load);
								nouns[load.type][supporting[x].id]._type = load.type;
								loaded.push(nouns[load.type][supporting[x].id]);
							} else {
								universe.emit("warning", {
									"message": "Duplicate Support Object",
									"time": Date.now(),
									"type": load.type,
									"data": supporting[x]
								});
							}
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
				if(!nouns[load.type][buffer[x].id] || supportLoad[buffer[x].id]) {
					supportLoad[buffer[x].id] = false;
					nouns[load.type][buffer[x].id] = new load.Model(buffer[x], load);
					nouns[load.type][buffer[x].id]._type = load.type;
					loaded.push(nouns[load.type][buffer[x].id]);
				} else {
					universe.emit("warning", {
						"message": "Duplicate Object",
						"time": Date.now(),
						"type": load.type,
						"data": buffer[x]
					});
				}
			}
			i = i + 1;
			if(i < models.length) {
				return collections[models[i].type].getAll();
			}
		});
	});
	loading.then(function() {
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
	}).then(function() {
		universe.emit("online", {
			"time": Date.now()
		});
	}).catch(function(err) {
		universe.emit("error", {
			"message": err.message || "Unspecified Error",
			"code": "fault:loading",
			"error": err
		});
	});

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


	this.disconnectPlayer = function(player, connection) {
		if(player && connection) {
			if(!passcodes[player.id] || passcodes[player.id] === connection.passcode) {
				player.disconnect(connection);
				closeSocket(connection, configuration.codes.disconnect);
			}
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
		// TOFIX: T1
		// TODO T2


//		var state;
		if(!player && !mark) {
			return nouns;
		}
	};
};

util.inherits(module.exports, EventEmitter);
