
var allowedToModify = function(universe, event) {
	if(event.player.master) {
		return true;
	}


	return false;
};


module.exports.give = {
	"events": ["player:give:item"],
	"process": function(universe, event) {
		var inventory = universe.nouns.inventory[event.data.inventory],
			entityGiving = universe.nouns.entity[event.data.source],
			item = universe.nouns.item[event.data.item],
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

		if(receiving && item.template && event.player.master) {
			// TODO: Add Randomization
			item = JSON.parse(JSON.stringify(item));
			item.id += ":" + receiving.id + Date.now();
			item._id = undefined;
			item.template = false;
			delete(item.template);
			delete(item._id);

			universe.nouns.item[item.id] = item;
			universe.collections.item.insertOne(item)
			.then(function() {
				notify = {};
				notify.modification = item;
				notify.type = "item";
				notify.time = Date.now();
				notify.id = item.id;
				universe.emit("model:modified", notify);
				console.log("Item Created: ", item, receiving);
			})
			.then(function() {
				if(!receiving.item) {
					receiving.item = [];
				}
				receiving.item.push(item.id);
				return universe.collections[receiving._type].updateOne({"id":receiving.id}, {"$set":{"item": receiving.item}});
			})
			.then(function() {
				notify = {};
				notify.modification = {"item": receiving.item};
				notify.type = receiving._type;
				notify.time = Date.now();
				notify.id = receiving.id;
				universe.emit("model:modified", notify);
				console.log("Given: ", item, receiving);
			})
			.catch(universe.generalError);
		} else {
			console.log("[!] Not Given: ", item, receiving);
		}
		
	}
};

module.exports.take = {
	"events": ["player:take:item"],
	"process": function(universe, event) {
		var item = universe.nouns.item[event.data.item],
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

		if(target && target.item && item && event.player.master) {
			for(x=0; index === -2 && x<target.item.length; x++) {
				if(target.item[x].id === item.id) {
					index = x;
				}
			}
			
			if(index !== -2) {
				target.item.splice(index, 1);
				universe.collections[target._type].updateOne({"id":target.id}, {"$set":{"item": target.item}})
				.then(function() {
					notify = {};
					notify.modification = {"item": target.item};
					notify.type = target._type;
					notify.time = Date.now();
					notify.id = target.id;
					universe.emit("model:modified", notify);
					console.log("Taken: ", item, target);
				})
				.catch(universe.generalError);
			} else {
				console.log("[!] Not Found to take: ", item, target);
			}
		} else {
			console.log("[!] Not Taken: ", item, target);
		}
		
	}
};
