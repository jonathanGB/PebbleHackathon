const   express = require('express'),
	fs = require('fs'),
	https = require('https');

var     app = express(),
	port = 443,
	MongoClient = require('mongodb').MongoClient;

var certOptions = {
	ca: fs.readFileSync('../pebble-localize_win.ca-bundle'),
	key: fs.readFileSync('../pebble-localize-ssl.pem'),
	cert: fs.readFileSync('../pebble-localize_win.crt')
};

var server = https.createServer(certOptions, app).listen(port, () => {
	console.log("Server started");
});

app.get('/', function(req, res) {
	MongoClient.connect('mongodb://localhost:27017/localizeDB', function(err, db) {
		if (err) throw err;
	
		db.collection('users').insertOne({'joo': 'gui'}, function(errInsert, result) {
			if (errInsert) throw errInsert;

			res.send('Hello World');
		});
	});
});
