var MongoClient = require('mongodb').MongoClient;

MongoClient.connect('mongodb://localhost:27017/localizeDB', function(err, db) {
  if (err) {
    throw err;
  }
  db.collection('users').insert({"lol": "yep"}, (err, result) => {
	console.log(result);
  });
});
