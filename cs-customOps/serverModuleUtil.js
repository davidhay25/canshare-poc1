let MongoClient = require('mongodb').MongoClient;
const { default: axios } = require("axios")

//set up the logging database
let dbAddress = process.env.LOGDB || "localhost"
console.log(`Logger database name is ${dbAddress}`)
const uri = `mongodb://${dbAddress}:27017`
const client = new MongoClient(uri)
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

function findExtension(item,url) {
    let ar = []
    //console.log(item)
    if (item.extension) {

        for (var i=0; i <  item.extension.length; i++){
            let ext = item.extension[i]

            if (ext.url == url) {
                ar.push(ext)
            }
        }
    }
    return ar
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

        logger(collectionName,{content:bundle,oo:oo})
        res.status(500).json(oo)
    }

}


//perform code level validation. Namely:
//the resource must be a bundle with >1 entries
//each entry must be a conditional create or update
//returns a list of issues
//only a single QR & SR

//? check for profile claim in metadata? The profile validation won't work unless they do.
//todo may need to adapt the routine to allow non-failing issues and add to the OO to return

function level1Validate(bundle) {
    lstErrors = []
    bundle.entry.forEach(function (entry,inx) {
        let resource = entry.resource
        if (! resource.identifier) {
            lstErrors.push(`Entry #${inx} ${resource.resourceType} resource with the id ${resource.id} has no identifier`)
        }
    })
    return lstErrors
}

//Validate the bundle using the FHIR server $validate function. Returns the OO
async function profileValidation(bundle) {
    let url = checkUrlSlash(serverBase) + "Bundle/$validate"

    try {
        response = await axios.post(url,bundle)
        return response.data    //this will be a OO - potentially with informational issues
    } catch (err) {
        //console.log("exception from validate")
        if (err.response) {
            throw(err.response.data)
            //return {ok:true,oo:err.response.data}

        } else {
            throw({msg:'Error accessing server'})
           // return {ok:true}
        }
    }


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

//create a provenance and add references to all resources in the bundle, and the author
//as the agent.
//note that there is also a Provenance created when resources are extracted from the QR.
//this provenance relates the resources (including extracted ones) to the author of the bindle (via QR or DR)
function addProvenanceToBundle(bundle,author,device) {

    if (! author) {
        console.log("No author. Can't create the Provenance")
        return
    }

    //We know there is at least one identifier from earlier validation. This can be the default
    let source = "Unknown"
    if (author.identifier) {
        source = author.identifier[0].value
    } else {
        console.log("request author has no identifier")
    }

    if (author.name && author.name.text) {
        source = author.name.text
    }

    if (bundle.entry && bundle.entry.length > 0) {
        let provenance = {resourceType:"Provenance"}
        provenance.id = createUUID()


        provenance.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Resources submitted by "+source+"</div>"}
        provenance.recorded = new Date().toISOString()
        //provenance.entity = []

        //the author id will be a uuid
        let agent = [{who:{reference:`urn:uuid:${author.id}`},type:{coding:{code:"author",system:"http://terminology.hl7.org/CodeSystem/provenance-participant-type"}}}]

        provenance.agent = [agent]

        if (device) {
            let deviceAgent = [{who:{reference:`urn:uuid:${device.id}`},type:{coding:{code:"assembler",system:"http://terminology.hl7.org/CodeSystem/provenance-participant-type"}}}]
            provenance.agent.push(deviceAgent)
        }

        provenance.target = []

        //create a reference from the Provenance to all elements in the bundle
        bundle.entry.forEach(function (bundle) {
            let resource = bundle.resource
            //assume the id of the resource is a UUID
            provenance.target.push({reference:  `urn:uuid:${resource.id}`})
        })


        //now add the Provenance resource to the bundle
        let entry = {resource:provenance}
        entry.request = {method:"POST",url:"Provenance"}
        entry.fullUrl = `urn:uuid:${provenance.id}`
        bundle.entry.push(entry)

    }



   // function capitalize(s) {
   //     return s[0].toUpperCase() + s.substring(1)
  //  }
}

function findResourceInBundleByType(bundle,type) {
    let ar = []
    bundle.entry.forEach(function (entry) {
        let resource = entry.resource
        if (resource.resourceType == type) {
            ar.push(resource)
        }

    })
    return ar
}

//add a resource to a bundle, assuming a UUID and conditional update. The resources that were sent
//in by the user will have an identifier (due to the L1 check) but ones added by resource extraction (a la SDC)
//won't. If there is an identifier then it will be a conditional update. Otherwise a POST
function addResourcesToBundle(bundle,lstResource) {

    lstResource.forEach(function (resource) {
        console.log(resource.resourceType)
        let entry = {fullUrl:`urn:uuid:${resource.id}`,resource:resource,request:{}}
        if (resource.identifier) {
            entry.request.method = "PUT"
            let identifierString = `${resource.identifier[0].system}|${resource.identifier[0].value}`
            entry.request.url = `${resource.resourceType}?identifier=${identifierString}`
        } else {
            entry.request.method = "POST"
            entry.request.url = `${resource.resourceType}`
        }

        bundle.entry.push(entry)
    })


}

function findResourceInBundleById(bundle,id) {
    let foundResource = {}
    bundle.entry.forEach(function (entry) {
        let resource = entry.resource
        if (resource.id == id) {
            foundResource = resource
        }

    })
    return foundResource
}

function capitalize(s) {
    if (s) {
        return s[0].toUpperCase() + s.substring(1)
    }

}

function createIdDEP() {
    let id = 'id-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000)
    return id
}

function createUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function checkUrlSlash(url) {
    if (url.slice(-1) !== '/') {
        return url + "/"
    } else {
        return url
    }


}

module.exports = {
    level1Validate : level1Validate,
    logger: logger,
    makeOO : makeOO,
    postBundleToServer:postBundleToServer,
    findExtension : findExtension,
    addProvenanceToBundle : addProvenanceToBundle,
    capitalize : capitalize,
    findResourceInBundleByType : findResourceInBundleByType,
    findResourceInBundleById : findResourceInBundleById,
    addResourcesToBundle : addResourcesToBundle,
    createUUID : createUUID,
    profileValidation : profileValidation
};