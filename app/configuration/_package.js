module.exports.resolve = function(configuration) {
	configuration.package = require("root-require")("package.json");
};
