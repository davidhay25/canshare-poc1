//Implement the dashboard 
//Environment variables
//LOGDB - the name of the mongoDb log database. Used by serverModuleUtil. defaults to localhost.
//SERVERBASE - the root address of the FHIR server, including port. eg http://192.168.1.1:8080 or http://fhir:9090 where 'fhir' is the name of the fhir server container


console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)

const dashboardModule = require("./serverModuleDashboard.js")

let http = require('http');




//const axios = require("axios");

let port = 9400

const bodyParser = require('body-parser')

let express = require('express');
let app = express();

dashboardModule.setup(app)

//the default page
app.use('/', express.static(__dirname,{index:'/dashboard.html'}));

server = http.createServer(app).listen(port);
console.log("Dashboard server listening on port " + port)
