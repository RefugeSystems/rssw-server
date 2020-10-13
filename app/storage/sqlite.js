
var Storage = require("./index"),

	sqlite3 = require('sqlite3').verbose(),

	emptyArray = [],
	defaultMaster = {
		"$id": "master",
		"$time": Date.now(),
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
 * @class StorageSQLite
 * @extends Storage
 * @constructor
 * @param {Object} settings For this specific instance.
 * @param {Object} configuration For the application as a whole.
 */
class StorageSQLite extends Storage {
	constructor(settings, configuration) {
		super(settings, configuration);

		this.log.debug("Settings: ", settings);
		if(!settings.file) {
			this.log.warn("Leveraging Memory for Storage");
			settings.file = ":memory:";
		}

		this.connection = new sqlite3.Database(settings.file, sqlite3[settings.mode]); // ie. ("./sqldb/beta")

		// Check database existance and completeness
		this.connection.all("select * from player;", emptyArray, (err, rows) => {
			if(err && err.message.indexOf("no such table") !== -1) {
				this.log.debug("Initializing Tables");
				this.connection
				.run("create table datapoint (id text, _serialization text, name text, label text, created bigint, updated bigint);", emptyArray, this.receiveError)
				.run("create table datamap (noun text, field text, created bigint, updated bigint);", emptyArray, this.receiveError)
				.run("create table player (id text, _serialization text, username text, name text, passcode text, email text, entity text, master boolean, description text, master_note text, created bigint, updated bigint);", emptyArray, (tableError) => {
					this.connection.run("insert into player(\"id\", \"_serialization\", \"updated\", \"created\") values( $id , $serialization, $time, $time)", defaultMaster, (playerError) => {
						if(tableError || playerError) {
							this.receiveError(playerError);
							this.receiveError(tableError);
							this.log.error("Initialization Failed: ", tableError || playerError);
						} else {
							this.setReady();
						}
					});
				});
			} else {
				this.setReady();
			}
		});
	}

	get type() {
		return "sqlite";
	}

	collection(name) {
		return new StorageCollectionSQLite(this, name);
	}
}

/**
 *
 * @class StorageCollectionSQLite
 * @constructor
 * @extends StorageCollection
 * @param  {String} name
 */


var parameterize = function(record) {
	return {
		"$id": record.id,
		"$serialization": JSON.stringify(record),
		"$time": Date.now()
	};
};

class StorageCollectionSQLite extends Storage.Collection {
	constructor(storage, name) {
		super(storage, name);
		this.connection = storage.connection;
		this.log = storage.log;
		this.name = name;

		var initializeCollection = () => {
			this.log.debug("Initializing Collection: " + name, {"collection": name});
			this.connection.all("select * from " + this.name + ";", emptyArray, (err, rows) => {
				if(err && err.message.indexOf("no such table") !== -1) {
					this.log.debug("Initializing Collection: " + this.name);
					this.connection
					.run("create table " + this.name + " (id text, _serialization text, name text, description text, master_note text, updated bigint, created bigint);", emptyArray, (err) => {
						if(err) {
							this.log.error("Collection Failed to Initialize: " + this.name, err);
						} else {
							this.setReady();
						}
					});
				} else {
					this.setReady();
				}
			});
		};

		if(storage.ready) {
			initializeCollection();
		} else {
			storage._waiting.push(initializeCollection);
		}
	}

	getAll(query) {
		return new Promise((done, fail) => {
			var process = () => {
				var result = [],
					loading,
					now,
					x;

				this.connection.all("select * from " + this.name + " order by updated desc;", emptyArray, (err, rows) => {
					if(err) {
						fail(err);
					} else {
						// TODO: Extend field processing to leverage columns instead of direct serialization
						now = Date.now();
						for(x=0; x<rows.length; x++) {
							try {
								loading = JSON.parse(rows[x]._serialization);
								if(loading && loading.id) {
									if(this._tracked[loading.id]) {
										console.warn("Duplicate ID[" + this.name + "]: " + loading.id);
									} else {
										this._references[loading.id] = loading;
										this._tracked[loading.id] = now;
										loading.loaded = now;
										result.push(loading);
									}
								}
							} catch(e) {
								this.log.error("Failed to load row for collection[" + this.name + "]: " + JSON.stringify(rows[x]) + e.message);
								// console.log("Error: ", e);
							}
						}
						done(result);
					}
				});
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	}

	selectAll() {
		return new Promise((done, fail) => {
			this.connection.all("select * from " + this.name + " order by updated desc;", emptyArray, (err, rows) => {
				if(err) {
					fail(err);
				} else {
					// console.log(rows);
					done(rows);
				}
			});
		});
	}

	insertOne(noun) {
		if(this._tracked[noun.id]) {
			return this.update(noun);
		} else {
			return this.insert(noun);
		}
	}

	insert(noun) {
		return new Promise((done, fail) => {
			var process = () => {
				this.connection.run("insert into " + this.name + "(\"id\", \"_serialization\", \"updated\", \"created\") values( $id , $serialization, $time, $time );", parameterize(noun), (err) => {
					if(err) {
						fail(err);
					} else {
						this._tracked[noun.id] = Date.now();
						this._references[noun.id] = noun;
						done(noun);
					}
				});
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	}

	updateOne(query, noun) {
		return this.update(query, noun);
	}

	update(query, noun) {
		if(query && !noun) {
			noun = query;
			query = undefined;
		}

		if(noun.$set) {
			// TODO: Once field expansion is present, expand this to handle piecemeal field updates to the SQL columns correctly
			noun = Object.assign({}, this._references[query.id], noun.$set);
		}

		return new Promise((done, fail) => {
			var process = () => {
				// TODO: Align parameterization better for usage of query or (more likely) drop query portion, since record should always be known
				var parameters = parameterize(noun);
				if(query) {
					parameters["$id"] = query.id;
				}

				this.connection.run("update " + this.name + " set _serialization = $serialization, updated = $time where id = $id ;", parameters, (err) => {
					if(err) {
						fail(err);
					} else {
						this._tracked[noun.id] = Date.now();
						this._references[noun.id] = noun;
						done(noun);
					}
				});
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	}

	remove(noun) {
		return new Promise((done, fail) => {
			var process = () => {
				this.connection.run("delete from " + this.name + " where id = $id ;", {"$id": noun.id}, (err) => {
					if(err) {
						fail(err);
					} else {
						delete(this._tracked[noun.id]);
						done(noun);
					}
				});
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	};

	get(id) {
		return new Promise((done, fail) => {
			var process = function() {
				this.connection.all("select _serialization from " + this.name + " where id = $id ;", {"$id":id}, (err, rows) => {
					if(err) {
						fail(err);
					} else {
						if(rows.length) {
							done(JSON.parse(rows[0]._serialization));
						} else {
							done(null);
						}
					}
				});
			};

			if(this.ready) {
				process();
			} else {
				this._waiting.push(process);
			}
		});
	}
}

module.exports = StorageSQLite;
