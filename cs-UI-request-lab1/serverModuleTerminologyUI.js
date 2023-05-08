//functions to provide terminology services
//don't use ajax as need to inject tokens when accessing the NZHTS

const axios = require("axios");
const fs = require("fs")
//const commonModule = require("./serverModuleCommonUI");

let library = require("./library.json")

let servers = []

//servers.push({display:"CanShare",url:"http://localhost:9199/baseR4/"})
servers.push({display:"CanShare",url:"http://localhost:8080/fhir/"})
servers.push({display:"Public hapi R4",url:"http://hapi.fhir.org/baseR4/"})
servers.push({display:"Terminz",url:"https://terminz.azurewebsites.net/fhir/"})
servers.push({display:"Ontoserver",url:"https://r4.ontoserver.csiro.au/fhir/"})

//load the codesystem def files
let cmDefinitions = fs.readFileSync("./files/conceptmapdef.tsv").toString()
let arLines = cmDefinitions.split('\n')
let snomed = "http://snomed.info/sct"
let allConceptMaps = []         //all the Concept maps converted from the spreadsheet
arLines.forEach(function (line,inx) {
    if (inx > 14) {         //skip past header
        let arCm = line.split('\t')         //each array is a single concept map. each element corresponds to a column

        let cm = {resourceType:"ConceptMap",status:"draft"}
        cm.id = `canshare-cm-${inx}`
        cm.url = `http://canshare.co.nz/fhir/ConceptMap/${cm.id}`

        cm.group = []

        let group = {}
        group.source = snomed
        group.target = snomed
        group.element = []

        cm.group.push(group)
        let element = {}
        element.code = arCm[0]      //the source element- the domain
        group.element.push(element)
        element.target = []

        let target = {}
        target.code = arCm[24]      //the target wlement - what we want to return
        target.equivalence = "relatedto"

        element.target.push(target)

        //now add the dependencies (if any)
        if (arCm[4]) {
            //this is the service
            target.dependsOn = target.dependsOn || []
            target.dependsOn.push({property: 'cancer-service', system: snomed, value: arCm[4], display:arCm[3]})
        }


        if (arCm[7]) {
            //this is the primary cancer
            target.dependsOn = target.dependsOn || []
            target.dependsOn.push({property: 'primary-cancer', system: snomed, value: arCm[7], display:arCm[6]})
        }

        if (arCm[19]) {
            //this is the primary location
            target.dependsOn = target.dependsOn || []
            target.dependsOn.push({property: 'primary-location', system: snomed, value: arCm[19], display:arCm[18]})
        }

        if (arCm[22]) {
            //this is the histology
            target.dependsOn = target.dependsOn || []
            target.dependsOn.push({property: 'histology', system: snomed, value: arCm[22], display:arCm[21]})
        }


        allConceptMaps.push(cm)
    }
    function makeDependency() {
        
    }


})






function setup(app) {


    app.get('/conceptMap/all', function(req,res) {
        res.json(allConceptMaps)
    })

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