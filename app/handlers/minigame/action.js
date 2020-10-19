var Random = require("rs-random");

module.exports = {
	"events": ["player:minigame:action"],
	"process": function(universe, event) {
		if(universe.locked) {
			return false;
		}

		var actor = universe.nouns.entity[event.data.actor],
			event = universe.nouns.event[event.data.event],
			notify = {},
			parent,
			cards,
			drawn,
			draw;

		if(!origin) {
			console.log("Missing origin");
		}

		if(!source) {
			console.log("Missing source");
		}

		cards = source.item;
		if(cards === undefined && source.parent) {
			parent = universe.nouns.item[source.parent];
			if(parent) {
				cards = parent.item;
			}
		}

		// TODO: Check event player owns source
		console.log("?draw: " + origin.item.contains(source.id) + " |[" + (!!cards) + "]: " + (cards?cards.length:-1));
		if(origin.item && origin.item.contains(source.id) && cards && cards.length) {
			console.log("!draw");
			draw = Random.integer(cards.length);
			drawn = cards[draw];
			cards.splice(draw, 1);
			origin.setData(universe, {
				"item": origin.item.concat(drawn)
			});
			source.setData(universe, {
				"item": cards
			});
		} else {
			notify.recharged = false;
		}

		notify.type = "item";
		notify.echo = event.data.echo;
		notify.time = Date.now();
		notify.id = source.id;
		notify.data = event.data;
		universe.emit("echo:response", notify);
	}
};
