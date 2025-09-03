/*
*
* These are all endpoints that support the Lab application. They do not need to be FHIR compliant as they serve the local application
*/
const axios = require("axios");
const showLog = true
let db

//the utils module is stored in the cs-customops folder. todo ?should we move it to a separate 'common' folder?
const utilModule = require("../cs-customOps/serverModuleUtil.js")

const commonModule = require("./serverModuleCommonUI.js")

//The lab system can make queries to the FHIR server. In this implementation it os assumed
//that the lab system is dorectly interacting with the FHIR sever (via this module) - ie it doesn't have it's own data storage
//In a real application, the lab system will likely store stuff locally as well as sending it to the fhir server
console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
let serverBase = utilModule.checkUrlSlash(process.env.SERVERBASE)

console.log(`Log database from env is ${process.env.LOGDB}`)

//The location of the custom operations module (a specific docker container).
//Used when submitting a report
console.log(`Custom ops from env is ${process.env.CUSTOMOPS}`)
let reportEndpoint = process.env.CUSTOMOPS + "$acceptReport"  //where the request bundle is sent

/*
let serverBase = process.env.SERVERBASE
if (serverBase[serverBase.length-1] !== '/') {
    serverBase += '/'
}
*/



//This is the location of the custom operation endpoint for processing reports.




//import { MongoClient } from "mongodb";
let MongoClient = require('mongodb').MongoClient;

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const database = client.db("labDataStore")



//set the database, source server and backup API points
function setup(app) {


//$scope.reportBundle
    //https://stackabuse.com/handling-errors-with-axios/
    //used by the lab UI to validate the bundle as it is being created...
    app.post('/lab/validate', async function(req,res){
        let resource = req.body
        let qry = `${serverBase}${resource.resourceType}/$validate`
        console.log(qry)
        try {
            let result = await axios.post(qry,resource)
            res.json(result.data)
        } catch (ex) {
            //regardless, return the response
            if (ex.response) {
                res.json(ex.response.data)
            } else {
                res.status(500).json(ex)
            }

        }
    })

    //return a specific SR based on its identifier and associated resources
    // resources returned are the QR, Patient and any previous report resources (DR / Obs) that may have been created
    // This is to support interim and final reports
    //when a report is submitted, any previous DR is updated and Observations are set to 'cancelled' status. This could be improved...
    app.get('/lab/SRDetails', async function(req,res){

        //console.log(req.params)
        let identifier = req.query.identifier
        //note that the 'supportingInfo' parameter is a custom request
        let qry = `${serverBase}ServiceRequest?identifier=${identifier}&_include=ServiceRequest:supportingInfo&_include=ServiceRequest:subject`

        //retrieve any DiagnosticReport & Observations that have references to the SR
        qry += "&_revinclude=DiagnosticReport:based-on&_revinclude=Observation:based-on"
        console.log(qry)
        try {
            let response = await axios.get(qry)
            let bundle = response.data      //should have the Pat, SR & SR
            let vo = {}
            bundle.entry.forEach(function (entry) {
                let resource = entry.resource
                switch (resource.resourceType) {
                    case "ServiceRequest" :
                        vo.sr = resource
                        break
                    case "QuestionnaireResponse" :
                        vo.qr = resource

                        //just for testing
                        commonModule.makeVoFromQR(vo.qr).then(
                            function (vo) {
                                console.log('codes=',vo)
                            }
                        )


                        break
                    case "Patient" :
                        vo.pat = resource
                        break
                    case "DiagnosticReport" :
                        vo.dr = resource
                        break
                    case "Observation" :
                        if (resource.derivedFrom) {
                            //if the Observation has got a derivedFrom set then it must be an observation
                            //then was created by the requester
                            //todo - should check this, and maybe check that the derived from is to the QR
                            vo.qrobs = vo.qrobs || []
                            vo.qrobs.push(resource)
                        } else {
                            vo.obs = vo.obs || []
                            vo.obs.push(resource)
                        }

                        break
                    default :
                        //shouldn't be any others, but you never know...
                        vo.other = vo.other || []
                        vo.other.push(resource)
                        break
                }
            })

            res.json(vo)

        } catch(ex) {
            //https://stackabuse.com/handling-errors-with-axios/
            console.log(ex.code)
            if (ex.response) {
                console.log(ex.response.data)
            }

            res.status(500).json(ex)
        }


       // console.log(identifier)




    })

    //return the active ServiceRequests, including patient. todo: create generic routine for following paging
    //though in practice the lab would be querying based on identifier...


    //get all the currently active SR. Right now, the SR are not directed to any lab
    //the assumption is that the
    app.get('/lab/activeSR', async function(req,res){
        let qry = `${serverBase}ServiceRequest?status=active&_count=100&_include=ServiceRequest:subject`

        //console.log(qry)
        try {
            let config = {headers:{'cache-control':'no-cache'}}
            let response = await axios.get(qry,config)

            //assemble into a custom object  {pat: , sr:}
            let bundle = response.data

            if (bundle && ! bundle.entry) {
                res.json('[]')
                return
            }

            //create a hash of the patient
            let hashPatient = {}
            bundle.entry.forEach(function (entry) {
                let resource = entry.resource
                if (resource.resourceType == 'Patient') {
                    hashPatient[`Patient/${resource.id}`] = resource
                }
            })

            //now create the summary array of objects
            let result = []     //an array of {pat: , sr:}
            bundle.entry.forEach(function (entry) {
                let resource = entry.resource
                if (resource.resourceType == 'ServiceRequest') {
                    let obj = {sr:resource}
                    obj.pat = hashPatient[resource.subject.reference]
                    result.push(obj)
                }
            })

            console.log(`${bundle.entry.length} resources (SR & patient) retrieved`)
            res.json(result)

        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex)
        }
    })

    //post the report to the CS server and update the local store plus save report.
    //this function (represnting the lab system) simply sends the transaction to the custom operation and retruns the result
    app.post("/lab/submitreport",async function(req,res){
        let bundle = req.body

        try {
            let response = await axios.post(reportEndpoint,bundle)
            res.send(response.data)
        } catch (err) {
            //the server returned an error status code.
//console.log(err)
            if (err.response) {
                //console.log('resp')
                res.status(err.response.status).send(err.response.data)
            } else {
                res.status(400).send(err)
            }
        }


        /*



        //get the SR from the bundle. Its id is in the reports
        //let sr = getSRFromBundle(bundle)    //todo check not null

        //if lstErrors length is 0 then no errors were found. Any errors will cause the bundle to be rejected
        let lstRequiredTypes = ['DiagnosticReport','ServiceRequest']       //there can be bundles withoud an SR - eg interim reports
        let lstErrors = utilModule.level1Validate(bundle,lstRequiredTypes)
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
        //provenance.agent = []
        provenance.target = []

        //provenance.entity.push({role:"source",what:{reference:"urn:uuid:" + QR.id}})
        provenance.entity.push({role:"source",what:{reference:`ServiceRequest/${SR.id}`}})
        //set the agent to the author of the QR todo ?should this be to a 'Device' representing the forms receiver

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
        let url = serverBase
        console.log(`POST report to ${url}`)

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

    //get the potential report templates (Q) that can be used.
    //It's a query to the Questionnaire endpoint of the canshare server specifying only report types (in useContext)
    //Futher refining of the request - eg filtering by tumour type - is possible.
    //the Q themselves are developed in the IG cs-datastandarddesigner
    app.get('/lab/templates',async function(req,res){

        let qry = serverBase + "/Questionnaire?context=report&status=draft,active"
        try {
            let response = await axios.get(qry)
            let bundle = response.data
            res.json(bundle)
        } catch (ex) {
            res.status(500).json(ex)
        }
    })

}


module.exports = {
    setup : setup
};