/**
 * Implement the acceptRequest custom operation
 * 
 */
const utilModule = require("./serverModuleUtil.js")

function setup(app) {

    app.post("/([$])acceptRequest",async function(req,res){

        let bundle = req.body
        let metrics = {}
        metrics.start = new Date()


        utilModule.logger("request",{content:bundle})

        //if lstIssues length is 0 then no issues were found
        let lstIssues = utilModule.level1Validate(bundle)
        if (lstIssues.length > 0) {
            //There were validation issues. These cannot be ignored.
            let oo = utilModule.makeOO(lstIssues)
            res.status("400").json(oo)
            return
            
        }

        //todo perform profile validation - ? optional

        //add a Communication to the bundle for the notification if there is a SR with a performer
        addCommunication(bundle)
        //POST the bundle to the FHIR server
        metrics.end = new Date()
        utilModule.postBundleToServer(bundle,metrics,res,"request",req)


        //res.json({})

    })

}

//If the bundle has a SR, and the SR has a performer then add a Communication resource
//to the bundle. The notification app will use that to send the notification to the 
//endpoint of the performer
function addCommunication(bundle) {

    let ar = bundle.entry.filter(entry => entry.resource.resourceType == 'ServiceRequest')

    if (ar.length > 0) {
        let sr = ar[0].resource     //get the first sr - there should only be 1 anyway...
        if (sr.performer) {

        }
    }
   

}

module.exports = {
    setup : setup
};