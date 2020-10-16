var General = require("./_general.js");

class Entity extends General {
	constructor(details, loading) {
		super(details, loading);
		this._class = "entity";
		this._type = "entity";
		// Object.assign(this, details);
		if(!this.history) {
			this.history = [];
		}
		if(!this.entity) {
			this.entity = [];
		}
		if(!this.item) {
			this.item = [];
		}
		if(!this.effect) {
			this.effect = [];
		}
		if(!this.slot) {
			this.slot = [];
		}
		if(!this.modifierattrs) {
			this.modifierattrs = [];
		}
		if(!this.modifierstats) {
			this.modifierstats = [];
		}
		if(!this.archetype) {
			this.archetype = [];
		}
		if(!this.owners) {
			this.owners = [];
		}
		if(!this.widget) {
			this.widget = [];
		}
		if(!this.known_objects) {
			this.known_objects = [];
		}
		if(!this.knowledge) {
			this.knowledge = [];
		}
		if(!this.ability) {
			this.ability = [];
		}
	}

	ownsItem(universe, id) {
		// TODO: Check item lisit and handle checking contained items
	}

	hasItem(universe, id) {
		// TODO: Check item lisit and handle checking contained items
	}
}

module.exports = Entity;
