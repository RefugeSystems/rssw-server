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
	}
	
	addHistory(event) {
		this.history.unshift(event);
		this.history.splice(maxHistoryLength);
	}
}

module.exports = General;
