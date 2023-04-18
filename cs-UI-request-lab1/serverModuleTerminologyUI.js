//functions to provide terminology services
//don't use ajax as need to inject tokens when accessing the NZHTS

const axios = require("axios");
//const commonModule = require("./serverModuleCommonUI");

let library = require("./library.json")

let servers = []

servers.push({display:"CanShare",url:"http://localhost:9199/baseR4/"})
servers.push({display:"Public hapi R4",url:"http://hapi.fhir.org/baseR4/"})
servers.push({display:"Terminz",url:"https://terminz.azurewebsites.net/fhir/"})
servers.push({display:"Ontoserver",url:"https://r4.ontoserver.csiro.au/fhir/"})


function setup(app) {

    app.get('/termServers', function(req,res) {
        let ar = []
        //only return the display and url
        servers.forEach(function (svr) {
            ar.push({display:svr.display,url:svr.url})
        })
        res.json(ar)
    })

    app.get('/searchLibrary', function(req,res) {

        res.json(library)
    })

    app.get('/termQuery',async function(req,res) {

        //the query was url encoded so it could be passed to the server. It is the full query (including server)
        let query = decodeURIComponent(req.query.qry);
        console.log(query)

        try {
            let result = await axios.get(query)
            res.json(result.data)
        } catch (ex) {
            if (ex.response) {
                res.status(400).json(ex.response.data)
            } else {
                res.status(500).json({})
            }
        }
    })
}

module.exports = {
    setup : setup
};