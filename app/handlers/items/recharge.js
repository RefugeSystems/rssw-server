
module.exports = {
	"events": ["player:action:recharge"],
	"process": function(universe, event) {
		if(universe.locked) {
			return false;
		}

		// TODO: Check event player owns source & target
		var origin = universe.nouns.entity[event.data.origin] || universe.nouns.item[event.data.origin],
			source = universe.nouns.item[event.data.source],
			target = universe.nouns.item[event.data.target],
			notify = {},
			charges,
			parent;

		if(!origin) {
			console.log("Missing origin");
		}

		if(!source) {
			console.log("Missing source");
		}

		if(!target) {
			console.log("Missing target");
		}

		console.log("?Recharging: " + origin.id + " - " + source.id + "@" + source.charges + " - " + target.id + "@" + target.charged + " | " + origin.item.contains(source.id));
		charges = source.charges;
		if(charges === undefined && source.parent) {
			parent = universe.nouns.item[source.parent];
			if(parent) {
				charges = parent.charges;
			}
		}

		if(origin.item && origin.item.contains(source.id) && !isNaN(charges) && charges>0 && target.charged === false) {
			console.log("!Recharging");
			notify.recharged = true;
			source.setData(universe, {
				"charges": charges - 1
			});
			target.setData(universe, {
				"charged": true
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
