
const axios = require("axios");
const utilModule = require("../cs-customOps/serverModuleUtil.js")

//the base of the FHIR server
let serverBase = utilModule.checkUrlSlash(process.env.SERVERBASE)


//set up the logging database todo - don't think this is working atm..
let MongoClient = require('mongodb').MongoClient;
let dbAddress = process.env.LOGDB || "localhost"
console.log(`Logger database name is ${dbAddress}`)
const uri = `mongodb://${dbAddress}:27017`;
const client = new MongoClient(uri);
const database = client.db("logger")    //all logs are in the same database


function setup(app) {


    //copy the Q to the POC forms server
    app.put("/dashboard/Questionnaire",async function(req,res){
        let Q = req.body


        let qry = `${serverBase}Questionnaire/${Q.id}`


        console.log(qry)
        console.log(Q)
        try {
            let config = {headers:{'cache-control':'no-cache'}}
            let response = await axios.put(qry,Q,config)
            res.json(response.data)
        } catch (ex) {
            if (ex.response) {
                res.status(500).json(ex.response.data)
            } else {
                res.status(500).json(ex)
            }

        }

    })

    app.get("/logs/:module",async function(req,res){

        let qry = {}    //retre
        let collection = req.params.module
        console.log(`${collection} logs`)
        try {
            let entries = await database.collection(collection).find(qry).toArray()
            res.json(entries)
        } catch(ex) {
            res.status(500).json(ex)
        }
       

    });

   
    
}

module.exports = {
    setup : setup
};