//Playground routines

let MongoClient = require('mongodb').MongoClient;
let database        //this will be the database connection




async function setup(app,mongoDbName) {
    console.log("Setting up connection to mongodb in serverModulePlayground")

    //const uri = "mongodb+srv://canshare:meUQP7RjdaVVTMuS@cluster0.okom61e.mongodb.net/?retryWrites=true&w=majority"

    const uri = "mongodb://127.0.0.1:27017"  //local machine
    const client = new MongoClient(uri);
    database = client.db(mongoDbName)

    await client.connect()
    console.log("model connected in serverModulePlayground")

    app.put('/frozen/:name', async function(req,res) {
        let name = req.params.name
        let frozen = req.body
        frozen.updated = new Date()

        const query = {name:name}
        try {
            await database.collection("frozenDG").replaceOne(query,frozen,{upsert:true})

            res.json(frozen)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    app.get('/allfrozen', async function(req,res) {
        try {
            const cursor = await database.collection("frozenDG").find({}).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //get a single playground
    app.get('/playground/:id', async function(req,res) {
        let id = req.params.id
        const query = {id:id}
        try {
            const cursor = await database.collection("playground").find(query).toArray()
            if (cursor.length == 1) {
                let playground = cursor[0]
                delete playground['_id']
                res.json(playground)
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'Playground not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} Playgrounds with this id. This shouldn't happen.`})
                }

            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    app.get('/playgroundByName/:name', async function(req,res) {
        let name = req.params.name
        const query = {name:name}
        try {
            const cursor = await database.collection("playground").find(query).toArray()
            if (cursor.length == 1) {
                let playground = cursor[0]
                delete playground['_id']
                res.json(playground)
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'Playground not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} Playgrounds with this name. This shouldn't happen.`})
                }

            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


    //get a summary of playgrounds
    app.get('/playgroundSummary', async function(req,res) {
        try {
            const cursor = await database.collection("playground").find().sort({name:1}).toArray()
            let ar = []
            for (const entry of cursor) {
                let item = {id:entry.id,name:entry.name,description:entry.description,updated:entry.updated}
                if (entry.dataGroups) {
                    item.dgCount = Object.keys(entry.dataGroups).length
                }
                if (entry.compositions) {
                    item.compCount = Object.keys(entry.compositions).length
                }
                ar.push(item)
            }

            res.json(ar)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })



    //create / update a single Playground. In theory the name param is not needed, but cleaner
    app.put('/playground/:id', async function(req,res) {
        let id = req.params.id
        let playground = req.body

        const query = {id:id}
        try {
            const cursor = await database.collection("playground").replaceOne(query,playground,{upsert:true})

            res.json(playground)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

}



module.exports = {
    setup : setup
};