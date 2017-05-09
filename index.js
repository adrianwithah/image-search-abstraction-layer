var express = require("express");
var https = require("https");
var app = express();
require("dotenv").config();
console.log(process.env);
console.log(process.env.DATABASE_URL);
var databaseURL = process.env.DATABASE_URL;
var bingApiKey = process.env.BING_SEARCH_API_KEY1;
var mongodb = require("mongodb");
var MongoClient = mongodb.MongoClient;
var path = require("path");

app.set("views",path.join(__dirname,"views","pages"));
app.set("view engine","ejs");

app.get("/",function(request, response) {
	response.render("homepage");
});

app.get("/search",function(request, response) {
	var searchQuery = request.query.term;
	var searchOffset;
	if (!isNaN(request.query.offset)) {
		searchOffset = request.query.offset;
	} else {
		searchOffset = 0
	}
	if (searchQuery === "" || typeof searchQuery === "undefined") {
		response.end("BLANK ENTRY!");
		return;
	}
	var bingSearchRequest = https.request("https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=" + searchQuery + "&count=10&offset=" + searchOffset + "&mkt=en-us&safeSearch=Moderate", function(searchResponse) {
		searchResponse.setEncoding("utf8");
		var dataString = "";
		searchResponse.on("data",function(data) {
			console.log("searchResponse get data");
			dataString += data;
		});
		searchResponse.on("end",function() {
			console.log("searchResponse end");
			var rawDataImagesArray = JSON.parse(dataString).value;
			var returnArray = [];
			rawDataImagesArray.forEach(function(imageDetails) {
				returnArray.push({
					"name": imageDetails.name,
					"thumbnailUrl": imageDetails.thumbnailUrl,
					"imageUrl": imageDetails.contentUrl,
					"sourceUrl": imageDetails.hostPageDisplayUrl					
				});
			});
			response.json(returnArray);
			response.end();
		});
	});
	console.log(bingApiKey);
	bingSearchRequest.setHeader("Ocp-Apim-Subscription-Key",bingApiKey);
	bingSearchRequest.end();
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			console.log("Unable to connect to the mongoDB server. Error: ",error);
		} else {
			console.log("Connection established to: " + databaseURL);
			db.collection("historycollection").insert({
				"query": request.query.term,
				"timestamp": new Date()
			});
			db.close();
		}
	});	
});
app.get("/history",function(request,response) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (err) {
			console.log("Unable to connect to the mongoDB server. Error: ",error);
		} else {
			console.log("Connection established to: " + databaseURL);
			db.collection("historycollection").find().project({_id:0,query:1,timestamp:1}).toArray(function(err, documentArray) {
				response.json(documentArray);
				response.end();
				db.close();
			});
		}
	});
});

app.listen(process.env.PORT || 5000);