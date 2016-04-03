const   express = require('express'),
	fs = require('fs'),
	https = require('https'),
	bodyParser = require('body-parser'),
	mongodb = require('mongodb');

var     app = express(),
	port = 443,
	MongoClient = mongodb.MongoClient,
	dbUrl = 'mongodb://localhost:27017/localizeDB';

app.use(bodyParser.urlencoded({
	extended: true
}));

var certOptions = {
	ca: fs.readFileSync('../pebble-localize_win.ca-bundle'),
	key: fs.readFileSync('../pebble-localize-ssl.pem'),
	cert: fs.readFileSync('../pebble-localize_win.crt')
};

var server = https.createServer(certOptions, app).listen(port, () => {
	console.log("Server started");
})

MongoClient.connect(dbUrl, function(err, db) {
	app.get('/', function (req, res) {
	  res.send('Hello World!');
	  db.close();
	})
	.post('/user/create', function(req, res) {
		if (err)
			res.status(500).send('Error connecting to database');
		else {
			var name = sanitizeInput(req.body.name),
				username = sanitizeInput(req.body.username),
				pword = sanitizeInput(req.body.pword);
					
			if (!name || !username || !pword)
				res.status(400).send('Bad input');
			else if (name.length > 50 || username.length > 50 || pword.length > 50)
				res.status(400).send('input too long');
			else {
				db.collection('users').findOne({'username': username}, (errFind, resultFind) => {
					if (errFind) 
						res.status(500).send('Error querying to database');
					else if (resultFind)
						res.status(403).send('Username already exists');
					else {
						db.collection('users').insertOne({'username': username, 'name': name, 'pword': pword}, function(errInsert, result) {
							if (errInsert)
								res.status(500).send('Error creating user');
							else
								res.status(200).send(result.insertedId);
						});
					}
				});
			}
		}
	})
	.post('/group/create', function(req, res) {
		if (err)
			res.status(500).send('Error connecting to database');
		else {
			var masterId = sanitizeInput(req.body.masterId),
				groupName = sanitizeInput(req.body.groupName),
				destLat = sanitizeInput(req.body.destLat),
				destLng = sanitizeInput(req.body.destLng);

			if (!masterId || !groupName || !destLat || !destLng || badIds([masterId]))
				res.status(400).send('Bad input');
			else if (masterId.length > 50 || groupName.length > 50 || destLat.length > 50 || destLng.length > 50)
				res.status(400).send('input too long');
			else {
				db.collection('users').findOne({'_id': mongodb.ObjectID(masterId)}, (errFind, resultFind) => {
					if (errFind)
						res.status(500).send('Error querying database');
					else if (!resultFind)
						res.status(404).send('user id not in the database');
					else if (resultFind.hasOwnProperty('groupMaster'))
						res.status(403).send('user already is in a group');
					else {
						db.collection('users').updateOne({'_id': mongodb.ObjectID(masterId)}, 
							{$set: {'groupId': masterId, 'groupMaster': true, 'groupName': groupName, 'destLat': destLat, 'destLng': destLng}},
							function(errUpdate, result) {
								if (errUpdate)
									res.status(500).send('Error creating group');
								else
									res.sendStatus(200);
							}
						);
					}
				});
			}
		}
	})
	.patch('/group/join', function(req, res) {
		if (err)
			res.status(500).send('Error connecting to database');
		else {
			var userId = sanitizeInput(req.body.userId),
				groupId = sanitizeInput(req.body.groupId);

			if (!userId || !groupId || badIds([userId, groupId]))
				res.status(400).send('Bad input');
			else if (userId.length > 50 || groupId.length > 50)
				res.status(400).send('input too long');
			else {
				db.collection('users').findOne({'_id': mongodb.ObjectID(userId)}, (errFind, resultFind) => {
					if (errFind)
						res.status(500).send('Error querying database');
					else if (!resultFind)
						res.status(404).send('user id not in the database');
					else if (resultFind.hasOwnProperty('groupId'))
						res.status(403).send('user already in group');
					else {
						db.collection('users').findOne({'_id': mongodb.ObjectID(groupId)}, (errFind2, resultFind2) => {
							if (errFind2)
								res.status(500).send('Error querying database');
							else if (!resultFind2 || !resultFind2.hasOwnProperty('groupMaster') || !resultFind2.groupMaster)
								res.status(404).send('group id not in the database');
							else {
								db.collection('users').updateOne({'_id': mongodb.ObjectID(userId)}, 
									{$set: {'groupId': groupId, 'destLat': resultFind2.destLat, 'destLng': resultFind2.destLng}},
									function(errUpdate, result) {
										if (errUpdate)
											res.status(500).send('Error joining group');
										else
											res.status(200).send({'destLat': resultFind2.destLat, 'destLng': resultFind2.destLng});
									}
								);
							}
						});
					}
				});
			}
		}
	})
	.delete('/group/leave', function(req, res) {
		if (err)
			res.status(500).send('Error connecting to database');
		else {
			var userId = sanitizeInput(req.body.userId);

			if (!userId || badIds([userId]))
				res.status(400).send('Bad input');
			else if (userId.length > 50)
				res.status(400).send('input too long');
			else {
				db.collection('users').findOne({'_id': mongodb.ObjectID(userId)}, (errFind, resultFind) => {
					if (errFind)
						res.status(500).send('Error querying database');
					else if (!resultFind)
						res.status(404).send('user id not in the database');
					else if (!resultFind.hasOwnProperty('groupId'))
						res.status(403).send('user is not in a group');
					else if (resultFind.hasOwnProperty('groupMaster') && resultFind.groupMaster) {
						db.collection('users').findOne({'_id': {$ne: mongodb.ObjectID(userId)}, 'groupId': resultFind.groupId}, function(errFind2, resultFind2) {
							if (errFind2)
								res.status(500).send('Error querying database');
							else if (resultFind2)
								res.status(405).send('Master cannot leave non-empty group');
							else {
								db.collection('users').updateOne({'_id': mongodb.ObjectID(userId)},
									{$unset: {'groupMaster': 1, 'groupId': 1}}, function(errDelete, result) {
										if (errDelete)
											res.status(500).send('Error querying database');
										else
											res.status(200).send('Master quit group');
								});
							}
						});
					} else {
						db.collection('users').updateOne({'_id': mongodb.ObjectID(userId)},
							{$unset: {'groupId': 1}}, function(errDelete, result) {
								if (errDelete)
									res.status(500).send('Error querying database');
								else
									res.status(200).send('User quit group');
						});
					}
				});
			}
		}
	})
});

function badIds(list) {
	for (var i = 0, n = list.length; i < n; i++) {
		if (list[i].length !== 24)
			return true;
	}

	return false;
}

function sanitizeInput(input) {
	return input ?
			input.replace(/[\\$\[\]^\(\)\*&%#@!\/<>\?\+=:;\|"]/gi, ''):
			'';
}
