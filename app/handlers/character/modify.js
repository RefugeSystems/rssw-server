
var spaces = new RegExp("\\s"),
	trackedValues = [
		"location",
		"credits",
		"brawn",
		"agility",
		"intellect",
		"cunning",
		"willpower",
		"pressence",
		"xp"
	],
	trackedArrays = [
		"archetype",
		"knowledge",
		"ability",
		"item"
	];



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

module.exports = {
	"events": ["player:modify:entity"],
	"process": function(universe, event) {
		if(allowedToModify(universe, event)) {
			var record = universe.nouns[model._type][model.id],
				model = event.data,
				notify = {},
				diffNew,
				diffOld,
				diffRes,
				insert,
				x,
				y;
			
			for(x=0; x<this._tracked.length; x++) {
				if(this._tracking[this._tracked[x]] === undefined || this._tracking[this._tracked[x]] === null) {
					this._tracking[this._tracked[x]] = this[this._tracked[x]];
				} else if(this._tracking[this._tracked[x]] !== this[this._tracked[x]]) {
					record.history.push({
						"type": this._tracked[x],
						"previous": this._tracking[this._tracked[x]],
						"current": this[this._tracked[x]],
						"time": Date.now()
						// TODO: Session & Universe Time support
					});
				}
			}
			
			for(x=0; x<this._trackedDiff.length; x++) {
				if(this._tracking[this._trackedDiff[x]] === undefined || this._tracking[this._trackedDiff[x]] === null) {
					this._tracking[this._trackedDiff[x]] = this[this._trackedDiff[x]];
				} else if(this._tracking[this._trackedDiff[x]] && this[this._trackedDiff[x]] && this._tracking[this._trackedDiff[x]].length !== this[this._trackedDiff[x]].length) {
					diffNew = {};
					diffOld = {};
					// TODO: Finish adding up IDs and then computing difference
					
					for(y=0; y<this._trackedDiff[this._tracked].length; y++) {
						if(!diffOld[this._trackedDiff[this._tracked][y]]) {
							diffOld[this._trackedDiff[this._tracked][y]] = 1;
						} else {
							diffOld[this._trackedDiff[this._tracked][y]]++;
						}
					}
					
					commit = true;
					this.addHistory({
						"type": this._tracked,
						"previous": this._tracking[this._tracked],
						"current": this[this._tracked],
						"time": Date.now()
						// TODO: Session & Universe Time support
					}, true);
				}
			}
			
			if(!record) {
				record = universe.nouns[model._type][model.id] = {};
				insert = true;
			} else {
				insert = false;
			}
			Object.assign(record, model);
			record._last = Date.now();
			delete(record.echo);
			delete(record._id);
			if(insert) {
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
//			console.log("Modify Record: ", record);
			
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
	}
};