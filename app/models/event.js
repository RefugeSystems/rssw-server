var General = require("./_general.js");

class Event extends General {
	constructor(details, loading) {
		super(details, loading);
		this._type = this._class = "event";
		Object.assign(this, details);
		if(!this.history) {
			this.history = [];
		}
		if(!this.entity) {
			this.entity = [];
		}
		if(!this.state) {
			this.state = {};
		}
	}

	postProcess() {
		var buffer,
			x;

		if(this.involved && this.involved.length) {
			buffer = {};
			for(x=0; x<this.involved.length; x++) {
				if(buffer[this.involved[x]]) {
					this.involved.splice(x--);
				} else {
					buffer[this.involved[x]] = true;
				}
			}
		}
	}
}

module.exports = Event;
