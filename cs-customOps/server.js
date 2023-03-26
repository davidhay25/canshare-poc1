//Implement the custom operations
//Environment variables
//LOGDB - the name of the mongoDb log database. Used by serverModuleUtil. defaults to localhost.
//SERVERBASE - the root address of the FHIR server, including port. eg http://192.168.1.1:8080 or http://fhir:9090 where 'fhir' is the name of the fhir server container


console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)
console.log(`custom ops from env is ${process.env.CUSTOMOPS}`)

let serverBase = process.env.SERVERBASE


//let fs = require('fs')
let http = require('http');

const requestModule = require("./serverModuleRequest.js")
const reportModule = require("./serverModuleReport.js")
const actnowModule = require("./serverModuleActNow.js")
const formModule = require("./serverModuleForm.js")

const axios = require("axios");

let port = 9300

const bodyParser = require('body-parser')

let express = require('express');
const utilModule = require("./serverModuleUtil");
let app = express();

app.use(bodyParser.json({limit:'50mb',type:['application/fhir+json','application/json+fhir','application/json']}))
//disable any cache - https://stackoverflow.com/questions/22632593/how-to-disable-webpage-caching-in-expressjs-nodejs
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})

requestModule.setup(app,serverBase)    //$acceptRequest
reportModule.setup(app,serverBase)     //$acceptReport
actnowModule.setup(app,serverBase)     //$acceptActNow
formModule.setup(app,serverBase)     //$acceptForm

//A generic validation routine
app.post("/csValidate",async function (req,res) {
    let bundle = req.body
    try {
        let oo = await utilModule.profileValidation(bundle)
        res.json(oo)
    } catch (ex) {
        //there was a validation failure.
        res.status("400").json(ex.data)
    }

})


server = http.createServer(app).listen(port);
console.log("Custom operations server listening on port " + port)
