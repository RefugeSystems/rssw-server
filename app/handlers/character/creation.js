
var spaces = new RegExp("\\s");

module.exports = {
	"events": ["player:create:self"],
	"process": function(universe, event) {
		console.log("Create Player Entity: ", event);
		// TODO: Clean Up Data Insertion
		if(event.player.master) {
			// Build NPC
			if(!event.data.id) {
				event.data.id = "entity:npc:" + (event.data.name?event.data.name.replace(spaces, "").toLowerCase():"noname") + ":" + Date.now();
			}
			event.data.owners = [];
			event.data.classification = "character";
			event.player.entity = event.data.id;
			
			universe.collections.entity.insertOne(event.data)
			.then(function() {
				universe.nouns.entity[event.data.id] = event.data;
			})
			.then(function() {
				var notify;

				// Character Updated
				notify = {};
				notify.modification = event.data;
				notify.type = "entity";
				notify.time = Date.now();
				notify.id = event.data.id;
				universe.emit("model:modified", notify);
//				console.log("Notify Character: ", notify);
			})
			.catch(universe.generalError);
			
		} else if(!event.player.entity && event.data.id.indexOf(event.player.id) !== -1 && event.data.id.startsWith("character")) {
			// Build Character
			event.data.owners = [];
			event.data.owners.push(event.player.id);
			event.data.classification = "character";
			event.player.entity = event.data.id;
			
			universe.collections.player.updateOne({"id":event.player.id}, {"$set":{"entity":event.data.id}})
			.then(function() {
				return universe.collections.entity.insertOne(event.data);
			})
			.then(function() {
				universe.nouns.entity[event.data.id] = event.data;
			})
			.then(function() {
				var notify;

				// Character Updated
				notify = {};
				notify.modification = event.data;
				notify.type = "entity";
				notify.time = Date.now();
				notify.id = event.data.id;
				universe.emit("model:modified", notify);
//				console.log("Notify Character: ", notify);
				
				// Player Updated
				notify = {};
				notify.modification = {
					"entity": event.data.id,
					"id": event.player.id,
				};
				notify.type = "player";
				notify.time = Date.now();
				notify.id = event.player.id;
				universe.emit("model:modified", notify);
//				console.log("Notify Player: ", notify);
			})
			.catch(universe.generalError);
		}
	}
};