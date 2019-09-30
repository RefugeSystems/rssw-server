
var Bunyan = require("bunyan");
var root = require("root-require")("package.json");
var defaults = {
	"name": root.name,
	"streams": [{
		"path": "./test.log",
		"level": "debug",
		"type": "rotating-file"
	}]
};

var id = 0;

module.exports.resolve = function(configuration) {
	return new Promise(function(done) {
		var reqSerializer = function(req) {
			if(req._serialized) {
				if(req.session) {
					return {
						session: req.session.id, /* "Coming Soon", currently the "Cookie" */
						instance: req.session.instance, /* "Coming Soon" */
						username: req.session.username,
						request: req._request
					};
				} else {
					return {
						request: req._request,
						instance: undefined,
						username: undefined,
						session: undefined
					};
				}
			} else {
				var parse, body, query, params;
				req._serialized = true;
				req._request = req._request || (req.ip + "#" + id++);
				
				if(req.body) {
					parse = JSON.stringify(req.body);
					body = parse.substring(0, 100);
				}
				if(req.query) {
					parse = JSON.stringify(req.query);
					query = parse.substring(0, 100);
				}
				if(req.params) {
					parse = JSON.stringify(req.params);
					params = parse.substring(0, 100);
				}
				
				return {
					request: req._request,
					session: req.session,
					headers: req.headers,
					method: req.method,
					params: params,
					query: query,
					url: req.url,
					body: body
				};
			}
		};
		
		var responseSerializer = function(response) {
			if(response) {
				var headers;
				try {
					headers = response.getHeaders();
				} catch(ignored) {
					headers = undefined;
				}
				var buffer = JSON.stringify(response._assembledData);
				return {
					"header": headers,
					"body": buffer?buffer.substring(0,500):undefined,
					"statusCode": response.statusCode
				};
			} else {
				return {};
			}
		};
		
		var errorStackRegex = new RegExp("([^\])\n\\s*", "g");
		var errorSerializer = function(error) {
			return error?{
				"message": error.message,
				"stack": error.stack?error.stack.replace(errorStackRegex, "$1~~").split("~~"):null
			}:error;
		};
		
		var worldSerializer = function(world) {
			return {
				"name": world.name,
				"id": world.id
			};
		};
		
		configuration.systemLog = Object.assign({}, defaults, configuration.systemLog);
		
		configuration.systemLog.serializers = {
			response: responseSerializer,
			request: reqSerializer,
			res: responseSerializer,
			req: reqSerializer,

			world: worldSerializer,
			error: errorSerializer,
			err: errorSerializer
		};
		
		configuration.systemLog = new Bunyan(configuration.systemLog);
		done({
			"systemLog": configuration.systemLog
		});
	});
};
