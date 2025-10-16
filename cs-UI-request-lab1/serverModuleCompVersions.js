


let MongoClient = require('mongodb').MongoClient;
let database        //this will be the database connection



async function setup(app) {
    const uri = "mongodb://127.0.0.1:27017"  //local machine
    const client = new MongoClient(uri);
    database = client.db("canShare")
    await client.connect()
    //await listDatabases(client)
    console.log("serverModuleCompVersions connected")


    //get a complete single version
    app.get('comp/version/:name/:version', async function(req,res) {
        let version = parseInt(req.params.version)
        let qry = {name:req.params.name,version:version}

        try {
            let result = await database.collection("compVersion").find(qry).toArray()
            console.log(qry,result)

            switch (result.length) {
                case 1 :
                    res.json(result[0])
                    break
                case 0 :
                    res.status(404).json({msg:`This version (${qry.version}) not found`})
                    break
                default:
                    res.status(500).json({msg:`There were ${result.length} copies of this version (${qry.version}) found`})
                    break

            }
            /*
            if (result.length == 1) {
                res.json(result[0])
            } else {
                let msg = `This version (${qry.version}) not found`
                if (result.length > 1) {
                    msg = `There were ${result.length}`
                }
                res.status(500).json({msg:msg})
            }
          */

        } catch(ex) {
            console.log(ex)
            res.status(500).json({msg:ex.message})
        }

    })

    //get a list of versions (partial content only)
    app.get('comp/version/:name', async function(req,res) {
        let qry = {name:req.params.name}

        try {
            let result = await database.collection("compVersion").find(qry).sort({'createdDate':-1}).toArray()
            let ar = []
            result.forEach(function (doc) {
                let item = {createdDate:doc.createdDate}
                item.title = doc.title
                item.name = doc.name
                item.version = doc.version
                item.versionComment = doc.versionComment
                item.snapshotLength = 0
                if (doc.snapshot) {
                    item.snapshotLength = doc.snapshot.length
                }

                ar.push(item)
            })
            res.json(ar)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })


    //create a new version
    app.post('/comp/version', async function(req,res) {
        let comp = req.body     //comp with snapshot
        comp.createdDate = new Date()



       // let qry = {name:comp.name}


        try {

            await database.collection("compVersion").insertOne(comp)
            res.json(comp)
            /*
            //get the current number of versions of this comp in the db
            let count = await database.collection("compVersion").countDocuments(qry)
            console.log(count)
            //let result = await database.collection("compVersion").find({modelName:compName}).toArray()

            comp.version = count++
            await database.collection("compVersion").insertOne(comp)
             res.json(comp)
            */

        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }


    })


}


module.exports = {
    setup : setup
};