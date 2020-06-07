/**
 * 
 * @class PlayerHandler
 * @constructor
 * @module Handlers
 */

/**
 * 
 * 
 * @event player:modify:player
 * @param {Object} event
 * @param {Object} event.data
 * @param {String} event.data.id
 * @param {Object} event.echo
 * @param {Player} event.player
 */

/**
 * 
 * @method modify
 * @static
 * @param {Universe} universe
 * @param {Object} event
 */
module.exports.modify = function(universe, event) {
	if(event.player.master) {
		if(event && event.data && event.data.id) {
			delete(event.data.echo);
	
			console.log("Inc: " + event.data.id + " -> " + event.data.passcode);
			if(event.data.passcode) {
				event.data.passcode = event.data.passcode.sha256();
				universe.setPlayerPasscode(event.data.id, event.data.passcode);
			} else {
				universe.setPlayerPasscode(event.data.id, null);
			}
			console.log("Res: " + event.data.id + " -> " + event.data.passcode);
			
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
			
			if(event.data.passcode) {
				delete(event.data.passcode);
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
	} else {
		universe.emit("error", {
			"message": "Modification Access Violation",
			"time": Date.now(),
			"cause": event
		});
	}
};
