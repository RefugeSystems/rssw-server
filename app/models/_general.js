class General {
	constructor(details, loading) {
		Object.assign(this, details);
		if(loading) {
			this._type = loading.type;
		} else {
			console.warn("No Loading Specified");
		}
		if(!this.history) {
			this.history = [];
		}
		if(!this.known_objects) {
			this.known_objects = [];
		}
	}
	
	addHistory(event) {
		this.history.unshift(event);
		this.history.splice(this.maxHistoryLength || 20);
	}
}

module.exports = General;
