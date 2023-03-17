/*
*
* These are all endpoints that support the Lab application. They are generally not FHIR compliant as they serve the local application
*/
const axios = require("axios");
const showLog = true
let db

//the utils module is stored in the cs-customops folder. todo ?should we move it to a separate 'common' folder?
const utilModule = require("../cs-customOps/serverModuleUtil.js")

console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)
console.log(`Custom ops from env is ${process.env.CUSTOMOPS}`)

/*
let serverBase = process.env.SERVERBASE
if (serverBase[serverBase.length-1] !== '/') {
    serverBase += '/'
}
*/

let serverBase = utilModule.checkUrlSlash(process.env.SERVERBASE)

//import { MongoClient } from "mongodb";
let MongoClient = require('mongodb').MongoClient;

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const database = client.db("labDataStore")

//set the database, source server and backup API points
function setup(app) {


//$scope.reportBundle
    //https://stackabuse.com/handling-errors-with-axios/
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

    //return the SR and associated QR. use the identifier as the key. This is the kind of query the lab would do
    app.get('/lab/SRDetails', async function(req,res){

        //console.log(req.params)
        let identifier = req.query.identifier
        let qry = `${serverBase}ServiceRequest?identifier=${identifier}&_include=ServiceRequest:supportingInfo&_include=ServiceRequest:subject`

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
                        break
                    case "Patient" :
                        vo.pat = resource
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


    //get all the currently active SR. Just for the RI
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

    //post the report to the CS server (actually nodeRed) and update the local store plus save report.
    app.post("/lab/submitreport",async function(req,res){
        let bundle = req.body

        //get the SR from the bundle. Its id is in the reports
        //let sr = getSRFromBundle(bundle)    //todo check not null

        //if lstErrors length is 0 then no errors were found. Any errors will cause the bundle to be rejected
        let lstRequiredTypes = ['ServiceRequest','DiagnosticReport']
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
                provenance.target.push({reference:  `urn:uuid:${resource.id}`})
            }
        })

        //add the provenance to the bundle. It's a POST..
        /*
        let entry = {resource:provenance}
        entry.fullUrl = `urn:uuid:${provenance.id}`
        //It's a transaction bundle, and so needs the request
        entry.request = {method:'POST',url:`${resource.provenance}`}
        */

        bundle.entry.push(utilModule.makePOSTEntry(provenance))


        //send the bundle to the server
        let url = serverBase
        console.log(`POST report to ${url}`)

        try {
            let result = await axios.post(url,bundle)
            res.json(result.data)
        } catch(ex) {
           if (ex.response) {
               res.json(ex.response.data)
           } else {
               console.log(ex)
               res.status(500).json(ex)
           }
        }



    })

    //get the potential report templates (Q) that can be used.
    //It's a query to the Questionnaire endpoint of the canshare server specifying only report types (in useContext)
    //Futher refining of the request - eg filtering by tumour type - is possible.
    //the Q themselves are developed in the IG cs-datastandarddesigner
    app.get('/lab/templates',async function(req,res){

        let qry = serverBase + "/Questionnaire?context=report"
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