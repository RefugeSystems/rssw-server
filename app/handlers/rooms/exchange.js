
var configuration = require("a-configuration"),
	locked = configuration.settings.dblock || configuration.settings.databaselock || configuration.settings.database_lock || configuration.settings.db_lock,
	changable = !locked;

var allowedToModify = function(universe, event) {
	if(locked) {
		return false;
	}
	
	if(event.player.master) {
		return true;
	}


	return false;
};


module.exports.give = {
	"events": ["player:give:room"],
	"process": function(universe, event) {
		if(locked) {
			return false;
		}
		
		var inventory = universe.nouns.inventory[event.data.inventory],
			entityGiving = universe.nouns.entity[event.data.source],
			room = universe.nouns.room[event.data.room],
			receiving,
			notify;
		
		if(receiving = universe.nouns.entity[event.data.target]) {
			receiving._type = "entity";
		} else if(receiving = universe.nouns.inventory[event.data.target]) {
			receiving._type = "inventory";
		}

		if(!event.player.master && !(entityGiving || inventory)) {
			console.log("Requires an entity or inventory to give the item: ", event);
		} else {
			// TODO: Validate source (Entity has it in "item" or inventory has it)
		}

		if(receiving && !receiving.template && event.player.master) {
			if(room.template) {
				// TODO: Add Randomization
				room = JSON.parse(JSON.stringify(room));
				room.source_template = room.id;
				room.id += ":" + receiving.id + Date.now();
				delete(room.template);
				delete(room._id);
	
				universe.nouns.room[room.id] = room;
				universe.collections.room.insertOne(room)
				.then(function() {
					notify = {};
					notify.modification = room;
					notify.type = "room";
					notify.time = Date.now();
					notify.id = room.id;
					universe.emit("model:modified", notify);
					console.log("Room Created: ", room, receiving);
				})
				.then(function() {
					if(!receiving.room) {
						receiving.room = [];
					}
					receiving.room.push(room.id);
					return universe.collections[receiving._type].updateOne({"id":receiving.id}, {"$set":{"room": receiving.room}});
				})
				.then(function() {
					notify = {};
					notify.modification = {"room": receiving.room};
					notify.type = receiving._type;
					notify.time = Date.now();
					notify.id = receiving.id;
					universe.emit("model:modified", notify);
					console.log("Given: ", room, receiving);
				})
				.catch(universe.generalError);
			} else {
				receiving.room.push(room.id);
				universe.collections[receiving._type].updateOne({"id":receiving.id}, {"$set":{"room": receiving.room}})
				.then(function() {
					notify = {};
					notify.modification = {"room": receiving.room};
					notify.type = receiving._type;
					notify.time = Date.now();
					notify.id = receiving.id;
					universe.emit("model:modified", notify);
					console.log("Given: ", room, receiving);
				})
				.catch(universe.generalError);
			}
		} else {
			console.log("[!] Not Given: ", room, receiving);
		}
		
	}
};

module.exports.take = {
	"events": ["player:take:room"],
	"process": function(universe, event) {
		if(locked) {
			return false;
		}
		
		var room = universe.nouns.room[event.data.room],
			notify = -2,
			target,
			index,
			x;
		
		if(target = universe.nouns.entity[event.data.target]) {
			target._type = "entity";
		} else if(target = universe.nouns.inventory[event.data.target]) {
			target._type = "inventory";
		}

		if(!event.player.master) {
			console.log("Must be master to take: ", event);
		} else {
			// TODO: Validate source (Entity has it in "item" or inventory has it)
		}

		if(target && target.room && room && event.player.master) {
			for(x=0; index === -2 && x<target.room.length; x++) {
				if(target.room[x].id === room.id) {
					index = x;
				}
			}
			
			if(index !== -2) {
				target.room.splice(index, 1);
				universe.collections[target._type].updateOne({"id":target.id}, {"$set":{"room": target.room}})
				.then(function() {
					notify = {};
					notify.modification = {"room": target.room};
					notify.type = target._type;
					notify.time = Date.now();
					notify.id = target.id;
					universe.emit("model:modified", notify);
					console.log("Taken: ", room, target);
				})
				.catch(universe.generalError);
			} else {
				console.log("[!] Not Found to take: ", room, target);
			}
		} else {
			console.log("[!] Not Taken: ", room, target);
		}
		
	}
};
