/*
*
* These are all endpoints that support the Lab application. They are generally not FHIR compliant as they serve the local application
*/
const axios = require("axios");
const showLog = true
let db

//the utils module is stored in the cs-customops folder. todo ?should we move it to a separate 'common' folder?
const utilModule = require("../cs-customOps/serverModuleUtil.js")

console.log(`FHIR server root from env is ${process.env.SERVERBASE}`)
console.log(`Log database from env is ${process.env.LOGDB}`)
console.log(`Custom ops from env is ${process.env.CUSTOMOPS}`)

/*
let serverBase = process.env.SERVERBASE
if (serverBase[serverBase.length-1] !== '/') {
    serverBase += '/'
}
*/

let serverBase = utilModule.checkUrlSlash(process.env.SERVERBASE)


async function multiQuery(lst) {

}

async function singleQuery(query) {

    let qry = serverBase + query

    console.log('qry=',qry)
    let config = {headers:{'cache-control':'no-cache'}}     //otherwise the hapi server will cache for a minute

    try {
        let response = await axios.get(qry,config)
        let ctr = 0
        let bundle = response.data       //the first bundle

        //console.log(ctr++,bundle.entry.length)

        let nextPageUrl = getNextPageUrl(bundle)
        while (nextPageUrl) {
            let nextResponse = await axios.get(nextPageUrl,config)
            let nextBundle = nextResponse.data
            if (nextBundle.entry) {
                nextBundle.entry.forEach(function (entry) {
                    bundle.entry.push(entry)
                })
            }
            console.log(ctr++,nextBundle.entry.length)
            nextPageUrl = getNextPageUrl(nextBundle)
        }
        bundle.total = 0
        if (bundle.entry) {
            bundle.total = bundle.entry.length
        }


         return bundle
    } catch (ex) {
        if (ex.response && ex.response.status == 404) {
            //if it's a 404 then just return an empty bundle
            return {responseType:"Bundle"}

        } else {
            throw (ex)

        }

    }


}


function getNextPageUrl(bundle) {
    //console.log('gm' + bundle.resourceType)
    let url = null
    if (bundle && bundle.link) {
        bundle.link.forEach(function (link){
            if (link.relation == 'next') {
                url = link.url
            }
        })
    }
    //console.log('next',url)
    return url

}


module.exports = {
    multiQuery : multiQuery,
    singleQuery : singleQuery
};