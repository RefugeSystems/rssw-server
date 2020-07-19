
/**
 * 
 * @class NounUtilities
 * @constructor
 * @module Handlers
 */



var maxHistoryLength = 100000,
	trackedValues = [
//		Base stat changes don't make sense without additional work to account for the racial base, otherwise might confuse people 
//		"brawn",
//		"agility",
//		"intellect",
//		"cunning",
//		"willpower",
//		"pressence",
		"wounds",
		"strain",
		"location",
		"inside",
		"credits",
		"brawn",
		"agility",
		"intellect",
		"cunning",
		"willpower",
		"pressence",
		"wounds",
		"strain",
		"shield",
		"hull",
		"xp"
	],
	trackedArrays = [
		"archetype",
		"knowledge",
		"ability",
		"item"
	];

/**
 * 
 * @method generalPermission
 * @static
 */
module.exports.generalPermission = function(event) {
	return event && event.data && event.data.id && (event.player.master || event.player.id === event.data.id);
};

var allowedToModify = function(universe, event) {
	if(event.player.master) {
		return true;
	}
	
	if(event && event.data && event.type && event.data && event.data.id && event.data._type) {
		var noun = universe.nouns[event.data._type][event.data.id];
		if(noun) {
			return noun.publicModification || noun.owner === event.player.id || (noun.owners && noun.owners.indexOf(event.player.id) !== -1);
		} else {
			return false;
		}
	} else {
		console.log("Missing information for data modification");
		return false;
	}
};

/**
 * 
 * @method modifyHandler
 * @deprecated
 * @static
 * @param {String} noun
 */
module.exports.modifyHandler = function(noun) {
	return function(universe, event) {
		if(module.exports.generalPermission(event)) {
			delete(event.data.echo);
			
			if(!universe.nouns[noun]) {
				universe.nouns[noun] = {};
			}
			
			if(universe.nouns[noun][event.data.id]) {
				var record = universe.nouns[noun][event.data.id],
					model = event.data,
					keys = [],
					diffNew,
					diffOld,
					diffRes,
					diff,
					x,
					y;

				for(x=0; x<trackedValues.length; x++) {
					if(record[trackedValues[x]] !== undefined && record[trackedValues[x]] !== null && event.data[trackedValues[x]] !== undefined && event.data[trackedValues[x]] !== record[trackedValues[x]]) {
						record.history.push({
							"type": "record_keeping",
							"modified": trackedValues[x],
							"previous": record[trackedValues[x]],
							"current": event.data[trackedValues[x]],
							"time": Date.now()
						});
					}
				}
				
				for(x=0; x<trackedArrays.length; x++) {
					if(record[trackedArrays[x]] && event.data[trackedArrays[x]] && record[trackedArrays[x]].length !== event.data[trackedArrays[x]].length) {
						diffNew = {};
						diffOld = {};
						diffRes = {};
						// TODO: Finish adding up IDs and then computing difference
						
						for(y=0; y<record[trackedArrays[x]].length; y++) {
							if(!diffOld[record[trackedArrays[x]][y]]) {
								diffOld[record[trackedArrays[x]][y]] = 1;
								keys.push(record[trackedArrays[x]][y]);
							} else {
								diffOld[record[trackedArrays[x]][y]]++;
							}
						}
						for(y=0; y<event.data[trackedArrays[x]].length; y++) {
							if(!diffNew[event.data[trackedArrays[x]][y]]) {
								diffNew[event.data[trackedArrays[x]][y]] = 1;
								keys.push(event.data[trackedArrays[x]][y]);
							} else {
								diffNew[event.data[trackedArrays[x]][y]]++;
							}
						}
						
						for(y=0; y<keys.length; y++) {
							diffRes[keys[y]] = (parseInt(diffNew[keys[y]]) || 0) - (parseInt(diffOld[keys[y]]) || 0);
							if(diffRes[keys[y]] !== 0) {
								if(!diff) {
									diff = {};
								}
								diff[keys[y]] = diffRes[keys[y]];
							}
						}
						
						if(diff) {
							if(!record.history) {
								record.history = [];
							}
							record.history.push({
								"type": "record_acquired_or_loss",
								"modified": trackedArrays[x],
								"difference": diff,
								"time": Date.now()
								// TODO: Session & Universe Time support
							})
						}
					}
				}
				
				Object.assign(universe.nouns[noun][event.data.id], event.data);
				universe.collections[noun].updateOne({"id":event.data.id}, {"$set":event.data})
				.then(function(res) {
					console.log("Update Res: ", res);
					if(res.matchedCount === 0) {
						universe.collections[noun].insertOne(universe.nouns[noun][event.data.id]);
					}
				})
			} else {
				universe.emit("warning", {
					"message": "Creating Record for modification handler",
					"event": event
				});
				if(universe.constructor[noun]) {
					universe.nouns[noun][event.data.id] = new universe.constructor[noun](universe, event.data);
				} else {
					universe.nouns[noun][event.data.id] = JSON.parse(JSON.stringify(event.data));
				}
				universe.collections[noun].insertOne(universe.nouns[noun][event.data.id]);
			}
			universe.emit("model:modified", {
				"data": universe.nouns[noun][event.data.id],
				"emitted": Date.now(),
				"echo": event.echo
			});
		} else {
			console.log("Unable to create player, no ID found");
		}
	};
};


var processAsAdditive = function(a, b) {
	if(typeof(a) === "number") {
		return parseFloat((a + b).toFixed(2));
	} else if(a instanceof Array) {
		a.push(b);
		return a;
	}
};

var processAsSubtractive = function(a, b) {
	var index;
	if(typeof(a) === "number") {
		return parseFloat((a - b).toFixed(2));
	} else if(a instanceof Array) {
		index = a.indexOf(b);
		if(index !== -1) {
			a.splice(index, 1);
		}
		return a;
	}
	
};


module.exports.detailAddProcessor = function(universe, event) {
	module.exports.detailProcessor(universe, event, processAsAdditive);
}

module.exports.detailSubProcessor = function(universe, event) {
	module.exports.detailProcessor(universe, event, processAsSubtractive);
}


module.exports.detailProcessor = function(universe, event, processAs) {
	// TODO: Individual Piece-Meal acquisitions
	var model = event.data,
		delta = model.delta,
		record = universe.nouns[model._type][model.id],
		modifications = {},
		notify = {},
		history,
		keys,
		x,
		y;
	
	console.log("Detail Event: ", event);
	
	if(!record) {
		console.log("Specified Record[" + model.id + "] not found in type[" + model.type + "]: " + JSON.stringify(event, null, 4));
		return null;
	}
	
	if(!delta) {
		console.log("No delta data specified, aborting detail processing: " + JSON.stringify(event, null, 4));
		return null;
	}
	
	if(allowedToModify(universe, event)) {
		if(!record.history) {
			record.history = [];
		}

		keys = Object.keys(delta);
		
		history = {};
		record.history.push(history);
		record.history.splice(maxHistoryLength);
		history.changes = delta;
		history.type = "delta";
		history.changed = keys;
		
		for(x=0; x<keys.length; x++) {
			modifications[keys[x]] = processAs(record[keys[x]], delta[keys[x]]);
			if(universe.bounds && universe.bounds[keys[x]]) {
				if(universe.bounds[keys[x]].min !== undefined && universe.bounds[keys[x]].min > modifications[keys[x]]) {
					modifications[keys[x]] = universe.bounds[keys[x]].min;
				} else if(universe.bounds[keys[x]].max !== undefined && universe.bounds[keys[x]].max < modifications[keys[x]]) {
					modifications[keys[x]] = universe.bounds[keys[x]].max;
				}
			}
			record[keys[x]] = modifications[keys[x]];
		}

		console.log("Detail Event Modifications[" + record.id + "]: ", modifications);
		universe.collections[model._type].updateOne({"id":record.id}, {"$set": modifications})
		.then(function(res) {
			// Happens when setting to the same as the current value
//			if(res.result.nModified === 0) {
//				console.log("Failure to update record[" + record.id + "]");
//			}
		})
		.catch(function(err) {
			console.log("Err: ", err);
		});
//		.catch(universe.generalError);
		
		notify.relevant = record.owners || [];
		if(record.owner) {
			notify.relevant.push(record.owner);
		}
		notify.modification = modifications;
		notify.type = model._type;
		notify.time = Date.now();
		notify.id = model.id;
		
		universe.emit("model:modified", notify);
	} else {
		console.log("Not allowed to modify: " + JSON.stringify(event, null, 4));
		universe.emit("error", {
			"message": "Modification Access Violation",
			"time": Date.now(),
			"cause": event
		});
	}
};



/**
 * 
 * @method modifyProcessor
 * @static
 * @param {Universe} universe
 * @param {Object} event
 */
module.exports.modifyProcessor = function(universe, event) {
	if(allowedToModify(universe, event)) {
		var model = event.data,
			record = universe.nouns[model._type][model.id],
			notify = {},
			keys = [],
			diffNew,
			diffOld,
			diffRes,
			insert,
			diff,
			x,
			y;
		
		if(!record) {
			record = universe.nouns[model._type][model.id] = {};
			insert = true;
		} else {
			insert = false;
		}
		
		if(!record.history) {
			record.history = [];
		}
		for(x=0; x<trackedValues.length; x++) {
			if(record[trackedValues[x]] !== undefined && record[trackedValues[x]] !== null && event.data[trackedValues[x]] !== undefined && event.data[trackedValues[x]] !== record[trackedValues[x]]) {
				if(!model.history) {
					model.history = record.history;
				}
				record.history.unshift({
					"type": "record_keeping",
					"modified": trackedValues[x],
					"previous": record[trackedValues[x]],
					"current": event.data[trackedValues[x]],
					"time": Date.now()
				});
			}
		}
		
		for(x=0; x<trackedArrays.length; x++) {
			if(record[trackedArrays[x]] && event.data[trackedArrays[x]] && record[trackedArrays[x]].length !== event.data[trackedArrays[x]].length) {
				diffNew = {};
				diffOld = {};
				diffRes = {};
				// TODO: Finish adding up IDs and then computing difference
				
				for(y=0; y<record[trackedArrays[x]].length; y++) {
					if(!diffOld[record[trackedArrays[x]][y]]) {
						diffOld[record[trackedArrays[x]][y]] = 1;
						keys.push(record[trackedArrays[x]][y]);
					} else {
						diffOld[record[trackedArrays[x]][y]]++;
					}
				}
				for(y=0; y<event.data[trackedArrays[x]].length; y++) {
					if(!diffNew[event.data[trackedArrays[x]][y]]) {
						diffNew[event.data[trackedArrays[x]][y]] = 1;
						keys.push(event.data[trackedArrays[x]][y]);
					} else {
						diffNew[event.data[trackedArrays[x]][y]]++;
					}
				}
				
				for(y=0; y<keys.length; y++) {
					diffRes[keys[y]] = (parseInt(diffNew[keys[y]]) || 0) - (parseInt(diffOld[keys[y]]) || 0);
					if(diffRes[keys[y]] !== 0) {
						if(!diff) {
							diff = {};
						}
						diff[keys[y]] = diffRes[keys[y]];
					}
				}
				
				if(diff) {
					if(!model.history) {
						model.history = record.history;
					}
					record.history.unshift({
						"type": "record_acquired_or_loss",
						"modified": trackedArrays[x],
						"difference": diff,
						"time": Date.now()
						// TODO: Session & Universe Time support
					})
				}
			}
		}
		
		record.history.splice(maxHistoryLength);
		
		Object.assign(record, model);
		record._last = Date.now();
		delete(record.echo);
		delete(record._id);
		record.updated = Date.now();
		if(insert) {
			record.created = record.updated;
			universe.collections[model._type].insertOne(record)
			.catch(universe.generalError);
		} else {
			universe.collections[model._type].updateOne({"id":record.id}, {"$set":record})
			.then(function(res) {
				// Create new record for things loaded from below
				if(res.result.nModified === 0) {
					universe.collections[model._type].insertOne(record);
				}
			})
			.catch(universe.generalError);
		}
//		console.log("Modify Record: ", record);
		
		notify.relevant = record.owners || [];
		if(record.owner) {
			notify.relevant.push(record.owner);
		}
		notify.modification = model;
		notify.type = model._type;
		notify.time = Date.now();
		notify.id = model.id;
		
		universe.emit("model:modified", notify);
	} else {
		console.log("Not allowed to modify: " + JSON.stringify(event, null, 4));
		universe.emit("error", {
			"message": "Modification Access Violation",
			"time": Date.now(),
			"cause": event
		});
	}
};


/**
 * 
 * @method modifyProcessor
 * @static
 * @param {Universe} universe
 * @param {Object} event
 */
module.exports.deleteProcessor = function(universe, event) {
	if(event.player.master) {
		var model = event.data,
			notify = {};
		
		model._removed = Date.now();
		
		universe.collections._trash.insertOne(model)
		.then(function() {
			console.log("Event: ", event);
			delete(universe.nouns[event.data._type][event.data.id]);
			return universe.collections[event.data._type].remove({"id":event.data.id});
		})
		.catch(universe.generalError);
		
		notify.time = Date.now();
		notify.id = model.id;
		notify.type = model._type;
		
		universe.emit("model:deleted", notify);
	} else {
		console.log("Not allowed to delete: " + JSON.stringify(event, null, 4));
	}
};

/**
 * 
 * @method registerNoun
 * @static
 * @param {String} noun
 */
module.exports.registerNoun = function(noun, models, handlers) {
	models.push({
		"Model": GeneralConstructor,
		"type": noun
	});
	handlers.push({
		"process": module.exports.modifyProcessor,
		"events": ["player:modify:" + noun]
	});
	// Handle specific minute edits such as "Add Knowledge" or "Loss Knowledge" concepts instead of a bulk delta
	//   This is generally for Arrays for specific item edits with which the bulk commit would have issues 
	handlers.push({
		"process": module.exports.detailAddProcessor,
		"events": ["player:modify:" + noun + ":detail:additive"]
	});
	handlers.push({
		"process": module.exports.detailSubProcessor,
		"events": ["player:modify:" + noun + ":detail:subtractive"]
	});
	handlers.push({
		"process": module.exports.deleteProcessor,
		"events": ["player:delete:" + noun]
	});
};


var GeneralConstructor = function(details, loading) {
	Object.assign(this, details);
	if(loading) {
		this._type = loading.type;
	} else {
		console.warn("No Loading Specified");
	}
	if(!this.history) {
		this.history = [];
	}
	
	this.addHistory = function(event) {
		this.history.unshift(event);
		this.history.splice(maxHistoryLength);
	};
};