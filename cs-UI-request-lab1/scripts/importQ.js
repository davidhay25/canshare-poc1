#!/usr/bin/env node
//Import a Q from the designer (assumed to be at localhost:9099) - strip off all the hiso extensions and save to the RI db

const axios = require('axios')
let fs = require('fs')
let designerServer = "http://localhost:9099/baseR4/"
let RIServer = "http://localhost:8080/fhir/"

let id = "cf-1651524261297"
let keeplist = {}      //a list of all the extension urls to keep



async function process(id) {
    let url = `${designerServer}Questionnaire/${id}`
    console.log(url)
    try {
        let result = await axios.get(url)
        let Q = result.data
        fs.writeFileSync(id+"-raw.json",JSON.stringify(Q))

        //now remove all the extensions apart from the ones in the whitelist
        Q.item.forEach(function (section) {
            cleanItem(section)
            if (section.item) {
                section.item.forEach(function (child) {
                    cleanItem(child)
                    if (child.item) {
                        child.item.forEach(function (gc) {
                            cleanItem(gc)
                        })
                    }
                })
            }
        })

        //add the request context
        let context = {}
        context.code = {code:'focus',system:"http://terminology.hl7.org/CodeSystem/usage-context-type"}
        context.valueCodeableConcept = {coding:[{code:'request',system:"http://canshare.co.nz/CodeSystem/Qtypes"}]}
        Q.useContext = [context]

        Q.title = Q.title + "-clean"


 //now write out the cleaned file
        let outFile = `${id}-clean.json`
        fs.writeFileSync(outFile,JSON.stringify(Q))

        let url1 = `${RIServer}Questionnaire/${id}`
        console.log(url1)
        await axios.put(url1,Q)
        console.log("updated")
       /* try {
            let result = await axios.post(url1,)
        } catch (ex) {
            console.log('error savinq cleaned Q')
        }
*/
        function cleanItem(item) {
            delete item.extension

        }

        //console.log(Q)
    } catch(ex) {
        console.log('error',ex)
    }


}

process(id)