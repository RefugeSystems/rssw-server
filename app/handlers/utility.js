
/**
 * 
 * @class NounUtilities
 * @constructor
 * @module Handlers
 */

/**
 * 
 * @method generalPermission
 * @static
 */
module.exports.generalPermission = function(event) {
	return event && event.data && event.data.id && (event.player.master || event.player.id === event.data.id);
};


var allowedToModify = function(universe, event) {
	if(event.player.master) {
		return true;
	}
	
	if(event && event.data && event.type && event.data && event.data.id && event.data._type) {
		var noun = universe.nouns[event.data._type][event.data.id];
		if(noun) {
			return noun.publicModification || noun.owner === event.player.id || (noun.owners && noun.owners.indexOf(event.player.id) !== -1);
		} else {
			return false;
		}
	} else {
		console.log("Missing information for data modification");
		return false;
	}
};

/**
 * 
 * @method modifyHandler
 * @deprecated
 * @static
 * @param {String} noun
 */
module.exports.modifyHandler = function(noun) {
	return function(universe, event) {
		if(module.exports.generalPermission(event)) {
			delete(event.data.echo);
			
			if(!universe.nouns[noun]) {
				universe.nouns[noun] = {};
			}
			
			if(universe.nouns[noun][event.data.id]) {
				Object.assign(universe.nouns[noun][event.data.id], event.data);
				universe.collections[noun].updateOne({"id":event.data.id}, {"$set":event.data})
				.then(function(res) {
					console.log("Update Res: ", res);
					if(res.matchedCount === 0) {
						universe.collections[noun].insertOne(universe.nouns[noun][event.data.id]);
					}
				})
			} else {
				if(universe.constructor[noun]) {
					universe.nouns[noun][event.data.id] = new universe.constructor[noun](universe, event.data);
				} else {
					universe.nouns[noun][event.data.id] = JSON.parse(JSON.stringify(event.data));
				}
				universe.collections[noun].insertOne(universe.nouns[noun][event.data.id]);
			}
			universe.emit("model:modified", {
				"data": universe.nouns[noun][event.data.id],
				"emitted": Date.now(),
				"echo": event.echo
			});
		} else {
			console.log("Unable to create player, no ID found");
		}
	};
};


/**
 * 
 * @method modifyProcessor
 * @static
 * @param {Universe} universe
 * @param {Object} event
 */
module.exports.modifyProcessor = function(universe, event) {
	if(allowedToModify(universe, event)) {
		var model = event.data,
			record = universe.nouns[model._type][model.id],
			notify = {},
			insert;
		
		if(!record) {
			record = universe.nouns[model._type][model.id] = {};
			insert = true;
		} else {
			insert = false;
		}
		Object.assign(record, model);
		record._last = Date.now();
		delete(record._type);
		delete(record.echo);
		delete(record._id);
		if(insert) {
			universe.collections[model._type].insertOne(record)
			.catch(universe.generalError);
		} else {
			universe.collections[model._type].updateOne({"id":record.id}, {"$set":record})
			.then(function(res) {
				// Create new record for things loaded from below
				if(res.result.nModified === 0) {
					universe.collections[model._type].insertOne(record);
				}
			})
			.catch(universe.generalError);
		}
//		console.log("Modify Record: ", record);
		
		notify.relevant = record.owners || [];
		if(record.owner) {
			notify.relevant.push(record.owner);
		}
		notify.modification = model;
		notify.type = model._type;
		notify.time = Date.now();
		notify.id = model.id;
		
		universe.emit("model:modified", notify);
	} else {
		console.log("Not allowed to modify: " + JSON.stringify(event, null, 4));
	}
};


/**
 * 
 * @method modifyProcessor
 * @static
 * @param {Universe} universe
 * @param {Object} event
 */
module.exports.deleteProcessor = function(universe, event) {
	if(event.player.master) {
		var model = event.data,
			notify = {};
		
		model._removed = Date.now();
		
		universe.collections._trash.insertOne(model)
		.then(function() {
			console.log("Event: ", event);
			delete(universe.nouns[event.data._type][event.data.id]);
			return universe.collections[event.data._type].remove({"id":event.data.id});
		})
		.catch(universe.generalError);
		
		notify.time = Date.now();
		notify.id = model.id;
		notify.type = model._type;
		
		universe.emit("model:deleted", notify);
	} else {
		console.log("Not allowed to delete: " + JSON.stringify(event, null, 4));
	}
};

/**
 * 
 * @method registerNoun
 * @static
 * @param {String} noun
 */
module.exports.registerNoun = function(noun, models, handlers) {
	models.push({
		"Model": GeneralConstructor,
		"type": noun
	});
	handlers.push({
		"process": module.exports.modifyProcessor,
		"events": ["player:modify:" + noun]
	});
	handlers.push({
		"process": module.exports.deleteProcessor,
		"events": ["player:delete:" + noun]
	});
};


var GeneralConstructor = function(details) {
	Object.assign(this, details);
};