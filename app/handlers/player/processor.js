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
			universe.nouns.player[event.data.id] = event.data;
			universe.nouns.player[event.data.id].connections = 0;
			universe.nouns.player[event.data.id].leaves = 0;
			universe.nouns.player[event.data.id].last = 0;
			universe.collections.player.insertOne(universe.nouns.player[event.data.id]);
		}
		universe.emit("model:modified", {
			"data": universe.nouns.player[event.data.id],
			"emitted": Date.now(),
			"echo": event.echo
		});
	} else {
		console.log("Unable to create player, no ID found");
	}
};
