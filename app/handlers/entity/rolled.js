
module.exports = {
	"events": ["player:entity:rolled"],
	"process": function(universe, event) {
		console.log("Rolled Entity: ", event);
		
		universe.emit("entity:rolled", event.data);
	}
};
