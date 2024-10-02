//functions to provide terminology services
//don't use ajax as need to inject tokens when accessing the NZHTS

const axios = require("axios");
const fs = require("fs")
//const { v4: uuidv4 } = require('uuid'); // For generating unique IDs
const commonModule = require("./serverModuleCommonUI.js")

let jwt_decode = require( "jwt-decode")

//A hash to hold async long running jobs - eg batch updating Valuesets or setting sync
let jobs = {}

//load the config file for accessing NZHTS (the file is excluded from git)
const nzhtsconfig = JSON.parse(fs.readFileSync("./nzhtsconfig.config").toString())
//console.log(nzhtsconfig)

//let nztsBase = "https://authoring.nzhts.digital.health.nz/fhir/" //? mpve to config
/*
let servers = []

//servers.push({display:"CanShare",url:"http://localhost:9199/baseR4/"})
servers.push({display:"CanShare",url:"http://localhost:8080/fhir/"})
servers.push({display:"Public hapi R4",url:"http://hapi.fhir.org/baseR4/"})
servers.push({display:"Terminz",url:"https://terminz.azurewebsites.net/fhir/"})
servers.push({display:"Ontoserver",url:"https://r4.ontoserver.csiro.au/fhir/"})
*/
let currentToken = {token:null,expires:null}    //expires is the date.getTime() of when the token expires



async function getNZHTSAccessToken() {


    //If there is a saved token then check the expiry and if not expired then return immediately.
    //Otherwise, get a new token.
    //Set the validity to 1 hour...
    if (currentToken.token) {
        let now = new Date().getTime()
        if (now < currentToken.expires) {
            //console.log('re-use token')
            return currentToken.token
        }
    }

    let url = "https://authenticate.nzhts.digital.health.nz/auth/realms/nzhts/protocol/openid-connect/token"
    let body =`grant_type=client_credentials&client_id=${nzhtsconfig.clientId}&client_secret=${nzhtsconfig.clientSecret}`
    try {
        let result = await axios.post(url,body)
        //if here, then we need a new token
        //console.log('new token')
        let expires = result.data['expires_in']     //number of seconds till expiry. Currently 24 hours...
        currentToken.token = result.data['access_token']
        //set the expiry to an hour (even though, in theory, we have 24 hours)
        currentToken.expires = new Date().getTime() + 60 * 60 * 1000
        return currentToken.token
    } catch (ex) {
        console.log(ex)
        return null
    }
}


function setup(app) {

    //get the status of a specific job
    app.get('/job/status/:token',function (req,res) {
        let status = jobs[req.params.token]
        if (status) {
            res.json(status)
        } else {
            res.status(404).send({msg:'Not found'})
        }
    })

    //get the status of all jobs
    app.get('/job/list',function (req,res) {
        res.json(jobs)
    })



    app.get('/token',async function (req,res) {
        let token = await getNZHTSAccessToken()
        res.json({token:token,url:"https://authoring.nzhts.digital.health.nz/fhir"})
    })

    //Analyse the unpublished codes. Specifically wanting to check if there are unpublished codes in a VS
    //that have since been published. In this case the VS will need to be updated (removing the unpublished code -
    //as we assume that the VS ECL now incorporates those codes). The CodeSystem is re-built from codes that
    //remain unpublished. This routine just perfroms the analysis and creates the updated VS / CS. It doesn't u[date the server.
    app.get('/analyseUnpublished',async function(req,res){
        let token = await getNZHTSAccessToken()
        if (token) {
            let identifier = "http://canshare.co.nz/fhir/NamingSystem/valuesets%7c"

            let qry = `https://authoring.nzhts.digital.health.nz/fhir/ValueSet?identifier=${identifier}&_count=5000&_summary=false`
            let config = {headers:{authorization:'Bearer ' + token}}
            config['content-type'] = "application/fhir+json"

            //get all the CanShare valuesets...
            axios.get(qry,config).then(async function(data) {
                let bundle = data.data
                let arLog = []              // key metrics to dsiplay
                let arChanges = []          //codes that were unpublished, but have now been published
                let hashUnpublished = {}               //a hash of all unpublished concepts by code.
                let cntVSBefore = 0           //count of ValueSets with unpublished codes
                let cntVSAfter = 0


                //Because it would take a long time to individually check eac concept by calling $lookup. we create
                //a valueset containing all the codes then expand it. If the expansion contains the code then it was found.
                //if not, then it wasn't
                //create a ValueSet with all unpublished
                let vsId = 'canshare-all-unpublished'
                let url = `https://nzhts.digital.health.nz/fhir/ValueSet/${vsId}`
                let vs = {resourceType:'ValueSet',id:vsId,status:'draft',experimental:false}        //draft VS won't be syndicated

                vs.url = url
                vs.name = vsId
                vs.version = 1
                vs.identifier = [{system:"http://canshare.co.nz/fhir/NamingSystem/valuesets",value:vsId}]
                vs.publisher = "Te Aho o Te Kahu"
                let include = {system:"http://snomed.info/sct",concept:[]}
                vs.compose = {include: []}
                vs.compose.include.push(include)

                //go through all the CanShare VS and find all unpublished codes
                for (const entry of bundle.entry) {
                    let vs = entry.resource
                    if (vs.compose && vs.compose.include) {
                        let pos = -1
                        for (const inc of vs.compose.include) {
                            if (inc.system == "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished") {
                                cntVSBefore ++
                                for (const concept of inc.concept) {
                                    //we check that the conceptcode is numeric (it should always be). It it isn't then the expansion will barf...
                                    if (isNumericString(concept.code)) {
                                        if (!hashUnpublished[concept.code]) {
                                            include.concept.push({code:concept.code,display:concept.display})
                                            hashUnpublished[concept.code] = concept
                                        }
                                    } else {
                                        arLog.push(`ValueSet '${vs.id}' has a non-numeric 'unpublished' code - ${concept.code}`)
                                    }
                                }
                            }
                        }
                    }
                }

                arLog.push(`There are currently ${include.concept.length} unique concepts in all ValueSets unpublished entries`)

                //save the ValueSet so we can expand it...
                let vsUpdateQry = `${nzhtsconfig.serverBase}ValueSet/${vsId}`
                await axios.put(vsUpdateQry,vs,config)//now expand it

                //now expand it
                let vsExpandQry = `https://authoring.nzhts.digital.health.nz/fhir/ValueSet/$expand?url=${url}`
                console.log(vsExpandQry)
                let result = await axios.get(vsExpandQry,config)

                arLog.push(`There are ${result.data.expansion.total} concepts in the ValueSet expansion (ie codes that are in a VS as unpublished, but have been published since the VS was updated)`)

                //create a hash for the concepts that are now in the TS - ie all those that are in the VS expansion
                let hasCodesNowInTS = {}
                result.data.expansion.contains.forEach(function (concept) {
                    hasCodesNowInTS[concept.code] = concept
                })

                //now we can create the CodeSystem - and the hash which has the codes the are in the TS so cab ne removed from the
                let hashStillUnpublished = {}   //the concepts that remain unpublished

                let cs = {resourceType:'CodeSystem',id:"canshare-unpublished-concepts",version:"1",status:"active"}
                cs.name = cs.id
                cs.identifier = {value:cs.id,system:"http://canshare.co.nz/fhir/NamingSystem/codesystems"}
                cs.publisher = "Te Aho o Te Kahu"
                cs.content = "complete"
                cs.concept = []

                //go through all the codes from the VS marked as unpublished...
                for (const code of Object.keys(hashUnpublished)) {
                    if (! hasCodesNowInTS[code]) {
                        //this code is still not in the TS so it needs to be added to the CS
                        cs.concept.push(hashUnpublished[code])
                        hashStillUnpublished[code] = hashUnpublished[code]
                    }
                }
                //at this point the CS has been created
                arLog.push(`The updated CodeSystem will have ${cs.concept.length} concepts in it - down from ${include.concept.length}.`)

                //Now we can update the valueSets
                //create a batch to hold the VS that will need to be updated
                let batch = {resourceType:"Bundle",type:'transaction',entry:[]}

                let updateBatch = {resourceType:"Bundle",type:'transaction',entry:[]}

                //and a hash to hold the original (so we can show a diff in the UI
                let hashOriginal = {}
                for (const entry of bundle.entry) {
                    let vs = entry.resource
                    let isChanged = false

                    if (vs.compose && vs.compose.include ) {
                        let pos = -1    //this will be the position of the specific include element within the compose.include array...
                        for (const inc of vs.compose.include) {
                            pos ++
                            if (inc.system == "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished") {
                                //there is at least 1 unpublished code
                                //this will be the new include
                                hashOriginal[vs.id] = JSON.parse(JSON.stringify(vs))    //a clone as we may be updating the original

                                let arNewConceptList = []   //this will be the set of concepts still unpublished for this VS
                                for (const concept of inc.concept) {
                                    //if it's still unpublished, add it to the list...
                                    if (hashStillUnpublished[concept.code]) {
                                        arNewConceptList.push(concept)
                                    } else {
                                        //otherwise make a note that it is now published
                                        arChanges.push(`vs ${vs.id} ${concept.code} now published`)
                                        isChanged = true    //so we know this VS has changes
                                    }
                                }

                                //if there are still unpublished codes then we can update the include. Otherwise it is removed
                                if (arNewConceptList.length == 0) {
                                    vs.compose.include.splice(pos,1)
                                } else {
                                    cntVSAfter ++
                                    inc.concept = arNewConceptList
                                }

                                //this is the bundle of all VS with unpublished
                                let entry = {resource:vs}      //todo - add transaction update stuff
                                batch.entry.push(entry)
                                if (isChanged) {
                                    //only add to the bundle if changed

                                    updateBatch.entry.push(entry)
                                }

                                break

                            }
                        }
                    }
                }


                arLog.push(`There are ${cntVSBefore} ValueSets with unpublished codes. ${cntVSAfter} of them still have some after the check.`)
                arLog.push(`There are ${updateBatch.entry.length} ValueSets that will need to be updated.`)

                //res.json(result.data)

                res.json({log:arLog,cs:cs,batch:batch,hashOriginal:hashOriginal,arChanges:arChanges,updateBatch:updateBatch})
            }).catch(function(ex) {
                if (ex.response) {
                    res.status(ex.response.status).json(ex.response.data)
                } else {
                    res.status(500).json(ex.message)
                }

            })
        } else {

            res.status(500).json({msg:"Unable to get Access Token."})
        }

        function isNumericString(str) {
            return str.split('').every(char => !isNaN(char));
        }

    })

    //perform a query against the NZHTS.
    //right now, we get a new access token for each call - todo make more efficient

    let cachedAnalysis;         //cache the analysis. Just for dev as I'm impatient

    app.get('/analyseVSDEP',async function(req,res){
        if (cachedAnalysis) {
            res.json(cachedAnalysis)
        } else {
            let token = await getNZHTSAccessToken()
            if (token) {
                let config = {headers:{authorization:'Bearer ' + token}}
                config['content-type'] = "application/fhir+json"

                let analysis = {vsLength:[],conceptVS:{}}

                let qry = "https://authoring.nzhts.digital.health.nz/fhir/ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c"

                axios.get(qry,config).then(async function(data) {
                    let bundle = data.data      //all canshare vs
                    for (const entry of bundle.entry) {
                        let vs = entry.resource
                        let qryVs = `https://authoring.nzhts.digital.health.nz/fhir/ValueSet/$expand?url=${vs.url}&displayLanguage=en-x-sctlang-23162100-0210105`
                        let response = await axios.get(qryVs,config)
                        let expandedVS = response.data

                        if (expandedVS.expansion && expandedVS.expansion.contains) {
                            analysis.vsLength.push({url:expandedVS.url,title:vs.title,expandedCount:expandedVS.expansion.contains.length})
                            console.log(qryVs,expandedVS.url,expandedVS.expansion.contains.length)
                            for (const concept of expandedVS.expansion.contains) {
                                let key = `${concept.system}|${concept.code}|`
                                analysis.conceptVS[key] = analysis.conceptVS[key] || {concept:concept,vs:[]}
                                analysis.conceptVS[key].vs.push(expandedVS.url)
                            }

                            //now create the has of concept vs valueset

                        } else {
                            analysis.vsLength.push({url:expandedVS.url,expandedCount:0})
                        }




                    }
                    cachedAnalysis = analysis
                    res.json(analysis)


                }).catch(function(ex) {
                    console.log(ex)
                    if (ex.response) {
                        res.status(ex.response.status).json(ex.response.data)
                    } else {
                        res.status(500).json(ex)
                    }

                })


            }

        }


    })

    //expand multiple VS and return single list of concepts
    app.post('/nzhts/expandMultipleVs',async function(req,res){
        let arVsUrl = req.body
        let lstConcepts = []    //the list that will be returned
        let hashConcepts = {}   //concepts keyed on code+system
        //console.log(arVsUrl)
        let token = await getNZHTSAccessToken()
        if (token) {
            let config = {headers:{authorization:'Bearer ' + token}}
            config['content-type'] = "application/fhir+json"

            try {
                for (const url of arVsUrl){
                    let qry = `${nzhtsconfig.serverBase}ValueSet/$expand?url=${url}&displayLanguage=en-x-sctlang-23162100-0210105`
                    let result = await axios.get(qry,config)
                    let vs = result.data
                    if (vs && vs.expansion && vs.expansion.contains) {
                        for (const item of vs.expansion.contains) {
                            let concept = {code:item.code,display:item.display,system:item.system}
                            let key = `${concept.code}-${concept.system}`
                            hashConcepts[key] = concept

                        }

                    }
                }
                //console.log(hashConcepts)

                for (const key of Object.keys(hashConcepts)) {
                    lstConcepts.push(hashConcepts[key])
                }

                lstConcepts.sort(function (a,b) {
                    let display1 = a.display || ""
                    let display2 = b.display || ""
                    if (display1 > display2) {
                        return 1
                    } else {
                        return -1
                    }

                })

                res.json(lstConcepts)

            } catch (ex) {
                if (ex.response) {
                    res.status(ex.response.status).json(ex.response.data)
                } else {
                    res.status(500).json(ex)
                }

            }

        }


    })

    //get syndication status

    app.get('/nzhts/syndStatus',async function(req,res){
        let resourceType = req.query.resourceType
        let id = req.query.id

        let qry = `https://authoring.nzhts.digital.health.nz/synd/getSyndicationStatus?id=${id}&resourceType=${resourceType}`

        let token = await getNZHTSAccessToken()
        if (token) {

            //var decoded = jwt_decode(token);
            // let timeToExpire = decoded.exp * 1000 - Date.now()       //exp is in seconds
            // console.log(timeToExpire / (1000 * 60 *60 ));

            let config = {headers:{authorization:'Bearer ' + token}}
            config['content-type'] = "application/fhir+json"

            axios.get(qry,config).then(function(data) {
                //console.log(data.data)
                res.json(data.data)
            }).catch(function(ex) {
                if (ex.response) {
                    res.status(ex.response.status).json(ex.response.data)
                } else {
                    res.status(500).json(ex)
                }

            })
        } else {

            res.status(500).json({msg:"Unable to get Access Token."})
        }


    })

    //make an ECL query
    app.post('/nzhts/ecl',async function(req,res){

        let ecl = req.body.ecl      //raw ecl

        if (ecl) {
            let encodedEcl =encodeURIComponent(ecl)
            let qry = `${nzhtsconfig.serverBase}ValueSet/$expand`// ?url=http://snomed.info/sct?fhir_vs=ecl/${encodedEcl}`
            let param = {resourceType:'Parameters',parameter:[]}

            let vo = {}// {url:"http://snomed.info/sct?fhir_vs=ecl"}
            let p1 = {name:'url',valueUri:`http://snomed.info/sct/21000210109?fhir_vs=ecl/${encodedEcl}`}
            let p3 = {name:'displayLanguage',valueString:`en-x-sctlang-23162100-0210105t`}

            param.parameter.push(p1)
            param.parameter.push(p3)

            let token = await getNZHTSAccessToken()
            if (token) {
                let config = {headers:{authorization:'Bearer ' + token}}
                config['content-type'] = "application/fhir+json"

                axios.post(qry,param,config).then(function(data) {
                    res.json(data.data)
                }).catch(function(ex) {
                    if (ex.response) {
                        console.log(ex.response.data)
                        res.status(ex.response.status).json(ex.response.data)
                    } else {
                        res.status(500).json(ex)
                    }

                })
            } else {
                res.status(500).json({msg:"Unable to get Access Token."})
            }
        } else {
            res.status(400).json({msg:"Empty ECL"})
        }


    })



    //queries against the Terminology Server

    app.get('/nzhts',async function(req,res){
        let query = req.query.qry




        let headers = req.headers


        //The instance of the TS server that will be queried
        let tsInstance = nzhtsconfig.serverBaseAuthor
        if (headers['x-ts-instance'] == 'prod') {
            tsInstance = nzhtsconfig.serverBaseProd
        }

        //disabling wth term server down...

        //let qry = req.query.query || `https://authoring.nzhts.digital.health.nz/fhir/ValueSet/$expand?url=https://nzhts.digital.health.nz/fhir/ValueSet/canshare-data-absent-reason`
        if (req.query.qry) {
            //let qry = nzhtsconfig.serverBase +  decodeURIComponent(req.query.qry)
            let qry = tsInstance +  decodeURIComponent(req.query.qry)

            //need to re-urlencode the |
            qry = qry.split('|').join("%7c")

            //todo - check expiry and refresh if needed
           // console.log(qry)

            let token = await getNZHTSAccessToken()
            console.log(`nzhts query: ${req.query.qry}`)
            if (token) {

                var decoded = jwt_decode(token);
               // let timeToExpire = decoded.exp * 1000 - Date.now()       //exp is in seconds
               // console.log(timeToExpire / (1000 * 60 *60 ));

                let config = {headers:{authorization:'Bearer ' + token}}
                config['content-type'] = "application/fhir+json"

                axios.get(qry,config).then(function(data) {

                    res.json(data.data)

                }).catch(function(ex) {
                    if (ex.response) {
                        //console.log("----- NOT found -----")
                        res.status(ex.response.status).json(ex.response.data)
                    } else {
                        res.status(500).json(ex)
                    }

                })
            } else {

                res.status(500).json({msg:"Unable to get Access Token."})
            }
        } else {
            res.status(400).json({msg:"Must have urlencoded qry query"})

        }


    })


    app.get('/generateQADEP',async function(req,res){

        let token = await getNZHTSAccessToken()

        if (token) {
            let config = {headers:{authorization:'Bearer ' + token}}
            config['content-type'] = "application/fhir+json"
            let report = []
            let inx=0
            let qry = `${nzhtsconfig.serverBase}ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c&_count=5000`
            console.log(qry)
            let response = await axios.get(qry, config)
            let bundle = response.data
            for (const entry of bundle.entry) {
                let vs = entry.resource
                let ar = [vs.url]

                let qryExpand = `${nzhtsconfig.serverBase}ValueSet/${vs.id}/$expand`
                let resp = await axios.get(qryExpand, config)
                let url = resp.data.url

                ar.push(url)
               // ar.push(
                console.log(inx++)
                let lne = ar.join(',')
                report.push(lne)


            }
            res.json(report)

        } else {
            res.json({})
        }

    })


    //POST a bundle to the server. Used for ValueSet batch upload & Unpublished codes
    //Actually, Ontoserver won't allow a batch to have PUT so we can't use that. Instead, we process each item individually...
    app.post('/nzhts/bundle',async function(req,res){

        if (req.body) {
            //let qry = nzhtsconfig.serverBase //
            let bundle = req.body
            let token = await getNZHTSAccessToken()
            if (token) {

                let jobId = Object.keys(jobs).length + 1 //Job id is the new length of the jobs hash
                jobs[jobId] = {status:'active',description:"Process bundle"}

                //an async call, but we won't wait
                processPutBundleJob(token,jobId,bundle)

                res.json({jobId:jobId,status:"active"})

            } else {
                res.status(ex.response.status).json({msg:"Unable to get Access Token."})
            }
        } else {
            res.status(400).json({msg:"Must have bundle as body"})
        }
    })

    async function processPutBundleJob(token,jobId,bundle) {
        let config = {headers:{authorization:'Bearer ' + token}}
        config['content-type'] = "application/fhir+json"
        let ctr = 0
        let cnt = bundle.entry.length
        for (const entry of bundle.entry) {
            //assume it's a PUT update
            ctr++
            let updateQry = `https://authoring.nzhts.digital.health.nz/fhir/${entry.resource.resourceType}/${entry.resource.id}`

            try {
                await axios.put(updateQry,entry.resource,config)
                jobs[jobId].progress = ` ${ctr}/${cnt}`
                console.log(entry.resource.id)


            } catch (ex) {
                jobs[jobId].status = `error`
                if (ex.response) {
                    jobs[jobId].httpStatus = ex.response.status
                    jobs[jobId].httpError = ex.response.data

                } else if (ex.message){
                    jobs[jobId].error = ex.message
                }
                else {
                    console.log(ex)
                }
            }

        }
        jobs[jobId].status = `complete`
    }


    //set the syndication status for all resources
    //creates a long running job and returns immediately
    app.post('/nzhts/setSyndication',async function(req,res) {
        let token = await getNZHTSAccessToken()
        if (token) {

            let jobId = Object.keys(jobs).length + 1 //Job is is the new length of the jobs hash
            jobs[jobId] = {status:'active',description:"Set syndication status for all"}

            //it's an async function, but we don't wait for it to finish
            setSyndicationForAllJob(token,jobId)
            res.json({jobId:jobId,status:"active"})

        } else {
            res.status(ex.response.status).json({msg:"Unable to get Access Token."})
        }
    })


    //A job that will set the synd. status for all resources
    async function setSyndicationForAllJob(token,jobId) {
        let serverHost = "https://authoring.nzhts.digital.health.nz/"
        let config = {headers:{authorization:'Bearer ' + token}}
        config['Content-Type'] = "application/fhir+json"
        try {

            //set the codesystem
            let csId = "canshare-unpublished-concepts"

            const csOptions = {
                method: 'POST',
                url: `${serverHost}synd/setSyndicationStatus`,
                params: {resourceType: 'CodeSystem', id: csId, syndicate: 'true'},
                headers: {'Content-Type': 'application/json', authorization:'Bearer ' + token},
            };

            const { csData } = await axios.request(csOptions)
            jobs[jobId].progress = `${csId} done`

            //Set ConceptMaps.
            for (cmId of ['canshare-select-valueset-map','canshare-select-valueset-map-dev']) {
                const options = {
                    method: 'POST',
                    url: `${serverHost}synd/setSyndicationStatus`,
                    params: {resourceType: 'ConceptMap', id: cmId, syndicate: 'true'},
                    headers: {'Content-Type': 'application/json', authorization:'Bearer ' + token},

                };

                const { data } = await axios.request(options);
                jobs[jobId].progress = `${cmId} done`
            }





            //now the ValueSets
            //get the canshare valueset list
            let qry = `${serverHost}fhir/ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c&_count=5000`
            let response = await axios.get(qry,config)
            let bundle = response.data
            let ctr = 0
            let cnt = bundle.entry.length
            for (const entry of bundle.entry) {
                let vs = entry.resource

                if (vs.status !== 'draft') {
                    //set the syndication status unless draft status
                    const options = {
                        method: 'POST',
                        url: `${serverHost}synd/setSyndicationStatus`,
                        params: {resourceType: 'ValueSet', id: vs.id, syndicate: 'true'},
                        headers: {'Content-Type': 'application/json', authorization:'Bearer ' + token},
                    };
                    ctr++
                    console.log(vs.url)
                    const { data } = await axios.request(options);
                    jobs[jobId].progress = `VS ${ctr}/${cnt}`
                }



            }
            //arLog.push(`${bundle.entry.length} ValueSets updated`)

            jobs[jobId].status = `complete`
            //res.json(arLog)

        } catch(ex) {
            jobs[jobId].status = `error`
            if (ex.response) {
                jobs[jobId].httpStatus = ex.response.status
                jobs[jobId].error = ex.response.data

            } else if (ex.message){
                jobs[jobId].error = ex.message
            }
            else {
                console.log(ex)
            }

        }
    }

    //=========================



    //get a Codesystem based on it's id

    //use when updating a CodeSystem
    app.put('/nzhts/CodeSystem',async function(req,res){

        let cs = req.body

        if (cs) {
            let qry = `${nzhtsconfig.serverBase}CodeSystem/${cs.id}`
            let result = await putResource(qry,cs)
            if (result) {
                //A result is returned if there is an error
                res.status(400).json({msg:result})
                return
            }
            res.json()      //no error

        } else {
            res.status(400).json({msg:"Must have urlencoded qry query"})

        }
    })

    //use when updating a ValueSet
    app.put('/nzhts/ValueSet',async function(req,res){

        let vs = req.body

        if (vs) {
            let qry = `${nzhtsconfig.serverBase}ValueSet/${vs.id}`
            let noSyndicate = false
            if (vs.status && vs.status == 'draft') {
                noSyndicate = true
            }
            let result = await putResource(qry,vs,noSyndicate)
            if (result) {
                //A result is returned if there is an error
                res.status(400).json({msg:"Unable to update ValueSet"})
                return
            }
            res.json()      //no error
        } else {
            res.status(400).json({msg:"Must have urlencoded qry query"})

        }
    })

    //use when updating a ConceptMap
    app.put('/nzhts/ConceptMap/:id',async function(req,res){

        let cm = req.body

        if (cm) {
            let qry = `${nzhtsconfig.serverBase}ConceptMap/${cm.id}`
            let result = await putResource(qry,cm)
            if (result) {
                //A result is returned if there is an error
                res.status(400).json({msg:"Unable to update ConceptMap"})
                return
            }
            res.json()      //no error
        } else {
            res.status(400).json({msg:"Must have urlencoded qry query"})

        }
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


async function setSyndicationStatus(resource,token) {

    //        let qry = `https://authoring.nzhts.digital.health.nz/synd/getSyndicationStatus?id=${id}&resourceType=${resourceType}`

    const csOptions = {
        method: 'POST',

        url: `https://authoring.nzhts.digital.health.nz/synd/setSyndicationStatus`,

        params: {resourceType: resource.resourceType, id: resource.id, syndicate: 'true'},
        headers: {'Content-Type': 'application/json', authorization: 'Bearer ' + token},

    }

    try {
        console.log('setting syndication status')
        let result = await axios.request(csOptions);
        console.log('ok')
        return true
    } catch (ex) {

        if (ex.response) {
            console.log("Status code:", ex.response.status)
            console.log("err", ex.response.data)
            return ex.response.data
        } else {
            return {msg: "Undefined error"}
        }
    }

}


//put a single resource. Returns any error
async function putResource(qry,resource,noSyndicate) {

    //let qry = `${nzhtsconfig.serverBase}ValueSet/${vs.id}`
    let token = await getNZHTSAccessToken()
    if (token) {

        let config = {headers:{authorization:'Bearer ' + token}}
        config['content-type'] = "application/fhir+json"


        try {
            //console.log('put',qry,JSON.stringify(resource,null,2))
            let result = await axios.put(qry,resource,config)
            //console.log('ok')

            //we always want to set the syndication status
            //just temp copied out for now
            //if it fails will trigger an exception
          if (! noSyndicate) {
              await setSyndicationStatus(resource,token)
          }

           // return response



        } catch (ex) {

            if (ex.response) {
                console.log("Status code:",ex.response.status)
                console.log("err",ex.response.data)
                return ex.response.data
            } else {
                return {msg:"Undefined error"}
            }
        }

/*
        let result = await axios.put(qry,resource,config).then(function(data) {
            return  //return null if no issues
        }).catch(function(ex) {
            //console.log('result',result)
            if (ex.response) {
                console.log("Status code:",ex.response.status)
                console.log("err",ex.response.data)
                 return ex.response.data
            } else {
                return "Undefined error"
            }
        })
        */


    } else {
        console.log("Token not acquired")
        return "Token not acquired"
    }


}

module.exports = {
    setup : setup
};