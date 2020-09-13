var General = require("./_general.js");

class Party extends General {
	constructor(details, loading) {
		super(details, loading);
		this._class = "party";
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
		
		if(this.entity && this.entity.length) {
			buffer = {};
			for(x=0; x<this.entity.length; x++) {
				if(buffer[this.entity[x]]) {
					this.entity.splice(x--);
				} else {
					buffer[this.entity[x]] = true;
				}
			}
		}
	}
}

module.exports = Party;
