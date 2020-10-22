
var Storage = require("./index"),

	mongo = require("mongodb");
	MongoClient = mongo.MongoClient,
	mongo.Promise = global.Promise,

	emptyArray = [],
	defaultMaster = {
		"$id": "master",
		"$serialization": JSON.stringify({
			"id": "master",
			"username": "master",
			"master": true,
			"description": "Default master account"
		})
	};

/**
 *
 *
 * @class StorageMongoDB
 * @extends Storage
 * @constructor
 * @param {Object} configuration
 */
class StorageMongoDB extends Storage {
	constructor(settings, configuration) {
		super(settings, configuration);

		var url = settings.url || ("mongodb://" + settings.host + (settings.port?":" + settings.port:""));

		MongoClient.connect(url, Object.assign({}, connectOptions, settings.connection))
		.then((connection) => {
			this.database = connection.db(settings.database);
			this.connection = connection;

			this.database.topology.on("close", (error) => {
				this.log.error("Topology Destroyed", {
					"database": db,
					"error": error
				});
				console.log("Topology Closed[" + db + "]");
			});
			this.database.topology.on("reconnect", () => {
				this.log.warn("Topology Reconnected", {
					"database": db
				});
			});

			this.setReady();
		});
	}

	collection(name) {
		var collection = new StorageCollectionMongoDB(this, name);
		var initialize = () => {
			collection.setCollection(this.database.collection(name));
		};

		if(this.ready) {
			initialize();
		} else {
			this._waiting.push(initialize);
		}

		return collection;
	}
}

class StorageCollectionMongoDB extends Storage.Collection {
	constructor(storage, name) {
		super(storage, name);
	}

	setCollection(collection) {
		this.collection = collection;
		this.setReady();
	}

	getAll() {
		return new Promise((done, fail) => {
			this.collection.find().sort({"updated":-1}).toArray()
			.then((array) => {
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

	selectAll() {
		return new Promise((done, fail) => {
			this.collection.find({}).then(function(res) {
				if(err) {
					fail(err);
				} else {
					// console.log(rows);
					done(res);
				}
			});
		});
	}

	insertOne(data) {
		return new Promise((done, fail) => {
			var process = function() {
				this.collection.insertOne(data)
				.then(done)
				.catch(fail);
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	};

	updateOne(query, data) {
		return new Promise((done, fail) => {
			var process = function() {
				this.collection.updateOne(query, data)
				.then(done)
				.catch(fail);
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	};

	remove(query) {
		return new Promise((done, fail) => {
			var process = function() {
				this.collection.remove(query)
				.then(done)
				.catch(fail);
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	};
};
