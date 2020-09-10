
var diskdb = require("diskdb");

/**
 *
 *
 * @class StorageDiskDB
 * @extends Storage
 * @constructor
 * @param {Object} configuration
 */
module.exports = function(configuration) {

	var connection = diskdb.connect(configuration.database.folder, configuration.database.collections);

	var tracked = {};

	/**
	 *
	 *
	 * @method collection
	 * @param {String} name
	 * @return {StorageCollection}
	 */
	this.collection = function(name) {
		return new Collection(connection[name]);
	};

	var Collection = function(collection) {

		var tracked = {};

		this.getAll = function() {
			return new Promise(function(done, fail) {
				var array = collection.find(),
					result = [],
					x;

				for(x=0; x<array.length; x++) {
					if(array[x] && (!tracked[array[x].id] || (array[x].updated && tracked[array[x].id] < array[x].updated))) {
						tracked[array[x].id] = array[x].updated || 0;
						result.push(array[x]);
					}
				}

				done(result);
			});
		};

		var process = function(data) {
			return new Promise(function(done, fail) {
				if(data && data.id) {
					data.updated = Date.now();
					if(tracked[data.id]) {
						collection.update({id:data.id}, data);
					} else {
						collection.insert(data);
					}
					tracked[data.id] = data.updated;
					done(data);
				}
			});
		};

		this.insertOne = process;

		this.updateOne = process;

		this.remove = function(query) {
			return new Promise(function(done, fail) {
				collection.remove(query);
				done();
			});
		};
	};
};
