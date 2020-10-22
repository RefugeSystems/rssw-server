
/**
 *
 *
 * @class StorageMongo
 * @constructor
 * @deprecated
 * @param {Object} configuration
 */
module.exports = function(settings, configuration) {
	settings = settings || {};

	var connection = configuration.mongo.connectDB(configuration.core.database);

	/**
	 *
	 * @method collection
	 * @param {String} name
	 * @return {StorageCollection}
	 */
	this.collection = function(name) {
		return new Collection(connection.collection(name));
	};

	var Collection = function(collection) {

		this.getAll = function() {
			return new Promise(function(done, fail) {
				collection.find().sort({"updated":-1}).toArray()
				.then(function(array) {
					var tracked = {},
						result = [],
						x;

					for(x=0; x<array.length; x++) {
						if(array[x] && (!tracked[array[x].id] || (array[x].updated && tracked[array[x].id] < array[x].updated))) {
							tracked[array[x].id] = array[x].updated || 0;
							result.push(array[x]);
						}
					}

					done(result);
				})
				.catch(fail);
			});
		};

		this.selectAll = function() {
			return new Promise((done, fail) => {
				collection.find().toArray()
				.then(function(res) {
					done(res);
				})
				.catch(function(err) {
					fail(err);
				});
			});
		}

		this.insertOne = function(data) {
			return collection.insertOne(data);
		};

		this.updateOne = function(query, data) {
			return collection.updateOne(query, data);
		};

		this.remove = function(query) {
			return collection.remove(query);
		};
	};
};
