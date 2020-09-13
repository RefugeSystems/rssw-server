var General = require("./_general.js");

class Event extends General {
	constructor(details, loading) {
		super(details, loading);
		this._class = "event";
		Object.assign(this, details);
		if(loading) {
			this._type = loading.type;
		} else {
			console.warn("No Loading Specified");
		}
		if(!this.history) {
			this.history = [];
		}
		if(!this.entity) {
			this.entity = [];
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
