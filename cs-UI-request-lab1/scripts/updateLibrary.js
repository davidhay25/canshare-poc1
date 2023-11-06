#!/usr/bin/env node

//from an exported list, update the DG library

const axios = require('axios')

let fs = require('fs')
let fileName = "./allDataGroups-nov7.json"
//let serverUrl = "http://poc.canshare.co.nz"         //the server is listening on post 80
let serverUrl = "http://localhost:9500"
let dgs = fs.readFileSync(fileName).toString()

//console.log(dgs)

let hashDG = JSON.parse(dgs).dg
//console.log(hashDG)
async function uploadDG() {
    for (const key of Object.keys(hashDG)) {
        let dg = hashDG[key]
        let qry = `${serverUrl}/model/DG/${dg.name}`  //todo check type of model -
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


uploadDG()