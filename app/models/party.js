module.exports = function(details, loading) {
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
	
	this.addHistory = function(event) {
		this.history.unshift(event);
		this.history.splice(maxHistoryLength);
	};
};
