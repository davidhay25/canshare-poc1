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


    })

    //make an ECL query
    app.get('/nzhts/ecl',async function(req,res){


        let encodedEcl =encodeURIComponent(req.query.qry)

        let qry = `${nzhtsconfig.serverBase}ValueSet/$expand?url=http://snomed.info/sct?fhir_vs=ecl/${encodedEcl}`

        qry += "&displayLanguage=en-x-sctlang-23162100-0210105"

        //console.log(qry)

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
      //  console.log(`nzhts query: ${req.query.qry}`)

        //the cache is 'opt-in' to avoid tricky cache issues...  It's mostly needed for the LIM forms
        //it will be necessary to manually empty the cache when we update the TS
        //should really only do this when expanding a VS
/*
        let allowcache = req.headers['x-allowcache']

        //if the cache is active then see if the VS is in there
        if (vsCache !== undefined && allowcache == 'yes')  {
            if (vsCache[query]) {
                vsCacheStats.hit++
                if (vsCache[query] == "404") {
                    //the previous query was a 404
                    res.status(404).json({})
                    return
                } else {
                    res.json(vsCache[query])
                    return
                }

            } else {
                //the response is not (yet) in the cache
                vsCacheStats.miss++
            }

        }

*/



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
                    //console.log(data.data)
                    //note that the 'query' variable is the original query sans server
                  /*  if (allowcache == 'yes') {
                        vsCache[query] = data.data
                    }
                    */

                    res.json(data.data)
                   // console.log("----- found -----")
                }).catch(function(ex) {
                    /*
                    if (allowcache == 'yes') {
                        vsCache[query] = 404        //we're assuming that all errors are 404
                    }
                    */
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


    //used for $translate
    app.post('/nzhts',async function(req,res){
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

           // console.log('>>', result)
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


async function setSyndicationStatus(resource,token) {

    const csOptions = {
        method: 'POST',
        url: `${nzhtsconfig.serverBase}synd/setSyndicationStatus`,
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
            console.log('put',qry,JSON.stringify(resource,null,2))
            let result = await axios.put(qry,resource,config)
            console.log('ok')

            //we always want to set the syndication status
            //just temp copied out for now
          //  let response = await setSyndicationStatus(cs,token)
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