/**
 * Implement the acceptRequest custom operation
 * 
 */
const utilModule = require("./serverModuleUtil.js")
const sdcModule = require("./serverModuleSDC.js")
const {logger} = require("./serverModuleUtil");

function setup(app) {

    //test the observation extraction. Returns an array of all resources including those in the bundle
    app.post("/testExtraction",(async function (req,res) {

        let bundle = req.body
        //console.log(bundle)

        let logObject = {mode:'test',bundle:bundle}

        //Level 1 validation - errors that cannot be ignored like missing identifiers or required resources
        //if lstErrors length is 0 then no errors were found. Any errors will cause the bundle to be rejected
        let lstRequiredTypes = ['ServiceRequest','QuestionnaireResponse','Patient']
        let lstErrors = utilModule.level1Validate(bundle,lstRequiredTypes)

        console.log(lstErrors)
        if (lstErrors.length > 0) {
            //There were validation errors. These cannot be ignored.
            logObject.l1errors = lstErrors
            logObject.success = false
            utilModule.logger("request",logObject)

            let oo = utilModule.makeOO(lstErrors)
            res.status("400").json(oo)
            return
        }

        //now extract any resources
        //let arResources = utilModule.findResourceInBundleByType(bundle,"QuestionnaireResponse")
        //get the SR - we know it's there as we checked in the L1 validation
        let QR = utilModule.findResourceInBundleByType(bundle,"QuestionnaireResponse")[0] //arResources[0]

        //we know there's a patient in the bundle...
        logObject.patient = utilModule.findResourceInBundleByType(bundle,"Patient")[0]


        try {

            //get the SR. We also know it's there
            let SR = utilModule.findResourceInBundleByType(bundle,"ServiceRequest")[0] //note that the L1 check above should ensure 1 SR in the bundle
            //console.log("SR=",SR)

            //in some cases (eg the designer) the Q is passed in as well - as it is being updated...
            let arQ = utilModule.findResourceInBundleByType(bundle,"Questionnaire")
            let Q
            if (arQ.length > 0) {
                Q = arQ[0]
            }

            let ar
            try {
                ar = await sdcModule.extractResources(QR,SR, Q)     //throw an exception if there was an error, or an array of extracted resources if not
            } catch (ex) {
                let oo = utilModule.makeOO([ex])
                res.status("400").json(oo)
                return
            }



            //add the extracted resources to the original bundle. There's a Provenance in there
            //that records the resources that were extracted compared to the ones submitted...
            ar.forEach(function (resource) {
                let entry = {resource:resource}
                entry.fullUrl = `urn:uuid:${resource.id}`
                //It's a transaction bundle, and so needs the request. They will all be new resources to be created.
                entry.request = {method:'POST',url:`${resource.resourceType}`}
                bundle.entry.push(entry)
            })

            //now perform profile validation. This is done after response extraction so that the extracted resources are included
            let profileValidationOO
            try {
                profileValidationOO = await utilModule.profileValidation(bundle)
            } catch (ex) {
                //there was a validation failure.
                //console.log(ex)
                profileValidationOO = ex
            }

            logObject.validation = profileValidationOO

            //save the log object
            utilModule.logger("request",logObject)

            //and return
            res.json({bundle:bundle,oo:profileValidationOO})

        } catch(ex) {
            console.log(ex)
            //the


            res.status(400).json(ex.message)
        }


    }))

    app.post("/([$])acceptRequest",async function(req,res){

        let bundle = req.body

        let metrics = {}
        metrics.start = new Date()

        utilModule.logger("request",{content:bundle})

        //if lstErrors length is 0 then no errors were found. Any errors will cause the bundle to be rejected
        let lstRequiredTypes = ['ServiceRequest','QuestionnaireResponse']
        let lstErrors = utilModule.level1Validate(bundle,lstRequiredTypes)
        if (lstErrors.length > 0) {
            //There were validation errors. These cannot be ignored.
            let oo = utilModule.makeOO(lstErrors)
            res.status("400").json(oo)
            return
        }

        //todo perform profile validation - ? optional reject if there are errors
        let profileValidationOO
        try {
            profileValidationOO = await utilModule.profileValidation(bundle)
            console.log(profileValidationOO)
            //todo - what to do with OO ? should we examine all issues and reject if there are errors

        } catch (ex) {
            //there was a validation failure - of the function, not that a resource failed validation....
            console.log(ex)
            res.status("400").json(ex)
            return
        }

        //at this point, the bundle has passed validation

        //extract resources. Add them to the bundle.
        //first, get the QR
        let arResources = utilModule.findResourceInBundleByType(bundle,"QuestionnaireResponse")
        /*
        if (arResources.length == 0) {
            let oo = utilModule.makeOO(['The bundle must have a QR'])
            res.status(400).json(oo)
            return
        }
        */
        let QR = arResources[0] //note that the L1 check above should ensure 1 QR in the bundle

        //Get the SR
        let ar1 = utilModule.findResourceInBundleByType(bundle,"ServiceRequest")
        let SR = ar1[0] //note that the L1 check above should ensure 1 SR in the bundle
        console.log("SR=",SR)

        let arExtractedResources = []
        try {
            //If any resources are extracted, then a specific provenance and device will be added and included in the list.
            arExtractedResources = await sdcModule.extractResources(QR,SR)     //throw an exception if there was an error, or an array of extracted resources if not
            utilModule.addResourcesToBundle(bundle,arExtractedResources)

        } catch(ex) {
            console.log(ex)
            res.status("500").json(ex)
            return
        }

        /*
        //add the provenance resource. This needs to be done after any created resources have been added
        //
        let ar = utilModule.findResourceInBundleByType(bundle,"QuestionnaireResponse")
        if (ar.length == 1) {
            //should only be a single QR...

            if (ar[0].author && ar[0].author.reference) {
                let authorReference = ar[0].author.reference  //this will be a uuid reference
                let authorId = authorReference.replace("urn:uuid:","")
                let author = utilModule.findResourceInBundleById(bundle,authorId)

                if (author) {
                    utilModule.addProvenanceToBundle(bundle,author,device)
                } else {
                    console.log(`the author id ${authorId} was not in the bundle`)
                }
            }

            //the validation rules will check for an author...

        } else {
            //todo ?? what to do here
            console.log(`Looking for QuestionnaireResponse in bundle and found ${ar.length}`)
        }

        */

        //POST the bundle to the FHIR server. Will return the response to the client
        metrics.end = new Date()
        utilModule.postBundleToServer(bundle,metrics,res,"request",req)


    })
}



//If the bundle has a SR, and the SR has a performer then add a Communication resource
//to the bundle. The notification app will use that to send the notification to the 
//endpoint of the performer
function addCommunicationDEP(bundle) {

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