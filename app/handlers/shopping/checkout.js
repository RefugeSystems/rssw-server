
/**
 *
 * @event player:shop:checkout
 * @param {String} shop Entity ID
 * @param {String} customer Entity ID
 * @param {Array | String} checkout Array of Item IDs to purchase from the shop.
 * @param {String} echo
 */

var configuration = require("a-configuration"),
	locked = configuration.settings.dblock || configuration.settings.databaselock || configuration.settings.database_lock || configuration.settings.db_lock,
	changable = !locked;

module.exports = {};
module.exports.events = ["player:shop:checkout"];
module.exports.process = function(universe, event) {
	if(locked) {
		return false;
	}
	
	// TODO: Implement Server-Side object inheritance and tracking for proper cost analysis

	var customer = universe.nouns.entity[event.data.customer],
		shop = universe.nouns.entity[event.data.shop],
		items = [],
		price = 0,
		response,
		item,
		x;

	console.log("Checkout: ", event);
	if(event.player.master || (customer && shop && (customer.owner === event.player.id || (customer.owners && customer.owners.indexOf(event.player.id) !== -1)))) {
		if(customer.location === shop.location) {
			for(x=0; x<event.data.checkout.length; x++) {
				item = universe.nouns.item[event.data.checkout[x]];
				if(item) {
					price += item.price || 0;
					items.push(item.id);
				}
			}

			// TODO: Implement innheritance for more complete analysis. This works for now as the client is generally trusted and can alter their credits anyway
			if(!price) {
				price = event.data.cost || event.data.price;
			}
			if(shop.no_cost) {
				price = 0;
			}

			if(customer.credits >= price) {
				if(!customer.item) {
					customer.item = [];
				}
				customer.item.push.apply(customer.item, items);
				customer.credits -= price;
				shop.item = shop.item.difference(items);

				universe.collections[customer._class || customer._type].updateOne({"id":customer.id}, {"$set": customer})
				.then(function(res) {
					return universe.collections[shop._class || shop._type].updateOne({"id":shop.id}, {"$set": shop})
				})
				.then(function(res) {
					response = {
						"id": customer.id,
						"_class": customer._class || customer._type,
						"_type": customer._class || customer._type,
						"echo": event.data.echo,
						"modification": {
							"id": customer.id,
							"_class": customer._class || customer._type,
							"_type": customer._class || customer._type,
							"echo": event.data.echo,
							"-delta": {
								"price": price
							},
							"+delta": {
								"item": items
							}
						}
					};
					universe.emit("model:modified", response);
					response = {
						"id": shop.id,
						"_class": shop._class || shop._type,
						"_type": shop._class || shop._type,
						"echo": event.data.echo,
						"modification": {
							"id": shop.id,
							"_class": shop._class || shop._type,
							"_type": shop._class || shop._type,
							"echo": event.data.echo,
							"+delta": {
								"price": price
							},
							"-delta": {
								"item": items
							}
						}
					};
					universe.emit("model:modified", response);
				})
				.catch(function(err) {
					console.log("Error saving detail modification: ", event, err);
					universe.emit("error", {
						"message": "Issues saving modification",
						"time": Date.now(),
						"event": event,
						"cause": err
					});
				});
			} else {
				console.log("Warning[Credits]: ", event);
				universe.emit("echo:response", {
					"echo": event.echo,
					"message": "Not enough credits to purchase",
					"customer": customer.id,
					"shop": shop.id
				});
			}
		} else {
			console.log("Warning[Location]: ", event);
			universe.emit("echo:response", {
				"echo": event.echo,
				"message": "Unable to buy, non-matching location",
				"customer": customer.id,
				"shop": shop.id
			});
		}
	} else {
		var error = {};
		error.message = "Missing information for checkout";
		error.time = Date.now();
		error.event = event;
		error.missing = [];
		error.echo = event.echo;
		if(!customer) {
			error.missing.push("customer");
		}
		if(!shop) {
			error.missing.push("shop");
		}
		universe.emit("error", error);
	}
};

var canBuy = function(customer, shop, items) {

};
