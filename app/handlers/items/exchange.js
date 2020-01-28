
var allowedToModify = function(universe, event) {
	if(event.player.master) {
		return true;
	}
	
	


	return false;
};

var ownsSource = function(parameters) {
	return new Promise(function(done, fail) {
		if(parameters.event.player.master) {
			done(parameters);
		} else if(parameters.event.player.id === parameters.source.owner || (parameters.source.owners && parameters.source.owners.indexOf(parameters.event.player.id) !== -1) && parameters.source.item.indexOf(parameters.event.data.item) !== -1) {
			done(parameters);
		} else {
			fail({
				"message": "Event player does not have sufficent rights on source for giving an item",
				"source": parameters.source,
				"event": parameters.event
			});
		}
	});
};

// universe, event, source
var takeItem = function(parameters) {
	return new Promise(function(done, fail) {
		var index = parameters.source.item.indexOf(parameters.event.data.item);
		if(index !== -1 && parameters.source._type) {
			parameters.source.item.splice(index, 1);
			parameters.universe.collections[parameters.source._type].updateOne({"id":parameters.source.id}, {"$set":{"item": parameters.source.item}})
			.then(function() {
				notify = {};
				notify.modification = {"item": parameters.source.item};
				notify.type = parameters.source._type;
				notify.time = Date.now();
				notify.id = parameters.source.id;
//				parameters.universe.emit("entity:item:loss", {
//					"item": parameters.event.data.item,
//					"entity": parameters.source.id
//				});
				parameters.universe.emit("model:modified", notify);
				console.log("Taken: ", parameters.event.data.item, parameters.source);
				done(parameters);
			})
			.catch(fail);
		} else {
			fail({
				"message": "Unable to take item due to insufficent information or missing item",
				"target": parameters.source,
				"event": parameters.event,
				"index": index
			});
		}
	});
};

//universe, event, receiving
var giveItem = function(parameters) {
	return new Promise(function(done, fail) {
		parameters.receiving.item.push(parameters.event.data.item);
		parameters.universe.collections[parameters.receiving._type].updateOne({"id":parameters.receiving.id}, {"$set":{"item": parameters.receiving.item}})
		.then(function() {
			notify = {};
			notify.modification = {"item": parameters.receiving.item};
			notify.type = parameters.receiving._type;
			notify.time = Date.now();
			notify.id = parameters.receiving.id;
			parameters.universe.emit("model:modified", notify);
//			parameters.universe.emit("entity:item:gain", {
//				"item": parameters.event.data.item,
//				"entity": parameters.receiving.id
//			});
			console.log("Given: ", parameters.event.data.item, parameters.receiving);
			done();
		})
		.catch(fail);
	});
};



module.exports.give = {
	"events": ["player:give:item"],
	"process": function(universe, event) {
		var source = universe.nouns.inventory[event.data.inventory] || universe.nouns.entity[event.data.source],
			item = universe.nouns.item[event.data.item],
			parameters = {},
			receiving,
			notify;
		
		if(receiving = universe.nouns.entity[event.data.target]) {
			receiving._type = "entity";
		} else if(receiving = universe.nouns.inventory[event.data.target]) {
			receiving._type = "inventory";
		} else if(receiving = universe.nouns.item[event.data.target]) {
			receiving._type = "item";
		}

		if(!(source)) {
			console.log("Requires an entity, item, or inventory to give the item: ", event);
		} else {
			// TODO: Validate source (Entity has it in "item" or inventory has it)
		}

		parameters.universe = universe;
		parameters.receiving = receiving;
		parameters.source = source;
		parameters.event = event;
		
		if(!parameters.receiving.item) {
			parameters.receiving.item = [];
		}
		
		if(source && receiving && !receiving.template && !source.template) {
			if(!parameters.source.item) {
				parameters.source.item = [];
			}
			
			ownsSource(parameters)
			.then(takeItem)
			.then(giveItem)
			.catch(function(fault) {
				console.error("Failed to give item to target: ", event, "\n\n>> Fault:\n", fault);
				universe.emit("error", fault);
			});
			
		} else if(receiving && !receiving.template && event.player.master) {
			if(item.template) {
				// TODO: Add Randomization
				item = JSON.parse(JSON.stringify(item));
				item.source_template = item.id;
				item.id += ":" + Date.now();
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
				receiving.item.push(item.id);
				universe.collections[receiving._type].updateOne({"id":receiving.id}, {"$set":{"item": receiving.item}})
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
			}
		} else {
			console.log("[!] Not Given: ", item, receiving);
		}
		
	}
};

module.exports.take = {
	"events": ["player:take:item"],
	"process": function(universe, event) {
		var item = universe.nouns.item[event.data.item],
			index = -2,
			notify,
			target,
			x;
		
		if(target = universe.nouns.entity[event.data.target]) {
			target._type = "entity";
		} else if(target = universe.nouns.inventory[event.data.target]) {
			target._type = "inventory";
		} else if(target = universe.nouns.item[event.data.target]) {
			target._type = "item";
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
