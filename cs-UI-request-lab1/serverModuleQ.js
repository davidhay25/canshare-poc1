

const fhirpath = require('fhirpath');
// For FHIR model data (choice type support) pull in the model file:
const fhirpath_r4_model = require('fhirpath/fhir-context/r4');

const sample = require("./artifacts/sampleBundle.json")


function setup(app) {
    app.get('/Q/prepop',async function(req,res){
        let fp = req.query.fp

        console.log(fp)

        //the fp will be appropriate from within a Q - eg %LaunchPatient.identifier.first().value
        //we need to convert it into a form to query a Bundle Bundle.entry.resource.where(resourceType='Patient').identifier.first().value
        //This will be a likely implementer pattern - retrieve the candidate bundle (eg resources associated
        //with a path request) when execute the queries against that todo: ? a blog post
        let ar = fp.split('.')
        let first = ar[0]
        ar.shift()
        let rest = ar.join('.')

        let qry
        switch (first) {
            case '%LaunchPatient' :
                qry = `Bundle.entry.resource.where(resourceType='Patient')`
                if (rest) {
                    qry += `.${rest}`
                }
                break
            case '%LaunchPractitioner' :
                qry = `Bundle.entry.resource.where(resourceType='Practitioner')`
                if (rest) {
                    qry += `.${rest}`
                }
                break
            default:
                break
        }
        let result
        if (qry) {
            try {
                result = fhirpath.evaluate(sample,qry)
            } catch (ex) {
                res.status(400).send(ex.message)
                return
            }

        }




        res.json({qry:qry,result:result})


    })
}

module.exports = {
    setup : setup
};