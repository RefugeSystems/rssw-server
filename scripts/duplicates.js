["item","ability","knowledge","player","entity","race","archetype"].forEach(function(t) {db[t].find().forEach(function(doc) {if(db[t].find({"id":doc.id}).count() !== 1) {print(t + " -> " + doc.id);}});})

var collection,
	found = {};
db.getCollectionNames().forEach(function(name) {
	if(name.indexOf(".") === -1 && name[0] !== "_") {
		collection = db.getCollection(name);
		collection.find().sort({"updated":-1}).forEach(function(doc) {
			if(!found[doc.id]) {
				found[doc.id] = true;
			} else {
				print("Removed[" + name + "]: " + doc.id + " @" + doc.updated);
				collection.remove({"_id":doc._id});
			}
		});
	}
});


var collection,
	found = {};
db.getCollectionNames().forEach(function(name) {
	if(name.indexOf(".") === -1 && name[0] !== "_") {
		collection = db.getCollection(name);
		collection.find().sort({"updated":-1}).forEach(function(doc) {
			if(!found[doc.id]) {
				found[doc.id] = true;
			} else {
				print("Issue[" + name + "]: " + doc.id + " @" + doc.updated);
			}
		});
	}
});
