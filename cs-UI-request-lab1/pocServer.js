let fs = require('fs')
let http = require('http');
const axios = require("axios");

let port = 9500

const bodyParser = require('body-parser')

const requesterModule = require("./serverModuleRequester.js")
const labModule = require("./serverModuleLab.js")


let config = require("./config.json")

let express = require('express');
let app = express();
app.use(bodyParser.json({limit:'50mb',type:['application/fhir+json','application/json']}))

requesterModule.setup(app)
labModule.setup(app)



//common calls (not specifically related to requester or lab. ?move to separate module
app.get('/config', async function(req,res){
    res.json(config)
})

app.get('/proxy',async function(req,res){
    let query = decodeURIComponent(req.query.qry);
    console.log(query)
    let qry = config.canShare.fhirServer.url + "/" + query
    try {
        let response = await axios.get(qry)
        let bundle = response.data
        res.json(bundle)
    } catch (ex) {
        console.log(ex)
        res.status(500).json(ex)
    }
})

server = http.createServer(app).listen(port);
console.log("Server listening on port " + port)

//the default page
app.use('/', express.static(__dirname,{index:'/monitor.html'}));
