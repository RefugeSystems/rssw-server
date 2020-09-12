
var sqlite3 = require('sqlite3').verbose(),
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
 * @class StorageSQLite
 * @extends Storage
 * @constructor
 * @param {Object} configuration
 */
module.exports = function(configuration) {
	if(!configuration.database) {
		configuration.database = {};
	}
	if(!configuration.database.type) {
		configuration.database.type = "sqlite";
	}
	if(!configuration.database.file) {
		configuration.database.file = ":memory:";
	}

	var connection = this.connection = new sqlite3.Database(configuration.database.file, sqlite3[configuration.database.mode]); // ie. ("./sqldb/beta"),
		ready = false,
		waiting = [],
		errors = [];

	var receiveError = function(err) {
		if(err) {
			errors.push(err);
		}
	};

	var setReady = function() {
		ready = true;
		console.log(waiting.length + " Calls delayed during SQLite Connection initialization");
		for(var x=0; x<waiting.length; x++) {
			waiting[x]();
		}
		waiting.splice(0);
	};

	connection.all("select * from player;", emptyArray, function(err, rows) {
		if(err && err.message.indexOf("no such table") !== -1) {
			console.log("Initializing Tables");
			connection
			.run("create table datapoint (id text, _serialization text, name text, label text);", emptyArray, receiveError)
			.run("create table datamap (noun text, field text);", emptyArray, receiveError)
			.run("create table player (id text, _serialization text, username text, name text, passcode text, email text, entity text, master boolean, description text, master_note text);", emptyArray, function(tableError) {
				connection.run("insert into player(\"id\", \"_serialization\") values( $id , $serialization )", defaultMaster, function(playerError) {
					if(tableError || playerError) {
						console.log("Initialization Failed: ", tableError || playerError);
					} else {
						setReady();
					}
				});
			});
		} else {
			setReady();
		}
	});

	/**
	 *
	 * @class StorageCollectionSQLite
	 * @constructor
	 * @extends StorageCollection
	 * @param  {String} name
	 */
	var Collection = function(name) {
		var cReady = false,
			cWaiting = [],
			tracked = {},
			errors = {},
			fields = [];

		var setCollectionReady = function() {
			cReady = true;
			console.log(cWaiting.length + " Calls delayed during SQLite Collection[" + name + "] initialization");
			for(var x=0; x<cWaiting.length; x++) {
				cWaiting[x]();
			}
			cWaiting.splice(0);
		};

		var initializeCollection = function() {
			connection.all("select * from " + name + ";", emptyArray, function(err, rows) {
				if(err && err.message.indexOf("no such table") !== -1) {
					console.log("Initializing Collection: " + name);
					connection
					.run("create table " + name + " (id text, _serialization text, name text, description text, master_note text);", emptyArray, function(err) {
						if(err) {
							console.log("Collection Failed to Initialize: " + name, err);
						} else {
							setCollectionReady();
						}
					});
				} else {
					setCollectionReady();
				}
			});
		};

		var parameterize = function(record) {
			return {
				"$id": record.id,
				"$serialization": JSON.stringify(record)
			};
		};

		if(ready) {
			initializeCollection();
		} else {
			waiting.push(initializeCollection);
		}

		this.get = function(id) {
			return get(id);
		};

		this.getAll = function(query) {
			return new Promise(function(done, fail) {
				var process = function() {
					var result = [],
						loading,
						now,
						x;

					connection.all("select * from " + name + ";", emptyArray, function(err, rows) {
						if(err) {
							fail(err);
						} else {
							// TODO: Extend field processing to leverage columns instead of direct serialization
							now = Date.now();
							for(x=0; x<rows.length; x++) {
								try {
									loading = JSON.parse(rows[x]._serialization);
									if(loading && loading.id) {
										tracked[loading.id] = now;
										loading.loaded = now;
										result.push(loading);
									}
								} catch(e) {
									console.log("Failed to load row for collection[" + name + "]: ", rows[x]);
									errors(rows[x])
								}
							}
							done(result);
						}
					});
				};

				if(cReady) {
					process();
				} else {
					cWaiting.push(process);
				}
			});
		};

		this.insertOne = function(noun) {
			if(tracked[noun.id]) {
				return update(noun);
			} else {
				return insert(noun);
			}
		};

		this.updateOne = function(query, noun) {
			return update(query, noun);
		};

		this.remove = function(noun) {
			return remove(noun);
		};

		var get = function(id) {
			return new Promise(function(done, fail) {
				var process = function() {
					connection.all("select _serialization from " + name + " where id = $id ;", {"$id":id}, function(err, rows) {
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

				if(cReady) {
					process();
				} else {
					cWaiting.push(process);
				}
			});
		};

		var insert = function(noun) {
			return new Promise(function(done, fail) {
				var process = function() {
					connection.run("insert into " + name + "(\"id\", \"_serialization\") values( $id , $serialization );", parameterize(noun), function(err) {
						if(err) {
							fail(err);
						} else {
							done(noun);
						}
					});
				};

				if(cReady) {
					process();
				} else {
					cWaiting.push(process);
				}
			});
		};

		// TODO: Add "modification" as a process, either new StorageCollection functionality or processing $set "correctly". New method would be better to move away from MongoDB
		// 		though that will likely make this update call obsolete
		var update = function(query, noun) {
			if(query && !noun) {
				noun = query;
				query = undefined;
			}

			if(noun.$set) {
				// TODO: Once field expansion is present, expand this to handle piecemeal field updates to the SQL columns correctly
				noun = noun.$set;
			}

			return new Promise(function(done, fail) {
				var process = function() {
					// TODO: Align parameterization better for usage of query or (more likely) drop query portion, since record should always be known
					var parameters = parameterize(noun);
					if(query) {
						parameters["$id"] = query.id;
					}

					connection.run("update " + name + " set _serialization = $serialization where id = $id ;", parameters, function(err) {
						if(err) {
							fail(err);
						} else {
							done(noun);
						}
					});
				};

				if(cReady) {
					process();
				} else {
					cWaiting.push(process);
				}
			});
		};

		var remove = function(noun) {
			return new Promise(function(done, fail) {
				var process = function() {
					connection.run("delete from " + name + " where id = $id ;", {"$id": noun.id}, function(err) {
						if(err) {
							fail(err);
						} else {
							done(noun);
						}
					});
				};

				if(cReady) {
					process();
				} else {
					cWaiting.push(process);
				}
			});
		};
	};

	/**
	 *
	 *
	 * @method collection
	 * @param {String} name
	 * @return {StorageCollection}
	 */
	this.collection = function(name) {
		return new Collection(name);
	};
};
