/**
 * Implement the acceptRequest custom operation
 * 
 */
const utilModule = require("./serverModuleUtil.js")
const sdcModule = require("./serverModuleSDC.js")

function setup(app) {

    //console.log('setup')


    //test the observation extraction. Returns an array of all resources including those in the bundle
    app.post("/testExtraction",(async function (req,res) {

        let bundle = req.body
        let arResources = utilModule.findResourceInBundleByType(bundle,"QuestionnaireResponse")
        if (arResources.length == 1) {
            try {
                let QR = arResources[0]
                let ar = await sdcModule.extractResources(QR)     //throw an exception if there was an error, or an array of extracted resources if not

                //add the extracted resources to the original bundle
                ar.forEach(function (resource) {
                    let entry = {resource:resource}
                    entry.fullUrl = `urn:uuid:${resource.id}`
                    //It's a transaction bundle, and so needs the request
                    entry.request = {method:'POST',url:`${resource.resourceType}`}
                    bundle.entry.push(entry)
                })

                //now validate the bundle
                let profileValidationOO
                try {
                    profileValidationOO = await utilModule.profileValidation(bundle)

                } catch (ex) {
                    //there was a validation failure.
                    //todo - not sure what the best approach is...
                    //console.log(ex)
                    profileValidationOO = ex
                    //res.status("400").json(ex)
                }



                res.json({bundle:bundle,oo:profileValidationOO})

            } catch(ex) {
                console.log(ex)
                res.status(400).json(ex.message)
            }
        } else {
            res.status(400).json("Must be just one QR resource")
        }

    }))

    app.post("/([$])acceptRequest",async function(req,res){

        let bundle = req.body

        let metrics = {}
        metrics.start = new Date()

        utilModule.logger("request",{content:bundle})

        //if lstErrors length is 0 then no errors were found. Any errors will cause the bundle to be rejected
        let lstErrors = utilModule.level1Validate(bundle)
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
        } catch (ex) {
            //there was a validation failure - of the function, not that a resource failed validation....
            console.log(ex)
            res.status("400").json(ex)
        }

        //extract resources. Add them to the bundle.
        let arResources = utilModule.findResourceInBundleByType(bundle,"QuestionnaireResponse")
        let QR = arResources[0] //note that the L1 check above will ensure 1 QR in the bundle
        let arExtractedResources = []
        try {
            //If any resources are extracted, then a specific provenance will be added and included in the list.
            //todo is this overkill - ie do we only need the single provenance that refers to all resources?
            arExtractedResources = await sdcModule.extractResources(QR)     //throw an exception if there was an error, or an array of extracted resources if not
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


        //res.json({})

    })
}

//If the Q defines that Observations should be extratced, the do so and add the observations to the bundle
function extractObservations(bundle) {

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