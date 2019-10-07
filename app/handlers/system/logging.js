
module.exports = function(universe, details) {
	
	
	
	universe.on("player:log", function(event) {
		console.log("Player Log Event: ", event);
	});
};