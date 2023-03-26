//set up functions needed by the clincial viewer client application. ie not in customops

const axios = require("axios");
const CUSTOMOPS = process.env.CUSTOMOPS

function setup(app) {
    console.log('setup')

    app.post("/clinical/submitForm",async function(req,res){
        //send the bundle to the 'acceptForm' cusntom endpoint
        let bundle = req.body
        let url = `${CUSTOMOPS}$acceptForm`
        console.log("POSTing form to " + url)
        try {
            let result = await axios.post(url,bundle)
            res.json(result.data)
        } catch (ex) {
            if (ex.response) {
                res.status(400).json(ex.response.data)
            } else {
                res.status(500).json({})
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