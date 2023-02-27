//Implement the custom operations
//Environment variables
//LOGDB - the name of the mongoDb log database. Used by serverModuleUtil. defaults to localhost.
//SERVERBASE - the root address of the FHIR server, including port. eg http://192.168.1.1:8080 or http://fhir:9090 where 'fhir' is the name of the fhir server container


console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)

let serverBase = process.env.SERVERBASE


//let fs = require('fs')
let http = require('http');

const requestModule = require("./serverModuleRequest.js")
const reportModule = require("./serverModuleReport.js")
const actnowModule = require("./serverModuleActNow.js")

const axios = require("axios");

let port = 9300

const bodyParser = require('body-parser')

let express = require('express');
let app = express();

app.use(bodyParser.json({limit:'50mb',type:['application/fhir+json','application/json+fhir','application/json']}))

requestModule.setup(app,serverBase)    //$acceptRequest
reportModule.setup(app,serverBase)     //$acceptReport
actnowModule.setup(app,serverBase)     //$acceptActNow


server = http.createServer(app).listen(port);
console.log("Custom operations server listening on port " + port)
