class General {
	constructor(details, loading) {
		this._class = "general";
		Object.assign(this, details);
		if(loading) {
			this._type = loading.type;
		} else {
			this._type = this.constructor.name.toLowerCase();
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
