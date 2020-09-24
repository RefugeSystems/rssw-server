
/**
 *
 * @event player:shop:checkout
 * @param {String} shop Entity ID
 * @param {String} customer Entity ID
 * @param {Array | String} checkout Array of Item IDs to purchase from the shop.
 * @param {String} echo
 */

module.exports = {};
module.exports.events = ["player:api:system"];
module.exports.process = function(universe, event) {
	console.log("System API Event: ", event);
	if(event.player.master) {
		var response = {};
		response.echo = event.data.echo;

		if(event.data.collection) {
			universe.collections[event.data.collection].selectAll()
			.then(function(out) {
				console.log("All: ", out);
				response.echo = event.data.echo;
				response.data = out;
				universe.emit("echo:response", response);
			})
			.catch(function(err) {
				console.log("Err: ", err);
			});
		} else if(event.data.collections) {
			var result = [],
				track,
			 	x;

			event.data.collections.forEach(function(name) {
				if(track) {
					track = track.then(function(res) {
						result = result.concat(res);
						if(universe.collections[name]) {
							return universe.collections[name].selectAll();
						} else {
							return [];
						}
					});
				} else {
					track = universe.collections[name].selectAll();
				}
			});
			track.then(function(res) {
				response.data = result.concat(res);
				universe.emit("echo:response", response);
			})
			.catch(function(err) {
				console.log("API Err: ", err);
			});
		} else if(event.data.tracked) {
			response.ids = universe.collections[event.data.tracked].getTracked();
			response.data = out;
			universe.emit("echo:response", response);
		}
	} else {
		console.log("Invalid Event: ", event);
	}
};
