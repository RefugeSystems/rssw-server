class General {
	constructor(details, loading) {
		if(!loading) {
			loading = {};
		}

		Object.assign(this, details);
		this._class = loading.type || details._type || this.constructor.name.toLowerCase();
		this._type = this._class;
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
