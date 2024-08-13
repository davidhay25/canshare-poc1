const {MongoClient} = require("mongodb");

//let MongoClient = require('mongodb').MongoClient;
let database        //this will be the database connection


async function setup(app) {
    console.log("Setting up connection to mongodb in serverModuleModel")

    //const uri = "mongodb+srv://canshare:meUQP7RjdaVVTMuS@cluster0.okom61e.mongodb.net/?retryWrites=true&w=majority"

    const uri = "mongodb://127.0.0.1:27017"  //local machine
    const client = new MongoClient(uri);
    database = client.db("canShare")
    await client.connect()
    //await listDatabases(client)
    console.log("review connected")

    //record a comment
    app.post('/review', async function(req,res) {
        let doc = req.body
        doc.date = new Date()

        try {
            await database.collection("review").insertOne(doc)
            res.json(doc)
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //get all the comments for a composition
    app.get('/review/:modelName',async function(req,res){

        let modelName = req.params.modelName
        const query = {modelName : modelName}
        try {
            const cursor = await database.collection("review").find(query).toArray()
            res.json(cursor)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })

    //update a comment
    app.put('/review/:modelName',async function(req,res){

        let comment = req.body
        comment.lastUpdated = new Date()
        delete comment['_id']

        let query = {id:comment.id}
        //let update = {$set:{active:false}}
        console.log(comment,query)
        try {
            let response = await database.collection("review").replaceOne(query,comment,{upsert:false})


            res.json(response)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })


}


module.exports = {
    setup : setup
};