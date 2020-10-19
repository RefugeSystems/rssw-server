
module.exports = {
	"events": ["player:data:retrieve"],
	"process": function(universe, event) {
		console.log("Retrieve Data[" + event.player.id + "]: ", event.data.id);
		var noun = universe.nouns[event.data._class];
		if(noun) {
			noun = noun[event.data.id];
		}
		
		if(noun) {
			noun = Object.assign({}, noun);
			if(!event.player.master) {
				delete(noun.master_note);
			}
			
			event.player.send({
				"type": "data:receive",
				"event": noun
			});
		}
	}
};
