const   express = require('express'),
	fs = require('fs'),
	https = require('https');

var     app = express(),
	port = 443;

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
});
