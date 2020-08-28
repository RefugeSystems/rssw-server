var General = require("./_general.js");

class Entity extends General {
	constructor(details, loading) {
		super(details, loading);
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
}

module.exports = Entity;
