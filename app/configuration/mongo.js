
var mongo = require("mongodb");
var MongoClient = mongo.MongoClient;
mongo.Promise = global.Promise;

var connectOptions = {
	"useNewUrlParser": true,
	"numberOfRetries": Infinity
};

var defaultOptions = {
};

module.exports.resolve = function(configuration) {
	return new Promise(function(done, fail) {
		setTimeout(function() {
			var url = configuration.mongo.url || ("mongodb://" + configuration.mongo.host + (configuration.mongo.port?":" + configuration.mongo.port:""));
			MongoClient.connect(url, Object.assign({}, connectOptions, configuration.mongo.connection))
			.then(function(connection) {
				var connected = {},
					connections = {};
				
				connected.mongo = Object.assign({}, defaultOptions, configuration.mongo);
				connected.mongo.connection = connection;
				if(connected.mongo.database) {
//					console.log("Connected DB: " + connected.mongo.database);
					connections[connected.mongo.database] = connection.db(connected.mongo.database);
				}
				if(connected.mongo.databases) {
					connected.mongo.databases.forEach(function(db) {
//						console.log("Connected DB: " + db);
						connections[db] = connection.db(db, connected.mongo);
						connections[db].topology.on("close", function(error) {
							configuration.systemLog.fatal({
								"database": db,
								"error": error
							}, "Topology Destroyed");
							console.log("Topology Closed[" + db + "]");
						});
						connections[db].topology.on("reconnect", function() {
							configuration.systemLog.info({
								"database": db
							}, "Topology Reconnected");
							console.log("Topology Reconnected[" + db + "]");
						});
					});
				}
				
				connected.mongo.connectDB = function(db, options) {
					options = options || {};
					Object.assign(options, defaultOptions, connected.mongo, options);
					connections[db] = connection.db(db, connected.mongo);
					return connections[db];
				};
				
				connected.mongo.db = connections;
				configuration.mongo = connected;
				done(connected);
			})
//			.catch(fail);
			.catch(function(error) {
				configuration.systemLog.fatal({
					"configurable": "mongodb",
					"error": error
				}, "Failed to establish connection to MongoDB");
				console.log("Failed to connect to Mongo");
				done();
			});
			
		}, 0);
	});
};
