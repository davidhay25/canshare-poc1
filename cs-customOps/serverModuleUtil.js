let MongoClient = require('mongodb').MongoClient;
const { default: axios } = require("axios")

//set up the logging database
let dbAddress = process.env.LOGDB || "localhost"
console.log(`Logger database name is ${dbAddress}`)
const uri = `mongodb://${dbAddress}:27017`;
const client = new MongoClient(uri);
const database = client.db("logger")    //all logs are in the same database

//get the hapi server base 
let serverBase = process.env.SERVERBASE


//Make an OO from a list of issues. each issue is {msg:, severity:, code:}
function makeOO(lstIssues) {

    let oo = {resourceType:"OperationOutcome",issue:[]}
    lstIssues.forEach(function(item){
        let iss = {details:{text:item.msg}}
        iss.code = item.code || "invalid"
        iss.severity = item.severity || "information"
        oo.issue.push(iss)
    })
    
    return oo
    
}

async function postBundleToServer(bundle,metrics,res,collectionName,req) {
    let response
    try {
    
        response = await axios.post(serverBase,bundle)
        let oo = response.data  //if successful, will return an oo
        let log = {content:bundle,outcome:response.data,headers: req.headers}
        log.status = res.status
        metrics.end = new Date()
        log.metrics = metrics
        logger(collectionName,log)
        res.json(oo)

    } catch (ex) {
        //an insert error from the FHIR server
        console.log(`Server error ${ex.code}`)
        let oo
        if (ex.response) {
            oo = ex.response.data
        } else {
            let msg = `Server not contactable. Url: ${serverBase} http code:${ex.code}`
             oo = makeOO([{msg:msg,severity:'error'}])
        }


        logger("actnow",{content:bundle,oo:oo})
        res.status(500).json(oo)
    }

}


//perform code level validation. Namely:
//the resource must be a bundle with >1 entries
//each entry must be a conditional create or update
//returns a list of issues
function level1Validate(bundle) {
    return []
}

//for now, send the msg to the mongoDb log database.
//todo eventually, this will use the fluentd container to scrape from stdout...
//if there's an error, just log it to the console for now...
//pass in the request object so er can get headers

function logger(collection,msg) {
    //let obj = {msg:msg}
    //let headers = req.headers
    //obj.headers = req.headers
    msg.date = new Date()
    if (msg.headers && msg.headers['x-sender']) {
        msg.sender = msg.headers['x-sender']
    }


    database.collection(collection).insertOne(msg, function (err, result) {
        if (err) {
            console.log('Error updating log ',err)
        } 
    });
}

module.exports = {
    level1Validate : level1Validate,
    logger: logger,
    makeOO : makeOO,
    postBundleToServer:postBundleToServer
};