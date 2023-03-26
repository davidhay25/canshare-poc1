//process the general

const utilModule = require("./serverModuleUtil.js")


function setup(app) {
    //used by ClinicalViewer to receive a bundle containing a QR and a DocumentReference
    app.post("/([$])acceptForm",async function(req,res) {
        console.log("$acceptForm")

        let bundle = req.body
        let metrics = {}
        metrics.start = new Date()

        utilModule.logger("form", {content: bundle})

        let lstRequiredTypes = ['DocumentReference','QuestionnaireResponse']
        let lstErrors = utilModule.level1Validate(bundle,lstRequiredTypes)
        if (lstErrors.length > 0) {
            //There were validation errors. These cannot be ignored.
            let oo = utilModule.makeOO(lstErrors)
            res.status("400").json(oo)
            return
        }
        //at this point we know that there is at least a QR and DR in the bundle. Just POST it as a transaction to the server

        //POST the bundle to the FHIR server. Will return the response to the client
        metrics.end = new Date()
        utilModule.postBundleToServer(bundle,metrics,res,"form",req)



    })
    
}

module.exports = {
    setup : setup
};