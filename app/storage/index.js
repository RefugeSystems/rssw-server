
var EventEmitter = require("events").EventEmitter;

/**
 *
 * @class Storage
 * @extends EventEmitter
 * @constructor
 * @param {Object} settings
 * @param {Configuration} configuration
 */
class Storage extends EventEmitter {
	constructor(settings, configuration) {
		super();
		this._configuration = configuration;
		this._settings = settings;
		this.ready = false;
		this._waiting = [];
		this._errors = [];
		this.setReady = () => {
			this.ready = true;
			this.log.debug(this._waiting.length + " Calls delayed during SQLite Connection initialization");
			for(var x=0; x<this._waiting.length; x++) {
				this._waiting[x]();
			}
			this._waiting.splice(0);
		};
		this.receiveError = (err) => {
			if(err) {
				this._errors.push(err);
			}
		};

		if(!settings) {
			throw new Error("Database:Storage: No settings received during construction");
		}
		if(isNaN(settings.loglevel)) {
			// Leveraging Bunyan default logging levels to align with general file logging
			settings.loglevel = 40; // Defaulting level, Possibilities: Fatal (60), Error (50), Warn (40)
		}
		if(!settings.logboost) {
			// Used to boost the logging from Storage for focusing debugging
			settings.logboost = 0;
		}

		/**
		 *
		 * @method log
		 * @param {Integer} level   [description]
		 * @param {String} message [description]
		 * @param {Object} details [description]
		 */
		this.log = (level, message, details) => {
			if(settings.loglevel <= level) {
				// TODO Remove Console log or respond to configuration.console.enable (or similar flag/setting)
				console.log("Database:" + this.constructor.name + (settings.id?"[" + settings.id + "]":"") + ": " + message);
				if(details) {
					console.log(details);
				}

				if(details) {
					details = JSON.parse(JSON.stringify(details));
				} else {
					details = {};
				}

				details.database_id = settings.id;
				details.level = level + settings.logboost;
				details.message = message;
				this.emit("log:" + level, details);
				this.emit("log", details);
			}
		};

		/**
		 * Debugging this portion would be trace level
		 * @method log.debug
		 * @param {String} message [description]
		 * @param {Object} details [description]
		 */
		this.log.debug = (message, details) => {
			this.log(10, message, details);
		};

		/**
		 * Informational from this section is considered debugging
		 * @method log.info
		 * @param {String} message [description]
		 * @param {Object} details [description]
		 */
		this.log.info = (message, details) => {
			this.log(20, message, details);
		};

		/**
		 *
		 * @method log.warn
		 * @param {String} message [description]
		 * @param {Object} details [description]
		 */
		this.log.warn = (message, details) => {
			this.log(40, message, details);
		};

		/**
		 *
		 * @method log.error
		 * @param {String} message [description]
		 * @param {Object} details [description]
		 */
		this.log.error = (message, details) => {
			this.log(50, message, details);
		};
	}

	/**
	 *
	 * @property type
	 * @readonly
	 * @type String
	 */
	get type() {
		return this._settings.type;
	}

	/**
	 *
	 * @method collection
	 * @param  {StorageCollection} name
	 * @return {Promise}
	 */
	collection(name) {
		return new StorageCollection();
	};
};

/**
 *
 * @class StorageCollection
 * @constructor
 */
class StorageCollection {
	constructor(storage, name) {
		this.storage = storage;
		this.ready = false;
		this._references = {};
		this._waiting = [];
		this._tracked = {};
		this._errors = {};
		this._fields = [];
		this.setReady = () => {
			this.ready = true;
			this.log.debug(this._waiting.length + " Calls delayed during SQLite Collection[" + this.name + "] initialization");
			for(var x=0; x<this._waiting.length; x++) {
				this._waiting[x]();
			}
			this._waiting.splice(0);
		};
	}

	getTracked() {
		return Object.keys(this._tracked);
	}

	/**
	 *
	 * @method getAll
	 * @return {Promise | Array}
	 */
	getAll() {
		throw new Error("No Implementation Found");
	};

	/**
	 *
	 * @method get
	 * @return {Promise | Object}
	 */
	get() {
		throw new Error("No Implementation Found");
	};

	 /**
 	 *
 	 * @method insertOne
 	 * @param {Object} data
 	 * @return {Promise}
 	 */
	insertOne() {
		throw new Error("No Implementation Found");
	};

	 /**
 	 *
 	 * @method updateOne
 	 * @param {Object} query
 	 * @param {Object} data
 	 * @return {Promise}
 	 */
	updateOne() {
		throw new Error("No Implementation Found");
	};

	 /**
 	 *
 	 * @method remove
 	 * @param {Object} query
 	 * @return {Promise}
 	 */
	remove() {
		throw new Error("No Implementation Found");
	};
};

Storage.Collection = StorageCollection;

/**
 *
 * @method getConfiguredConnection
 * @param {Object} settings
 * @param {Object} configuration
 * @return {Storage}
 */
Storage.getConfiguredConnection = function(settings, configuration) {
	if(settings) {
		if(settings.type) {
			settings.type = settings.type.toLowerCase();
		}
		switch(settings.type) {
			case "sqlitedb":
			case "sqlite3":
			case "sqlite":
				return new (require("./sqlite"))(settings, configuration);
			case "mongodb":
				return new (require("./mongodb"))(settings, configuration);
			case "mongo":
				return new (require("./mongo"))(settings, configuration);
			default:
				console.log("Storage:Database: Unknown Storage Type");
				return new Storage();
		}
	}
};

module.exports = Storage;
