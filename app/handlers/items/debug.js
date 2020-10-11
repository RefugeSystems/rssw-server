
module.exports = {
	"events": ["player:action:test"],
	"process": function(universe, event) {
		if(universe.locked) {
			return false;
		}

		var origin = universe.nouns.entity[event.data.origin],
			source = universe.nouns.item[event.data.source],
			target = universe.nouns.item[event.data.target],
			notify = {};

		if(origin.item && origin.item.contains(source.id)) {
			source.setData(universe, {
				"test": true
			});
			target.setData(universe, {
				"test": true
			});
		}

		notify.tested = true;
		notify.type = "item";
		notify.echo = event.data.echo;
		notify.time = Date.now();
		notify.id = source.id;
		notify.data = {};
		notify.data.tested = true;
		universe.emit("echo:response", notify);
	}
};
