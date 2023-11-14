
/*
* Interface with the mongodb server to get model data
* Each database has a version of the LIM
*   A version is created by making a copy of the current (like conman)
* Collections:
*   dataGroup - all datagroups
*   composition - all compositions
*   snapshot - composition snapshots created within this version.
*       each entry in the snapshot has the composition and a copy of all the DG (could limit to just those referenced by the composition)
*
* */

const axios = require("axios");

// https://www.mongodb.com/developer/languages/javascript/node-connect-mongodb/

let MongoClient = require('mongodb').MongoClient;
let database        //this will be the database connection

//just a test function
async function listDatabasesDEP(client){
    databasesList = await client.db().admin().listDatabases();
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
}

//save a DG in the history.
async function saveHistory(DG,userEmail,comment) {
    let vo = {date: new Date(), type:'dg',name:DG.name,user:userEmail,content:DG}
    if (comment) {
        vo.comment = comment
    }
    //console.log('pre hx')
    await database.collection("history").insertOne(vo)
    //console.log('post hx')
}

function sendErrorNotification(data) {
    axios.post("https://maker.ifttt.com/trigger/poc_error/json/with/key/dUZYc-uqt_dac43pA5twl4",data)
}

//return true if the 2 models are different
function isDifferent(model1,model2) {
    delete model1['_id']
    delete model2['_id']
    if (JSON.stringify(model1) !== JSON.stringify(model2)) {
        return true
    }

}

async function setup(app) {
    console.log("Setting up connection to mongodb in serverModuleModel")

    //const uri = "mongodb+srv://canshare:meUQP7RjdaVVTMuS@cluster0.okom61e.mongodb.net/?retryWrites=true&w=majority"

    const uri = "mongodb://127.0.0.1:27017"  //local machine
    const client = new MongoClient(uri);
    database = client.db("canShare")
    await client.connect()
    //await listDatabases(client)
    console.log("connected")

    //==== access

    //record an access
    app.post('/model/access', async function(req,res) {
        let clientIp = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress
        let doc = {ip:clientIp,date: new Date()}
        try {
            await database.collection("access").insertOne(doc)
            res.json(doc)
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }


    })

    // =========== These are an entry for each change in the model Telemetry is for errors
    app.post('/trace', async function(req,res) {

        let doc = req.body
        doc.date = new Date()

        try {
            await database.collection("trace").insertOne(doc)
            res.json(doc)
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })

    //db.getCollection("trace").find({date:{"$gte":new Date("2023-11-14")}}).count()

    //retrieve the trace records
    app.get('/trace', async function(req,res) {
        let query = {}

        let limit = 500
        if (req.query.count) {
            limit = parseInt(req.query.count)
        }

        if (req.query.days) {
            //the number of days to show
           // query.date = {"$gte"}
        }

        const options = {sort: { date : 1 },limit:limit}

        //console.log(options)

        try {
            const cursor = await database.collection("trace").find(query,options).toArray()
            res.json(cursor)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }

    })



    //========= telemetry

    app.post('/telemetry', async function(req,res) {
        console.log('err',req.body)
        let clientIp = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress

        let doc = req.body
        doc.ip = clientIp
        doc.date = new Date()

        try {
            await database.collection("telemetry").insertOne(doc)
            sendErrorNotification(doc)
            res.json(doc)
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

       // res.json()
    })

    app.get('/telemetry', async function(req,res) {
        let query = {}
        const options = {sort: { date : -1 }}
        try {
            const cursor = await database.collection("telemetry").find(query,options).toArray()
            res.json(cursor)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }

    })


    //======== datagroups  =========================

    //get all active datagroups
    app.get('/model/allDG', async function(req,res) {
        //retrieve the DG

        const colDG = database.collection("dg");
        const query = {active:true} // active: { $lt: 15 } };
        try {
            const cursor = await colDG.find(query).toArray()
            let arDG = []
            cursor.forEach(function (doc) {
                delete doc['_id']
                arDG.push(doc)
            })

            res.json(arDG)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //get the count of history items for a DG
    app.get('/model/DG/:name/history/count', async function(req,res) {
        let name = req.params.name

        const query = {name:name,type:'dg'}
        try {
            const cursor = await database.collection("history").find(query).toArray()
            res.json(cursor.length)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //delete a resource - todo  - why not use delete verb??
    app.put('/model/DG/:name/delete', async function(req,res) {
        let dg = req.body
        dg.active = false

        let userEmail = req.headers['x-user-email'] || "unknown User"
        let query = {name:req.params.name}
        let update = {$set:{active:false}}
        try {
            await database.collection("dg").updateOne(query,update,{upsert:false})

            //update the history
            await saveHistory(dg,userEmail ,"deleting a document")

            res.json()

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //undo a checkout on a DG
    app.put('/model/DG/:name/revert', async function(req,res) {
        let name = req.params.name
        let userEmail = req.headers['x-user-email']

        const query = {name:name}
        try {
            //strategy is to get the library copy, then update it in a second call as the replaceOne doesn't return the updated doc
            const cursor = await database.collection("dg").find(query).toArray()
            if (cursor.length == 1) {

                let dg = cursor[0]
                delete dg['_id']
                delete dg.checkedOut
                //update the DG
                await database.collection("dg").replaceOne(query,dg,{upsert:true})

                //update the history
                await saveHistory(dg,userEmail || "unknown User","Reverting a checkout")

                res.json(dg)
            } else {
                res.status(404).json({msg:`There were ${cursor.length} occurrences of the DG ${name}`})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })

    //get the history of a resource
    app.get('/model/DG/:name/history', async function(req,res) {
        let name = req.params.name


        const query = {name:name,type:'dg'}
        const options = {sort: { date : -1 }}
        try {
            const cursor = await database.collection("history").find(query,options).toArray()
            res.json(cursor)


        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //get a single DG by name
    app.get('/model/DG/:name', async function(req,res) {
        let name = req.params.name

        const query = {name:name}
        try {
            const cursor = await database.collection("dg").find(query).toArray()
            if (cursor.length == 1) {
                let comp = cursor[0]
                delete comp['_id']
                res.json(comp)
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'DG not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} DGs with this name. This shouldn't happen.`})
                }

            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }


    })

    //create / update a single DG. In theory the name param is not needed, but cleaner
    app.put('/model/DG/:name', async function(req,res) {
        let name = req.params.name
        let dg = req.body
        dg.active = true

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        const query = {name:name}
        try {
            const cursor = await database.collection("dg").replaceOne(query,dg,{upsert:true})
            await saveHistory(dg,userEmail || "unknown User")

            res.json(dg)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //receive a hash of DG (the hashAllDG) and update the server.
    //start with a simple update for now - get fancier later

    app.post('/model/DG/DEP', async function(req,res) {


        let vo = req.body  //{user: hashAllDG: }

        let hashAllDG = vo.hashAllDG

        //should alway be an email as only logged in users can update
        let userEmail = "unknown"
        if (vo.user) {
            userEmail = vo.user.email
            console.log(vo.user)
        }

        //Updating each one individually as we need to check for checked out status

        let outcomes = []        //the history of changes (or not)

        try {

            //let backup = {type:'hashDG',date: new Date(), data:hashAllDG}
            //await database.collection("backup").insertOne(backup)

            //hash is keyed on dg.name
            for (const key of Object.keys(hashAllDG)) {
                //console.log(key)
                let dg = hashAllDG[key]
                dg.active = true        //to provide a way to de-activate DG's. The query will only return active ones.
                dg.lastUpdate = userEmail   //record the person that last updated
                delete dg['_id']

                //first, retrieve the current DG
                const findQuery = {name:dg.name}
                const findCursor = await database.collection("dg").find(findQuery).toArray()

                switch (findCursor.length) {
                    case 0 :
                        //this is a new DG - it can be saved

                        await database.collection("dg").insertOne(dg)

                        await saveHistory(dg,userEmail)

                        outcomes.push({name:dg.name,saved:true,message:"New resource"})
                        break
                    case 1 :
                        let libraryDG = findCursor[0]   //todo check for > 1 - that shouldn't happen ? can the db have a constraint
                        if (libraryDG.checkedOut) {
                            //this is checked out to someone
                            if (userEmail && (userEmail == libraryDG.checkedOut)) {
                                //checked out to this user - OK to update
                                //only update if the contents have changed
                                if (isDifferent(dg,libraryDG)) {
                                    const query = {name:dg.name}
                                    await database.collection("dg").replaceOne(query,dg,{upsert:true})
                                    await saveHistory(dg,userEmail)
                                    outcomes.push({name:dg.name,saved:true,message:"Updated"})
                                } else {
                                    outcomes.push({name:dg.name,saved:false,message:"Not changed"})
                                }


                            } else {
                                //checked out to someone else - don't update, or save in the history
                                outcomes.push({name:dg.name,saved:false,message:`checked out to ${libraryDG.checkedOut}`})

                                await saveHistory(dg,userEmail)

                            }

                        } else {
                            //exists in the library, but not checked out. So can save.
                            let libraryDG = findCursor[0]

                            if (isDifferent(dg,libraryDG)) {
                                const query = {name: dg.name}
                                await database.collection("dg").replaceOne(query, dg, {upsert: true})
                                await saveHistory(dg, userEmail)
                                outcomes.push({name: dg.name, saved: true, message: "Updated"})
                            } else {
                                outcomes.push({name:dg.name,saved:false,message:"Not changed"})
                            }
                        }
                        break
                    default :
                        //this is an error - shouldn't happen
                        outcomes.push({name:dg.name,saved:false,message:`There were ${findCursor.length} resources with that name.`})
                        break

                }


            }
            res.json(outcomes)


        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    // ============ compositions ========================

    //get all active compositions - used by the library
    app.get('/model/allCompositions', async function(req,res) {
        const query = {}  // bring them all back ATM{active:true} // active: { $lt: 15 } };
        try {
            const cursor = await database.collection("comp").find(query).toArray()
            let arComp = []
            cursor.forEach(function (doc) {
                delete doc['_id']
                arComp.push(doc)
            })
            res.json(arComp)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //undo a checkout on a Composition
    app.put('/model/comp/:name/revert', async function(req,res) {
        let name = req.params.name
        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        const query = {name:name}
        try {
            //strategy is to get the library copy, then update it in a second call as the replaceOne doesn't return the updated doc
            const cursor = await database.collection("comp").find(query).toArray()
            if (cursor.length == 1) {

                let comp = cursor[0]
                delete comp['_id']
                delete comp.checkedOut
                //update the Composition
                await database.collection("comp").replaceOne(query,comp,{upsert:true})

                //update the history
                await saveHistory(comp,userEmail || "unknown User","Reverting a checkout composition")

                res.json(comp)
            } else {
                res.status(404).json({msg:`There were ${cursor.length} occurrences of the Composition ${name}`})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })


    //get a single composition by name
    app.get('/model/comp/:name', async function(req,res) {
        let name = req.params.name
        const query = {name:name}
        try {
            const cursor = await database.collection("comp").find(query).toArray()
            if (cursor.length == 1) {
                let comp = cursor[0]
                delete comp['_id']
                res.json(comp)
            } else {
                res.status(404).json({msg:'Composition not found, or there are multiple with the same name'})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //create / update a single composition. In theory the name param is not needed, but cleaner
    app.put('/model/comp/:name', async function(req,res) {

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        let name = req.params.name
        let comp = req.body
        delete comp['_id']
        comp.updated = true           //so we know it was updated
        const query = {name:name}
        try {
            const cursor = await database.collection("comp").replaceOne(query,comp,{upsert:true})
            await saveHistory(comp,userEmail || "unknown User")
            res.json(comp)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }


    })


    // ============== questionnnaire objects - not Q resources


    //get all active datagroups. For now, return the whiole thing - if size becomes an issue, then just return the meta element
    app.get('/model/allQObject', async function(req,res) {
        //retrieve the QO

        const colQO = database.collection("qobject");
        const query =  {}// {active:true} // active: { $lt: 15 } };
        try {
            const cursor = await colQO.find(query).toArray()
            let hashQO = {}
            cursor.forEach(function (doc) {
                delete doc['_id']
                hashQO[doc.name] = doc

            })

            res.json(hashQO)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //get a single QO by name
    app.get('/model/QObject/:name', async function(req,res) {
        let name = req.params.name
        const query = {name:name}
        try {
            const cursor = await database.collection("qobject").find(query).toArray()
            if (cursor.length == 1) {
                let qo = cursor[0]
                delete qo['_id']
                res.json(qo)
            } else {
                res.status(404).json({msg:'Q not found, or there are multiple with the same name'})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //make a copy of all documents
    async function backupCopy(json) {


    }

    //create / update a single QuestionnaireObject (QO). In theory the name param is not needed, but cleaner
    app.put('/model/QObject/:name', async function(req,res) {
        let name = req.params.name
        let qo = req.body
        qo.updated = true           //so we know it was updated
        const query = {name:name}
        try {
            let backup = {type:'qo',date: new Date(), data:qo}
            await database.collection("backup").insertOne(backup)

            const cursor = await database.collection("qobject").replaceOne(query,qo,{upsert:true})
            res.json(qo)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })



}

module.exports = {
    setup : setup
};


