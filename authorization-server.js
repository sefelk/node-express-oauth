const fs = require("fs")
const express = require("express")
const bodyParser = require("body-parser")
const jwt = require("jsonwebtoken")
const {
	randomString,
	containsAll,
	decodeAuthCredentials,
	timeout,
} = require("./utils")

const config = {
	port: 9001,
	privateKey: fs.readFileSync("assets/private_key.pem"),

	clientId: "my-client",
	clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
	redirectUri: "http://localhost:9000/callback",

	authorizationEndpoint: "http://localhost:9001/authorize",
}

const clients = {
	"my-client": {
		name: "Sample Client",
		clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
		scopes: ["permission:name", "permission:date_of_birth"],
	},
	"test-client": {
		name: "Test Client",
		clientSecret: "TestSecret",
		scopes: ["permission:name"],
	},
}

const users = {
	user1: "password1",
	john: "appleseed",
}

const requests = {}
const authorizationCodes = {}

let state = ""

const app = express()
app.set("view engine", "ejs")
app.set("views", "assets/authorization-server")
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const areAllRequestedScopesGranted = (client, scope = "") => {
	const requestedScopes = scope.split(" ");
	return containsAll(client.scopes, requestedScopes);
}

const updateQueryString = (uri, qs) => {
	const url = new URL(uri);
	const params = new URLSearchParams(url.search)
	
	Object.entries(qs).forEach(([key, value]) => {
		params.set(key, value);
	});

	url.search = params;

    return url.toString();
}

app.get("/authorize", (req, res) => {
	const { client_id: clientId, scope } = req.query;
	const client = clients[clientId];

	if(!client){
		return res.status(401)
			.end("Client not authorized");
	}
	
	if(!areAllRequestedScopesGranted(client, scope)){
		return res.status(401)
			.end("Invalid scopes requested");
	}

	const requestId = randomString();

	requests[requestId] = req.query;

	res.render("login", {
		client,
		scope,
		requestId
	});
});

app.post("/approve", (req, res) => {
	const { userName, password, requestId} = req.body;
	
	if(!(userName in users) || users[userName] !== password){
		return res.status(401).end("Invalid username or password");
	}

	const request = requests[requestId];

	if(!request){
		return res.status(401).end("Request not found");
	}

	delete requests[requestId];

	const authorizationCode = randomString();

	authorizationCodes[authorizationCode] = {
		clientReq: request,
		userName,
	};

	const { redirect_uri, state } = request;

	const finalUrl = updateQueryString(redirect_uri, {
		code: authorizationCode,
		state
	});

	res.redirect(finalUrl);
});

app.post("/token", (req, res) => {
	const { authorization} = req.headers;

	if(!authorization){
		return res.status(401).end("Authorization header missing");
	}

	const { clientId, clientSecret } = decodeAuthCredentials(authorization);

	if(!(clientId in clients) || clients[clientId].clientSecret !== clientSecret){
		return res.status(401).end("Invalid client credentials");
	}

	const { code } = req.body;
	const obj = authorizationCodes[code];

	if(!obj){
		return res.status(401).end("Invalid authorization code");
	}

	delete authorizationCodes[code];

	res.end();
});

const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address
	var port = server.address().port
})

// for testing purposes

module.exports = { app, requests, authorizationCodes, server }
