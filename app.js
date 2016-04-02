const   express = require('express'),
	fs = require('fs'),
	https = require('https');

var     app = express(),
	port = 443,
	MongoClient = require('mongodb').MongoClient,
	dbUrl = 'mongodb://localhost:27017/localizeDB';

var certOptions = {
	ca: fs.readFileSync('../pebble-localize_win.ca-bundle'),
	key: fs.readFileSync('../pebble-localize-ssl.pem'),
	cert: fs.readFileSync('../pebble-localize_win.crt')
};

var server = https.createServer(certOptions, app).listen(port, () => {
	console.log("Server started");
})

app.get('/', function (req, res) {
  res.send('Hello World!');
})
.post('/user/join', function(req, res) {
	MongoClient.connect(dbUrl, function(err, db) {
		if (err) throw err;
		
		var     name = sanitizeInput(req.query.name),
			username = sanitizeInput(req.query.username),
			pword = sanitizeInput(req.query.pword);
		
		console.log(name,  ' / ', username, ' / ', pword);		
		if (!name || !username || !pword)
			res.status(400).send('Bad input');
		else if (db.collection('users').findOne({'username': username}) != null)
			res.status(403).send('Username already exists');
		else {
			db.collection('users').insertOne({'username': username, 'name': name, 'pword': pword}, function(errInsert, result) {
				if (errInsert)
					res.status(500).send('Error creating user');
				else
					res.status(200).send('JOIN OK');
			});
		}
	});
});

function sanitizeInput(input) {
	return input.replace(/[\\$\[\]^\(\)\*&%#@!\/<>\?\+=:;\|"]/gi, '');
}
