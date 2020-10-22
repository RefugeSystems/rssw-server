module.exports = function(universe, event) {
	if(event.player.master) {
		// TODO: Lock universe to finish operations THEN kill (Service handling is responsible for restart)
		process.exit();
	}
};
