
var configuration = require("a-configuration"),
	locked = configuration.settings.dblock || configuration.settings.databaselock || configuration.settings.database_lock || configuration.settings.db_lock,
	changable = !locked;

var allowedToModify = function(universe, event) {
	if(locked) {
		return false;
	}
	
	if(event.player.master) {
		return true;
	}

	return false;
};

module.exports = {
	"events": ["player:control"],
	"process": function(universe, event) {
		console.log("Control Event: ", event);
		if(event.player.master) {
			universe.emit("control", event);
		} else {
			console.log("[!] Not Given: ", item, receiving);
		}
	}
};
