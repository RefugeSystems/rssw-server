
module.exports = {
	"events": ["player:destiny:dark"],
	"process": function(universe, event) {
		if(universe.locked) {
			return false;
		}

		// Get Session
		session = universe.nouns.setting["setting:current:session"];
		if(session) {
			session = universe.nouns.session[session.value];
		}
		if(event.player.master && session && session.destiny_dark > 0) {
			session.setData(universe, {
				"destiny_light": session.destiny_light + 1,
				"destiny_dark": session.destiny_dark - 1
			});
		}
	}
};
