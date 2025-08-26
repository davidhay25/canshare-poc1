

let MongoClient = require('mongodb').MongoClient;
let database        //this will be the database connection

async function setup(app,mongoDbName) {

    const uri = "mongodb://127.0.0.1:27017"  //local machine
    const client = new MongoClient(uri);
    database = client.db(mongoDbName)

    await client.connect()
    console.log("model connected in serverModuleQ")

    app.get('/qr/all', async function(req,res) {
        try {
            const cursor = await database.collection("pathQR").find().sort({runDate:-1}).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //upload QR's created by AI function creating QR from dictated reports
    app.post('/qr/upload',async function(req,res){
        let upload = req.body
        for (let item of upload) {

            const query = {runId:item.runId}
            try {
                await database.collection("pathQR").replaceOne(query,item,{upsert:true})
            } catch(ex) {
                console.log(ex)
                res.status(500).json(ex.message)
                return

            }
        }

        res.json({})


    })
}

module.exports = {
    setup : setup
};