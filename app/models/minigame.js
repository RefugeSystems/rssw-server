var General = require("./_general.js");

class Event extends General {
	constructor(details, loading) {
		super(details, loading);
		this._type = this._class = "minigame";
		Object.assign(this, details);
	}
}

module.exports = Event;
