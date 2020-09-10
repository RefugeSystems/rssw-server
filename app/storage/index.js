
/**
 *
 * @class Storage
 * @constructor
 * @param {Configuration} configuration
 */
module.exports = function(configuration) {

	if(configuration.database) {
		switch(configuration.database.type) {
			case "sqlite":
				return new require("./sqlite")(configuration);
			case "mongodb":
				return new require("./mongo")(configuration);
			default:
				console.log("Unknown Storage Type");
		}
	}

	/**
	 *
	 * @method collection
	 * @param  {StorageCollection} name
	 * @return {Promise}
	 */
	this.collection = function(name) {
		return new StorageCollection();
	};
};

/**
 *
 * @class StorageCollection
 * @constructor
 */
var StorageCollection = function() {

	/**
	 *
	 * @method getAll
	 * @return {Promise | Array}
	 */
	this.getAll = function() {
		throw new Error("No Implementation Found");
	};

	 /**
 	 *
 	 * @method insertOne
 	 * @param {Object} data
 	 * @return {Promise}
 	 */
	this.insertOne = function() {
		throw new Error("No Implementation Found");
	};

	 /**
 	 *
 	 * @method updateOne
 	 * @param {Object} query
 	 * @param {Object} data
 	 * @return {Promise}
 	 */
	this.updateOne = function() {
		throw new Error("No Implementation Found");
	};

	 /**
 	 *
 	 * @method remove
 	 * @param {Object} query
 	 * @return {Promise}
 	 */
	this.remove = function() {
		throw new Error("No Implementation Found");
	};
};
