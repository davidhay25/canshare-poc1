//The server for the example UI - requester and lab


let fs = require('fs')
let http = require('http');
const axios = require("axios");

let port = 9500

const bodyParser = require('body-parser')

console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)
console.log(`Custom ops from env is ${process.env.CUSTOMOPS}`)

let serverBase = process.env.SERVERBASE

const requesterModule = require("./serverModuleRequesterUI.js")
const labModule = require("./serverModuleLab.js")

//let config = require("./config.json")

let express = require('express');
let app = express();
app.use(bodyParser.json({limit:'50mb',type:['application/fhir+json','application/json']}))

//disable any cache - https://stackoverflow.com/questions/22632593/how-to-disable-webpage-caching-in-expressjs-nodejs
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})

requesterModule.setup(app)
labModule.setup(app)



//common calls (not specifically related to requester or lab. ?move to separate module
app.get('/config', async function(req,res){

    let config = {
        "SERVERBASE":process.env.SERVERBASE,
        "CUSTOMOPS":process.env.CUSTOMOPS
    }

    res.json(config)
})



app.get('/proxy',async function(req,res){

    //the query was url encoded so it could be passed to the server
    let query = decodeURIComponent(req.query.qry);

    //now we need to replace any | with %. Only this character should be encoded. Not sure why...
    query = query.replace("|","%7C")    //there will only ever be one...


    //let qry = config.canShare.fhirServer.url + "/" +query
    let qry = serverBase + query


    console.log(qry)
    try {
        let response = await axios.get(qry)
        let bundle = response.data
        res.json(bundle)
    } catch (ex) {
        console.log(ex.code)
        res.status(500).json(ex)
    }
})

server = http.createServer(app).listen(port);
console.log("Server listening on port " + port)

//the default page
app.use('/', express.static(__dirname,{index:'/monitor.html'}));
