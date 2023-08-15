
// https://www.mongodb.com/developer/languages/javascript/node-connect-mongodb/
//import { MongoClient } from "mongodb";
let MongoClient = require('mongodb').MongoClient;




async function listDatabases(client){
    databasesList = await client.db().admin().listDatabases();
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};



async function setup() {
    console.log("Setting up connection to mongodb in serverModuleModel")
    const uri = "mongodb://127.0.0.1:27017";
    const client = new MongoClient(uri);
    const database = client.db("labDataStore")
    await client.connect()
    await listDatabases(client)
    console.log("connected")




}

module.exports = {
    setup : setup
};

