/**
 * 
 * @class PlayerHandler
 * @constructor
 * @module Handlers
 */

/**
 * 
 * @method modify
 * @static
 * @param {Universe} universe
 * @param {Object} event
 */
module.exports.modify = function(universe, event) {
	if(event && event.data && event.data.id && (event.player.master || event.player.id === event.data.id)) {
		delete(event.data.echo);
		if(universe.nouns.player[event.data.id]) {
			Object.assign(universe.nouns.player[event.data.id], event.data);
			universe.collections.player.updateOne({"id":event.data.id}, {"$set":event.data});
		} else {
			universe.nouns.player[event.data.id] = new universe.constructor.player(universe, event.data);
			universe.nouns.player[event.data.id].connections = 0;
			universe.nouns.player[event.data.id].leaves = 0;
			universe.nouns.player[event.data.id].last = 0;
			universe.collections.player.insertOne(universe.nouns.player[event.data.id]);
		}
		
		var notify = {};
		notify.time = Date.now();
		notify.modification = event.data;
		notify.id = event.data.id;
		notify.type = event.data._type;
		
		universe.emit("model:modified", notify);
	} else {
		console.log("Unable to create player, no ID found");
	}
};
