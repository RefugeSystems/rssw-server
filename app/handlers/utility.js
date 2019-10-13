
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
	return event && event.data && event.type && universe.nouns[event.type] && 
		(event.player.master || // Master
				universe.nouns[event.type][event.id].owner === event.player.id || // Owning Player
				(universe.nouns[event.type][event.id].owners && universe.nouns[event.type][event.id].owners.indexOf(event.player.id) !== -1)); // One of many owners
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
				universe.collections[noun].updateOne({"id":event.data.id}, {"$set":event.data});
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
		var model = event.data;
		
		var record = universe.nouns[model._type][model.id],
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
		delete(record.echo);
		delete(record._id);
		if(insert) {
			universe.collections[model._type].insertOne(record)
			.catch(universe.generalError);
		} else {
			universe.collections[model._type].updateOne({"id":record.id}, {"$set":record})
			.catch(universe.generalError);
		}
		
		notify.relevant = record.owners || [];
		if(record.owner) {
			notify.relevant.push(record.owner);
		}
		notify.time = Date.now();
		notify.modification = model;
		notify.id = model.id;
		notify.type = model._type;
		
		universe.emit("model:modified", notify);
	} else {
		console.log("Not allowed to modify: " + JSON.stringify(event, null, 4));
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
};


var GeneralConstructor = function(details) {
	Object.assign(this, details);
};