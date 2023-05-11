/*
*
* Support the lab report interface
* */



const utilModule = require("./serverModuleUtil.js")



function setup(app) {
    app.post("/([$])acceptReport",async function(req,res){
        let bundle = req.body

        //get the SR from the bundle. Its id is in the reports
        //let sr = getSRFromBundle(bundle)    //todo check not null

        //if lstErrors length is 0 then no errors were found. Any errors will cause the bundle to be rejected
        let lstRequiredTypes = ['DiagnosticReport','ServiceRequest','Patient']
        let lstErrors = utilModule.level1Validate(bundle,{lstRequiredTypes:lstRequiredTypes})
        if (lstErrors.length > 0) {
            //There were validation errors. These cannot be ignored.
            let oo = utilModule.makeOO(lstErrors)
            res.status("400").json(oo)
            return
        }


        //Unlike the request, there's no additional processing todo (beyond report updates that need further thought
        //But still want to add a provenance resource that refers between the SR and the DR / Obs

        let ar1 = utilModule.findResourceInBundleByType(bundle,"ServiceRequest")
        let SR = ar1[0] //note that the L1 check above should ensure 1 SR in the bundle

        let provenance = {resourceType:"Provenance"}
        provenance.id =  utilModule.createUUID

        provenance.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Lab report</div>"}
        provenance.recorded = new Date().toISOString()
        provenance.entity = []
        provenance.agent = []
        provenance.target = []

        //provenance.entity.push({role:"source",what:{reference:"urn:uuid:" + QR.id}})
        provenance.entity.push({role:"source",what:{reference:`ServiceRequest/${SR.id}`}})


        //add the patient. This resource will have a real id as it was retrieved from the FHIR server
        let ar2 = utilModule.findResourceInBundleByType(bundle,"Patient")
        let patient = ar2[0] //note that the L1 check above should ensure 1 Patient in the bundle
        provenance.agent.push({who:{reference:`Patient/${patient.id}`}})



        //the SR has a real id as it was retrieved from the server
        //provenance.entity.push({who:{reference:`ServiceRequest/${SR.id}` }})

        //now add references to all the DR / Obs resources in the lab bundle
        bundle.entry.forEach(function (entry) {
            let resource = entry.resource
            if (resource.resourceType == 'Observation' || resource.resourceType == 'DiagnosticReport') {
                //the resources may or may not be uuids
                if (resource.id.indexOf('-') > -1) {
                    provenance.target.push({reference:  `urn:uuid:${resource.id}`})
                } else {
                    provenance.target.push({reference:  `${resource.resourceType}/${resource.id}`})
                }


            }
        })

        //add the provenance to the bundle. It's a POST..
        bundle.entry.push(utilModule.makePOSTEntry(provenance))

        //send the bundle to the server
        //let url = serverBase
        //console.log(`POST report to ${url}`)

        let metrics = {}        //todo implement the metrics

        utilModule.postBundleToServer(bundle,metrics,res,"report",req)

/*
        try {
            let result = await axios.post(url,bundle)
            res.json(result.data)
        } catch(ex) {
            if (ex.response) {
                res.status(400).json(ex.response.data)
            } else {
                console.log(ex)
                res.status(500).json(ex)
            }
        }

*/

    })


}

module.exports = {
    setup : setup
};