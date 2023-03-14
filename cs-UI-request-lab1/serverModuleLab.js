/*
*
* These are all endpoints that support the Lab application. They are generally not FHIR compliant.
* The only FHIR compliant one is the POST ServiceRequest which receives the SR 'notification' from the CS server
*
*/
const axios = require("axios");
//const config = require("./config.json")
const showLog = true
let db

console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)
console.log(`Custom ops from env is ${process.env.CUSTOMOPS}`)

let serverBase = process.env.SERVERBASE

//import { MongoClient } from "mongodb";
let MongoClient = require('mongodb').MongoClient;

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const database = client.db("labDataStore")

//set the database, source server and backup API points
function setup(app) {


    //receive a SR - FHIR compliant
    //todo - needs better error checking.


    //return the SR and associated QR. use the identifier as the key. This is the kind of query the lab would do
    app.get('/lab/SRDetails', async function(req,res){

        //console.log(req.params)
        let identifier = req.query.identifier
        let qry = `${serverBase}ServiceRequest?identifier=${identifier}&_include=ServiceRequest:supportingInfo&_include=ServiceRequest:subject`

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
            console.log(ex)
            res.status(500).json(ex)
        }


       // console.log(identifier)




    })

    //return the active ServiceRequests, including patient. todo: create generic routine for following paging
    //though in practice the lab would be querying based on identifier...



    app.get('/lab/activeSR', async function(req,res){

        //http://localhost:8080/fhir/ServiceRequest?status=active&_count=50&_include=ServiceRequest:supportingInfo&_include=ServiceRequest:subject
        //http://localhost:8080/fhir/ServiceRequest?status=active&_count=50&_include=ServiceRequest:subject
        //let qry = `${serverBase}ServiceRequest?status=active&_count=50&_include=ServiceRequest:subject&_include=ServiceRequest:supportingInfo`

        let qry = `${serverBase}ServiceRequest?status=active&_count=50&_include=ServiceRequest:subject`

        console.log(qry)
        try {
            let response = await axios.get(qry)

            //assemble into a custom object  {pat: , sr:}

            let bundle = response.data
            //create a hash of the patient
            let hashPatient = {}

            bundle.entry.forEach(function (entry) {
                let resource = entry.resource
                if (resource.resourceType == 'Patient') {
                    hashPatient[`Patient/${resource.id}`] = resource
                }
            })

            let result = []     //an array of {pat: , sr:}

            bundle.entry.forEach(function (entry) {
                let resource = entry.resource
                if (resource.resourceType == 'ServiceRequest') {
                    let obj = {sr:resource}
                    obj.pat = hashPatient[resource.subject.reference]
                    result.push(obj)
                }
            })



            res.json(result)

        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex)
        }


        /*
        let query = { currentStatus :  "active"}

        database.collection("labRequests").find(query).toArray(function(err,doc){
            if (err) {
                res.status(500);
                res.json({err:err});
            } else {
               // console.log(doc)
                res.json(doc)
            }
        })
        */

    })

    //post the report to the CS server (actually nodeRed) and update the local store plus save report.
    app.post("/lab/submitreport",async function(req,res){

        let bundle = req.body

        //get the SR from the bundle. Its id is in the reports
        let sr = getSRFromBundle(bundle)    //todo check not null



        //send the bundle to the server
        let url = config.lab.reportEndpoint.url


        axios.post(url,bundle).then(
            function(data){
                console.log(data.data)
                //the message has been received by the server

                //update the local store to indicate that the request nas been completed
                let identifier = sr.identifier[0].system + "|" + sr.identifier[0].value
                //save the bundle to the local data store
                let createResult = database.collection("labReports").insertOne(bundle)  //todo should check the response
                //update local store (setting SR status to completed)
                let filter = {srIdentifier:identifier}
                let update = {$set:{currentStatus:"completed"}}


                //let updateResult = await database.collection("labRequests").updateOne(filter, update);

                database.collection("labRequests").updateOne(filter, update).then(
                    function(data) {
                        console.log(filter,update,data)
                        res.json(data)

                    }, function (err) {

                    }
                )

            },
            function(err) {
                console.log(err.data)
            }
        )


        //let submitResult = await axios.post(url,bundle)



       // console.log(submitResult.data)

      //  res.json(submitResult.data)


        //let r = await  database.collection("labRequests").find(filter).toArray()
        //console.log(r)
        /*

        let updateDoc = {$set:{"SR.status":"completed"}}
        let options = {}
        let updateResult = await database.collection("labRequests").updateOne(filter, updateDoc, options);
console.log(updateResult)
        //send the bundle to the server
        let url = config.lab.reportEndpoint.url
        let submitResult = await axios.post(url,bundle)


*/



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

// ----------------- support ing functions -----------------

//retrieve the first respource in the bundle.
//todo - this is something to consider - do we require conditional create from the requester
function getFirstResourceFromBundle(bundle) {
    let resource
    if (bundle && bundle.entry && bundle.entry.length > 0) {
        resource = bundle.entry[0].resource
    }
    return resource
}

function getSRFromBundle(bundle) {
    let resource
    if (bundle && bundle.entry && bundle.entry.length > 0) {

        bundle.entry.forEach(function (entry) {
            if (entry.resource.resourceType == "ServiceRequest") {
                resource = entry.resource
            }
        })
        //resource = bundle.entry[0].resource
    }
    return resource
}


module.exports = {
    setup : setup
};