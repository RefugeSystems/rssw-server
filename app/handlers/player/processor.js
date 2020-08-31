/**
 * 
 * @class PlayerHandler
 * @constructor
 * @module Handlers
 */

/**
 * Maps player object keys to a boolean to indicate if a player
 * can update that property when they are the account owner.
 * @property modifiable
 * @type Object
 * @private
 */
var modifiable = {};
modifiable.allow_scripting = true;
modifiable.description = true;
modifiable.username = true;
modifiable.passcode = true;
modifiable.email = true;
modifiable.name = true;
modifiable.linked_battlenet = true;
modifiable.linked_steam = true;
modifiable.linked_facebook = true;
modifiable.linked_reddit = true;
modifiable.linked_discord = true;
modifiable.linked_gmail = true;
// To keep lookup keys
modifiable._type = true;
modifiable.id = true;


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
	var keys,
		x;
	
	if(event && event.data && event.data.id) {
		if(!event.player.master) {
			keys = Object.keys(event.data);
			for(x=0; x<keys.length; x++) {
				if(!modifiable[keys[x]]) {
					delete(event.data[keys[x]]);
				}
			}
		}
		
		if(event.player.master || event.player.id === event.data.id) {
			delete(event.data.echo);
	
			if(event.data.passcode) {
				event.data.passcode = event.data.passcode.sha256();
				universe.setPlayerPasscode(event.data.id, event.data.passcode);
			} else {
				universe.setPlayerPasscode(event.data.id, null);
			}
			
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
				delete(universe.nouns.player[event.data.id].passcode);
				delete(event.data.passcode);
			}
			
			var notify = {};
			notify.time = Date.now();
			notify.modification = event.data;
			notify.id = event.data.id;
			notify.type = event.data._type;
			
			universe.emit("model:modified", notify);
		} else {
			universe.emit("error", {
				"message": "Modification Access Violation",
				"time": Date.now(),
				"cause": event
			});
		}
	} else {
		console.log("Unable to create or update player, no ID found");
	}
};
