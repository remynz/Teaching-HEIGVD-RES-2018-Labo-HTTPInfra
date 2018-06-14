var Chance = require('chance');
var chance = new Chance();

var Express = require('express');
var express = Express();

express.get('/test', function(req, res)
{
	res.send("Hello again - test is working");
});

express.get('/', function(req, res)
{
	res.send(getRandomCity());
});

express.listen(3000, function()
{
	console.log("Accepting HTTP requests on port 3000!");
});

function getRandomCity() {
	
	var numberOfCity = chance.integer(
	{
		min: 1,
		max: 8
	});
	
	console.log(numberOfCity);
	
	var cities = [];
	for(var i = 0; i < numberOfCity; ++i){
        
        
		cities.push({
			city: chance.city(),
			zip: chance.zip(),
			country: chance.country(),
			altitude: chance.altitude()
		});
	};
	console.log(cities);
	return cities;
}