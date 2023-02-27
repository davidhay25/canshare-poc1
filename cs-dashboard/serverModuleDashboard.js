//set up the logging database

let MongoClient = require('mongodb').MongoClient;
let dbAddress = process.env.LOGDB || "localhost"
console.log(`Logger database name is ${dbAddress}`)
const uri = `mongodb://${dbAddress}:27017`;
const client = new MongoClient(uri);
const database = client.db("logger")    //all logs are in the same database


function setup(app) {
    console.log('setup')

    app.get("/logs",async function(req,res){
        console.log('logs')
        let qry = {}    //retre
        let collection = "actnow"

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