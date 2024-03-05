#!/usr/bin/env node

//from an exported list, update the DG library with all the DSs and compositions in the export


const axios = require('axios')

let fs = require('fs')
let fileName = "./allDataGroups.json"
let serverUrl = "http://localhost:9500"
let data = fs.readFileSync(fileName).toString()

//console.log(dgs)

//return
let json = JSON.parse(data)
let hashDG = json.dg
let hashComp = json.comp
//console.log(hashDG)
async function uploadArtifact(type,hash) {
    for (const key of Object.keys(hash)) {
        let dg = hash[key]
        let qry = `${serverUrl}/model/${type}/${dg.name}`  //todo check type of model -
        let config = {headers:{'x-user-email': "david.hay25@gmail.com"}}

        try {
            console.log(qry)
            let response = await axios.put(qry,dg,config)
            console.log(response.status)
        } catch(ex) {
            if (ex.response) {
                console.log(ex.response.status)
                console.log(JSON.stringify(ex.response.data,null,2))
            } else {
                console.log(ex)
            }
            break
        }
    }
}



uploadArtifact('DG',hashDG)
uploadArtifact('comp',hashComp)