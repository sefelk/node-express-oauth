const express = require("express")
const bodyParser = require("body-parser")
const fs = require("fs")
const { timeout } = require("./utils")
const jwt = require("jsonwebtoken")

const config = {
	port: 9002,
	publicKey: fs.readFileSync("assets/public_key.pem"),
}

const users = {
	user1: {
		username: "user1",
		name: "User 1",
		date_of_birth: "7th October 1990",
		weight: 57,
	},
	john: {
		username: "john",
		name: "John Appleseed",
		date_of_birth: "12th September 1998",
		weight: 87,
	},
}

const app = express()
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get("/user-info", (req, res) => {
	const { authorization} = req.headers;

	if(!authorization){
		return res.status(401).end("Authorization header missing");
	}

	const encodedToken = authorization.slice("bearer ".length);

	try{
		const token = jwt.verify(encodedToken, config.publicKey, { algorithms: [ "RS256"] });

		const scopes = token.scope.split(" ");
		const user = users[token.userName];

		const obj = Object.fromEntries(Object.entries(user)
			.filter(([permission]) => scopes.includes(`permission:${permission}`)));

		return res.json(obj);
	}
	catch(err){
		return res.status(401).end("Invalid token");
	}
});

const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address
	var port = server.address().port
})

// for testing purposes
module.exports = {
	app,
	server,
}
