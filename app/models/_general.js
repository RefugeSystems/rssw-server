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

	setData(universe, data, echo) {
		var notify = {};

		Object.assign(this, data);
		console.log("Updated: ", this);
		universe.collections[this._class || this._type].updateOne({"id":this.id}, {"$set":data})
		.catch(universe.generalError);

		notify.relevant = this.owners || [];
		notify.modification = data;
		notify.type = this._class || this._type;
		notify.time = Date.now();
		notify.id = this.id;
		notify.echo = echo;

		universe.emit("model:modified", notify);
	}

	has
}

module.exports = General;
