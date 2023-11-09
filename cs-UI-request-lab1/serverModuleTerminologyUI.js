//functions to provide terminology services
//don't use ajax as need to inject tokens when accessing the NZHTS

const axios = require("axios");
const fs = require("fs")
//const commonModule = require("./serverModuleCommonUI");

const commonModule = require("./serverModuleCommonUI.js")

let jwt_decode = require( "jwt-decode")
console.log(jwt_decode)
let library = require("./library.json")


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


async function getNZHTSAccessToken() {
    url = "https://authenticate.nzhts.digital.health.nz/auth/realms/nzhts/protocol/openid-connect/token"
    let body =`grant_type=client_credentials&client_id=${nzhtsconfig.clientId}&client_secret=${nzhtsconfig.clientSecret}`
    try {
        let result = await axios.post(url,body)
        //console.log(result.data['access_token'])
        return result.data['access_token']
    } catch (ex) {
        console.log(ex)
        return null
    }
}



function setup(app) {


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


    //make an ECL query

    app.get('/nzhts/ecl',async function(req,res){
        console.log(req.query)

        let encodedEcl =encodeURIComponent(req.query.qry)

        let qry = `${nzhtsconfig.serverBase}ValueSet/$expand?url=http://snomed.info/sct?fhir_vs=ecl/${encodedEcl}`

        qry += "&displayLanguage=en-x-sctlang-23162100-0210105"

        console.log(qry)

        let token = await getNZHTSAccessToken()
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
                    res.status(ex.response.status).json(ex.response.data)
                } else {
                    res.status(500).json(ex)
                }

            })
        } else {

            res.status(500).json({msg:"Unable to get Access Token."})
        }

    })



    //queries against the Terminology Server
    app.get('/nzhts',async function(req,res){
        console.log(`nzhts query: ${req.query.qry}`)


        let headers = req.headers
        //console.log(headers)
        //console.log(headers['x-ts-instance'])

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
            console.log(qry)

            let token = await getNZHTSAccessToken()
            if (token) {

                var decoded = jwt_decode(token);
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
        } else {
            res.status(400).json({msg:"Must have urlencoded qry query"})

        }





        //res.send(token)

    })


    //used for $translate
    app.post('/nzhts',async function(req,res){
        console.log(req.body)

       // res.json({})
        //return
        //disabling wth term server down...

      //  res.json()

     //   return

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





        //res.send(token)

    })


    //use when updating a ValueSet
    app.put('/nzhts/ValueSet',async function(req,res){


        let vs = req.body
        //console.log(vs)


        if (vs) {

            let qry = `${nzhtsconfig.serverBase}ValueSet/${vs.id}`

            //console.log(qry)

            let token = await getNZHTSAccessToken()
            if (token) {

                //var decoded = jwt_decode(token);
                // let timeToExpire = decoded.exp * 1000 - Date.now()       //exp is in seconds
                // console.log(timeToExpire / (1000 * 60 *60 ));

                let config = {headers:{authorization:'Bearer ' + token}}
                config['content-type'] = "application/fhir+json"

                axios.put(qry,req.body,config).then(function(data) {
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





        //res.send(token)

    })


    //return a list of Q where a particular ValueSet is used
    //todo - this might be useful in the designer
    app.get('/term/findQusingVS',async function (req,res) {
        let vsUrl = req.query.url

        let hash = await commonModule.findQusingVS(vsUrl)
        console.log('hash',hash)
        res.json(hash)

    })

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