//functions to provide terminology services
//don't use ajax as need to inject tokens when accessing the NZHTS

const axios = require("axios");
const fs = require("fs")
//const commonModule = require("./serverModuleCommonUI");

//going to try caching ValueSets on the server to avoid the expensive calls to the term server.
//
let vsCache = {}
let vsCacheStats = {hit:0,miss:0}

const commonModule = require("./serverModuleCommonUI.js")

let jwt_decode = require( "jwt-decode")
console.log(jwt_decode)
//let library = require("./library.json")


//load the config file for accessing NZHTS (the file is excluded from git)
const nzhtsconfig = JSON.parse(fs.readFileSync("./nzhtsconfig.config").toString())
//console.log(nzhtsconfig)

//let nztsBase = "https://authoring.nzhts.digital.health.nz/fhir/" //? mpve to config

let servers = []

//servers.push({display:"CanShare",url:"http://localhost:9199/baseR4/"})
servers.push({display:"CanShare",url:"http://localhost:8080/fhir/"})
servers.push({display:"Public hapi R4",url:"http://hapi.fhir.org/baseR4/"})
servers.push({display:"Terminz",url:"https://terminz.azurewebsites.net/fhir/"})
servers.push({display:"Ontoserver",url:"https://r4.ontoserver.csiro.au/fhir/"})

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

    app.get('/token',async function (req,res) {
        let token = await getNZHTSAccessToken()
        res.json({token:token,url:"https://authoring.nzhts.digital.health.nz/fhir"})
    })

    app.get('/analyseUnpublished',async function(req,res){
        let token = await getNZHTSAccessToken()
        if (token) {
            let identifier = "http://canshare.co.nz/fhir/NamingSystem/valuesets%7c"

            let qry = `https://authoring.nzhts.digital.health.nz/fhir/ValueSet?identifier=${identifier}&_count=5000&_summary=false`
            let config = {headers:{authorization:'Bearer ' + token}}

            config['content-type'] = "application/fhir+json"


            axios.get(qry,config).then(async function(data) {
                let bundle = data.data
                let arLog = []
                let arChanges = []
                let hash = {}
                let cntVSBefore = 0           //count of ValueSets with unpublished codes
                let cntVSAfter = 0

                //create a ValueSet with all unpublished

                let vsId = 'canshare-all-unpublished'
                let url = `https://nzhts.digital.health.nz/fhir/ValueSet/${vsId}`
                let vs = {resourceType:'ValueSet',id:vsId,status:'active',experimental:false}

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
                                    //console.log(concept)
                                    if (isNumericString(concept.code)) {
                                        if (!hash[concept.code]) {
                                            include.concept.push({code:concept.code,display:concept.display})
                                            hash[concept.code] = concept
                                        }

                                    }
                                }
                            }
                        }
                    }
                }

                arLog.push(`There are ${include.concept.length} unique concepts in all valueset unpublished entries`)

                let vsUpdateQry = `${nzhtsconfig.serverBase}ValueSet/${vsId}`
                await axios.put(vsUpdateQry,vs,config)
                let vsExpandQry = `https://authoring.nzhts.digital.health.nz/fhir/ValueSet/$expand?url=${url}`
                //
                //let vsExpandQry = `${nzhtsconfig.serverBase}ValueSet/${vsId}/$expand`
                console.log(vsExpandQry)
                let result = await axios.get(vsExpandQry,config)

                arLog.push(`There are ${result.data.expansion.total} concepts in the valueset expansion`)

                //create a has for the concepts that are now in the TS
                let hasCodesNowInTS = {}
                result.data.expansion.contains.forEach(function (concept) {
                    hasCodesNowInTS[concept.code] = concept
                })

                //now we can create the CodeSystem - and the hash which has the codes the are in the TS so cab ne removed from the
                //we go through the has of all codes in a VS...
                let hashStillUnpublished = {}   //the concepts that remain unpublished


                let cs = {resourceType:'CodeSystem',id:"canshare-unpublished-concepts",version:"1",status:"active"}
                cs.name = cs.id
                cs.identifier = {value:cs.id,system:"http://canshare.co.nz/fhir/NamingSystem/codesystems"}
                cs.publisher = "Te Aho o Te Kahu"
                cs.content = "complete"
                cs.concept = []

                for (const code of Object.keys(hash)) {
                    if (! hasCodesNowInTS[code]) {
                        //this code is still not in the TS so it needs to be added to the CS
                        cs.concept.push(hash[code])
                        hashStillUnpublished[code] = hash[code]
                    }
                }

                //Now we can update the valueSets
                //create a batch to hold the VS that will need to be updated
                let batch = {resourceType:"Bundle",type:'transaction',entry:[]}
                let updateBatch = {resourceType:"Bundle",type:'transaction',entry:[]}

                //and a hash to hold the original (so we can show a diff in the UI
                let hashOriginal = {}
                for (const entry of bundle.entry) {
                    let vs = entry.resource
                    let isChanged = false

                    if (vs.compose && vs.compose.include) {

                        let pos = -1
                        for (const inc of vs.compose.include) {
                            pos ++
                            if (inc.system == "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished") {
                                //there is at least 1 unpublished code
                                //this will be the new include
                                hashOriginal[vs.id] = JSON.parse(JSON.stringify(vs))
                                //let arNewInclude = {concept:[],system:'http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished"'}
                                let arNewConceptList = []
                                for (const concept of inc.concept) {
                                    //console.log(concept)
                                    if (hashStillUnpublished[concept.code]) {
                                        //arNewInclude.concept.push(concept)
                                        arNewConceptList.push(concept)
                                    } else {
                                        arChanges.push(`vs ${vs.id} ${concept.code} now published`)
                                        isChanged = true
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

    app.get('/analyseVS',async function(req,res){
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
                                   //let qry = `${serverHost}synd/getSyndicationStatus?id=${vs.id}&resourceType=ValueSet`
//console.log(qry)

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




    /*
    app.post('/nzhts/emptycache',function (req,res) {
        vsCache = {}
        vsCacheStats = {hit:0,miss:0}
        res.json({})
    })

    app.get('/nzhts/cachestats',function (req,res) {
        let vo = vsCacheStats
        vo.size = getSizeOfObject(vsCache)
        res.json(vo)

        function getSizeOfObject ( object ) {
            //the memory usage of an obect - from https://stackoverflow.com/questions/1248302/how-to-get-the-size-of-a-javascript-object#11900218
            var objectList = [];
            var stack = [ object ];
            var bytes = 0;

            while ( stack.length ) {
                var value = stack.pop();

                if ( typeof value === 'boolean' ) {
                    bytes += 4;
                }
                else if ( typeof value === 'string' ) {
                    bytes += value.length * 2;
                }
                else if ( typeof value === 'number' ) {
                    bytes += 8;
                }
                else if (
                    typeof value === 'object'
                    && objectList.indexOf( value ) === -1
                ) {
                    objectList.push( value );

                    for( var i in value ) {
                        stack.push( value[ i ] );
                    }
                }
            }
            return bytes;
        }
    })

    */
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


    app.get('/generateQA',async function(req,res){

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
    app.post('/nzhts/bundle',async function(req,res){

        if (req.body) {
            let qry = nzhtsconfig.serverBase //

            let token = await getNZHTSAccessToken()
            if (token) {

                let config = {headers:{authorization:'Bearer ' + token}}
                config['content-type'] = "application/fhir+json"

                axios.post(qry,req.body,config).then(function(data) {
                    res.json(data.data)
                }).catch(function(ex) {

                    if (ex.response) {
                        console.log("Status code:",ex.response.status)
                        console.log("err",ex.response.data)
                        res.status(ex.response.status).json(ex.response.data)
                    } else {
                        res.status(500).json(ex)
                    }

                })
            } else {
                res.status(ex.response.status).json({msg:"Unable to get Access Token."})
            }
        } else {
            res.status(400).json({msg:"Must have bundle as body"})

        }


    })


    app.post('/nzhts/setSyndication',async function(req,res) {
        let serverHost = "https://authoring.nzhts.digital.health.nz/"
        let arLog = []

        let token = await getNZHTSAccessToken()
        if (token) {

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
                arLog.push(`CodeSystem ${csId} update`)

                //Set ConceptMaps. Only a specific CM for now - and a 1-off....
                let cmId = "canshare-select-valueset-map"

                const options = {
                    method: 'POST',
                    url: `${serverHost}synd/setSyndicationStatus`,
                    params: {resourceType: 'ConceptMap', id: cmId, syndicate: 'true'},
                    headers: {'Content-Type': 'application/json', authorization:'Bearer ' + token},

                };

                const { data } = await axios.request(options);
                arLog.push(`ConceptMap ${cmId} update`)


                //now the ValueSets
                //get the canshare valueset list
                let qry = `${serverHost}fhir/ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c&_count=5000`
                let response = await axios.get(qry,config)
                let bundle = response.data
                let ctr = 0
                for (const entry of bundle.entry) {
                    let vs = entry.resource

                    //set the syndication status regardless of current status
                    const options = {
                        method: 'POST',
                        url: `${serverHost}synd/setSyndicationStatus`,
                        params: {resourceType: 'ValueSet', id: vs.id, syndicate: 'true'},
                        headers: {'Content-Type': 'application/json', authorization:'Bearer ' + token},
                    };

                    //console.log(ctr++,vs.url)
                    const { data } = await axios.request(options);

                }
                arLog.push(`${bundle.entry.length} ValueSets updated`)
                res.json(arLog)

            } catch(ex) {

                if (ex.response) {

                    console.log(ex.response.status)
                    console.log(JSON.stringify(ex.response.data,null,2))
                } else {
                    console.log(ex)
                }

            }



        } else {
            res.status(ex.response.status).json({msg:"Unable to get Access Token."})
        }






    })

    //=========================

    //used for $translate
    app.post('/nzhtsDEP',async function(req,res){
        console.log(req.body)


        //let qry = req.query.query || `https://authoring.nzhts.digital.health.nz/fhir/ValueSet/$expand?url=https://nzhts.digital.health.nz/fhir/ValueSet/canshare-data-absent-reason`
        if (req.body) {
            let qry = nzhtsconfig.serverBase + "ConceptMap/$translate" // decodeURIComponent(req.query.qry)

            //need to re-urlencode the |
           // qry = qry.split('|').join("%7c")


            //todo - check expiry and refresh if needed
            console.log(qry)

            let token = await getNZHTSAccessToken()
            if (token) {

                //var decoded = jwt_decode(token);
                // let timeToExpire = decoded.exp * 1000 - Date.now()       //exp is in seconds
                // console.log(timeToExpire / (1000 * 60 *60 ));

                let config = {headers:{authorization:'Bearer ' + token}}
                config['content-type'] = "application/fhir+json"

                axios.post(qry,req.body,config).then(function(data) {
                    res.json(data.data)
                }).catch(function(ex) {

                    if (ex.response) {
                        console.log("Status code:",ex.response.status)
                        console.log("err",ex.response.data)
                        res.status(ex.response.status).json(ex.response.data)
                    } else {
                        res.status(500).json(ex)
                    }

                })
            } else {
                res.status(ex.response.status).json({msg:"Unable to get Access Token."})
            }
        } else {
            res.status(400).json({msg:"Must have urlencoded qry query"})

        }


    })


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
            let result = await putResource(qry,vs)
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

    //return a list of Q where a particular ValueSet is used
    //todo - this might be useful in the designer
    app.get('/term/findQusingVSDEP',async function (req,res) {
        let vsUrl = req.query.url

        let hash = await commonModule.findQusingVS(vsUrl)
        console.log('hash',hash)
        res.json(hash)

    })
/*
    app.get('/conceptMap/all', function(req,res) {
        res.json(allConceptMaps)
    })
*/
    app.get('/termServersDEP', function(req,res) {
        let ar = []
        //only return the display and url
        servers.forEach(function (svr) {
            ar.push({display:svr.display,url:svr.url})
        })
        res.json(ar)
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
async function putResource(qry,resource) {

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
            await setSyndicationStatus(resource,token)
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