#!/usr/bin/env node
//Import a Q from the designer (assumed to be at localhost:9099) - strip off all the hiso extensions and save to the RI db

const axios = require('axios')
let fs = require('fs')
// let designerServer = "http://localhost:9099/baseR4/"
let designerServer = "http://canshare.co.nz:9099/baseR4/"


//let id = "cf-1651524261297"
//let contextType = "request"

//let id = "cf-1652818555820"
//let contextType = "report"

let RIServer = "http://localhost:8080/fhir/"


let keeplist = {}      //a list of all the extension urls to keep
keeplist["http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"] = true
keeplist["http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"] = true
keeplist["http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"] = true
keeplist["http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"] = true


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
        context.valueCodeableConcept = {coding:[{code:contextType,system:"http://canshare.co.nz/CodeSystem/Qtypes"}]}
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
            if (item.extension) {
                let extCopy = JSON.parse(JSON.stringify(item.extension))
                delete item.extension
                extCopy.forEach(function (ext) {
                    if (keeplist[ext.url]) {
                        item.extension = item.extension || []
                        item.extension.push(ext)
                    }

                })
            }


        }

        //console.log(Q)
    } catch(ex) {
        console.log('error',ex)
    }


}

let id = "cf-1652818555820"
let contextType = "report"
process(id)

/*
id = "cf-1651524261297"
contextType = "request"
process(id)

*/