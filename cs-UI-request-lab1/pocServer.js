//The server for the example UI - requester and lab


let fs = require('fs')
let http = require('http');
const axios = require("axios");

console.log('port',process.env.POCSERVERBASE)

let port = process.env.POCSERVERBASE || 9500

const bodyParser = require('body-parser')

console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)
console.log(`Custom ops from env is ${process.env.CUSTOMOPS}`)

let serverBase = process.env.SERVERBASE

const requesterModule = require("./serverModuleRequesterUI.js")
const labModule = require("./serverModuleLabUI.js")
const dashBoardModule = require("./serverModuleDashboardUI.js")
const commonModule = require("./serverModuleCommonUI.js")
const clinicalViewerModule = require("./serverModuleClinicalViewerUI")
const terminologyModule = require("./serverModuleTerminologyUI")
//let config = require("./config.json")

let express = require('express');
//const fle = require("./samples/valenciaMay.json");
let app = express();
app.use(bodyParser.json({limit:'50mb',type:['application/json+fhir','application/fhir+json','application/json']}))
app.use('/', express.static(__dirname,{index:'/poc.html'}));

/*
//disable any cache - https://stackoverflow.com/questions/22632593/how-to-disable-webpage-caching-in-expressjs-nodejs
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})

*/

requesterModule.setup(app)
labModule.setup(app)
dashBoardModule.setup(app)
clinicalViewerModule.setup(app)
terminologyModule.setup(app)

//common calls (not specifically related to requester or lab. ?move to separate module

app.get('/sampleAN',function (req,res) {
    let fle = require("./samples/valenciaMay11.json")
    res.json(fle)
})

app.get('/validatorHints',function (req,res) {
    let fle = require("./validatorHints.json")
    res.json(fle)
})

//validation.
app.post('/validateBundle', async function (req,res) {
    let bundle = req.body
    if (! bundle || ! bundle.entry) {
        res.status(400).json({msg:"Must contain a bundle. Is the content-type header set to 'application/json' "})
    } else {
        let validationEP = "http://localhost:9300/validateActNow"
        try {
            let response = await axios.post(validationEP,bundle)
            res.json(response.data)
        } catch (ex) {
            res.status(500).json(ex)
        }
    }
})

//validate a StructureDefiniton
app.post('/validateSD', async function (req,res) {
    let SD = req.body

    let validationEP = `${serverBase}StructureDefinition/$validate`
    console.log(validationEP)
    try {
        let response = await axios.post(validationEP,SD)
        res.json(response.data)
    } catch (ex) {
        //console.log(ex.response.data)
        res.status(400).json(ex.response.data)
    }

})


app.get('/config', async function(req,res){

    let config = {
        "SERVERBASE":process.env.SERVERBASE,
        "CUSTOMOPS":process.env.CUSTOMOPS
    }

    res.json(config)
})



//send in an array of queries. Execute them and add all the results into a single bundle
//If the query doesn't start with 'http' then execute against the POC server
//todo - if we want to, could change to parallel execution...
//https://javascript.plainenglish.io/running-multiple-requests-with-async-await-and-promise-all-e178ae318654
app.post('/multiquery',async function(req,res){
    let arQueries = req.body
    let fullBundle = {resourceType : "Bundle", type :'collection', entry:[]}

    if (arQueries.length > 0) {
        for (const qry of arQueries) {
            //await executeQuery(fullBundle,qry)

            let resource = await commonModule.singleQuery(qry)  //will follow any paging

            //the response will either be a bundle (if a query) or a single resource (if a GET)
            if (resource) {
                if (resource.resourceType == 'Bundle') {
                    if (resource.entry) {
                        console.log('multi query:',qry,resource.entry.length)
                        resource.entry.forEach(function (entry) {
                            fullBundle.entry.push(entry)
                        })
                    }
                } else {
                    let entry = {resource:resource}
                    fullBundle.entry.push(entry)
                }
            }





        }
    }

    res.json(fullBundle)

    async function executeQueryDEP(fullBundle,qry) {

        let bundle = await commonModule.singleQuery(qry)
        if (bundle.entry) {
            console.log('multi query:',qry,bundle.entry.length)
            bundle.entry.forEach(function (entry) {
                fullBundle.entry.push(entry)
            })
        }
    }
})


//execute a single query, following paging.
//If the query doesn't start with 'http' then execute against the POC server
app.get('/proxy',async function(req,res){

    //the query was url encoded so it could be passed to the server
    let query = decodeURIComponent(req.query.qry);
console.log(query)
    try {
        let bundle = await commonModule.singleQuery(query)
        //console.log(bundle)
        res.json(bundle)
    } catch (ex) {

        res.status(400).json(ex)
    }


    return

    //now we need to replace any | with %. Only this character should be encoded. Not sure why...
    query = query.replace("|","%7C")    //there will only ever be one...
    let qry = serverBase + query

    console.log('qry=',qry)
    let config = {headers:{'cache-control':'no-cache'}}     //otherwise the hapi server will cache for a minute

    try {
        let response = await axios.get(qry,config)
        let ctr = 0
        let bundle = response.data       //the first bundle

        //console.log(ctr++,bundle.entry.length)

        let nextPageUrl = getNextPageUrl(bundle)
        while (nextPageUrl) {
            let nextResponse = await axios.get(nextPageUrl,config)
            let nextBundle = nextResponse.data
            if (nextBundle.entry) {
                nextBundle.entry.forEach(function (entry) {
                    bundle.entry.push(entry)
                })
            }
            console.log(ctr++,nextBundle.entry.length)
            nextPageUrl = getNextPageUrl(nextBundle)
        }
        bundle.total = 0
        if (bundle.entry) {
            bundle.total = bundle.entry.length
        }


        res.json(bundle)
    } catch (ex) {
        if (ex.response && ex.response.status == 404) {
            //if it's a 404 then just return an empty bundle
            res.json({responseType:"Bundle"})

        } else {
            console.log(ex)
            res.status(500).json(ex)
        }

    }


    function getNextPageUrl(bundle) {
        //console.log('gm' + bundle.resourceType)
        let url = null
        if (bundle && bundle.link) {
            bundle.link.forEach(function (link){
                if (link.relation == 'next') {
                    url = link.url
                }
            })
        }
        console.log('next',url)
        return url

    }

})

server = http.createServer(app).listen(port);
console.log("Server listening on port " + port)

//the default page
app.use('/', express.static(__dirname,{index:'/monitor.html'}));
