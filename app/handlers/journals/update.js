
var configuration = require("a-configuration"),
	locked = configuration.settings.dblock || configuration.settings.databaselock || configuration.settings.database_lock || configuration.settings.db_lock,
	changable = !locked;

var allowedToModify = function(universe, event, entry) {
	if(locked) {
		return false;
	}
	
	if(event.player.master) {
		return true;
	}
	
	if(!entry) { // Making New
		return true;
	}
	
	if(!universe.nouns.entity[entry.editor] || !universe.nouns.entity[entry.editor].owners || !universe.nouns.entity[entry.editor].owners.length) {
		return false;
	}
	
	if(universe.nouns.entity[entry.editor].owners.indexOf(event.player.id) !== -1) {
		return true;
	}
		
	return false;
};

module.exports.update = {
	"events": ["player:update:journal"],
	"process": function(universe, event) {
		if(locked) {
			return false;
		}
		
		var entry = universe.nouns[event.data._type][event.data.id],
			data = JSON.parse(JSON.stringify(event.data)),
			operation;

		delete(data.echo);
		delete(data._id);
		console.log("Update: ", event.data, data);
		if(entry) {
			console.log("Entry ID: " + entry.id + ", Editor: " + entry.editor);
		} else {
			console.log("No Entry");
		}
		if(allowedToModify(universe, event, entry)) {
			if(entry && entry.id) {
				Object.assign(entry, event.data);
				operation = universe.collections[event.data._type].updateOne({"id":entry.id}, {"$set":event.data});
			} else {
				if(universe.constructor[event.data._type]) {
					universe.nouns[event.data._type][event.data.id] = new universe.constructor[event.data._type](event.data);
				} else {
					universe.nouns[event.data._type][event.data.id] = JSON.parse(JSON.stringify(event.data));
				}
				console.log("New Entry: ", universe.nouns[event.data._type][event.data.id]);
				operation = universe.collections[event.data._type].insertOne(universe.nouns[event.data._type][event.data.id]);
				entry = universe.nouns[event.data._type][event.data.id];
			}
			
			operation.then(function() {
				universe.emit("model:modified", {
					"id": event.data.id,
					"modification": entry,
					"type": event.data._type,
					"time": Date.now(),
					"echo": event.echo
				})
			})
			.catch(universe.generalError);
		} else {
			console.log("Not allowed to modify");
		}
	}
};