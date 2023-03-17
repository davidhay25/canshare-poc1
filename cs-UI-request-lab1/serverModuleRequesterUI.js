//endpoints used by the requester UI component

const axios = require("axios");
const showLog = true

let serverBase = process.env.SERVERBASE         //the location of the FHIR server
//ensure serverBase has the trailing slash
if (serverBase[serverBase.length-1] !== '/') {
    serverBase += '/'
}
let requestEndpoint = process.env.CUSTOMOPS + "$acceptRequest"  //where the request bundle is sent
let testExtractEndpoint = process.env.CUSTOMOPS + "testExtraction"  //the EP that will extract the resources


let db
//set the database, source server and backup API points
function setup(app,inDb) {

    db = inDb



    //validate endpoint. will call the $validate operation on the server
    app.post('/requester/validate',async function(req,res){
        let resource = req.body         //may be a single resource or a bundle
        let type = resource.resourceType

        let qry = `${serverBase}${type}/$validate`
        //let qry = serverBase + "/csValidate"
        try {
            let response = await axios.post(qry,resource)
            let bundle = response.data
            res.json(bundle)
        } catch (ex) {
            res.json(ex.response.data)
        }
    })

    //tests the extraction from the QR
    app.post('/requester/extract',async function(req,res){
        let body = req.body

        console.log("Posting to " + testExtractEndpoint)

        try {
            //returns a bundle & validation OO (ie not a FHIR endpoint ATM) {bundle: , oo:}
            let response = await axios.post(testExtractEndpoint,body)
            let vo = response.data
            res.json(vo)
        } catch (ex) {
            if (ex.response) {
                res.json(ex.response.data)
            } else {
                res.json(ex)
            }

        }
    })


    //the request templates
    app.get('/requester/templates',async function(req,res){

        let qry = serverBase + "/Questionnaire?context=request"
        try {
            let response = await axios.get(qry)
            let bundle = response.data
            res.json(bundle)
        } catch (ex) {
            res.status(500).json(ex)
        }
    })


    //send a request from the requester UI to the IE. Assume that this is a bundle, so just send it
    app.post('/requester/makerequest', async function(req,res){
        if (showLog) {
            console.log("local UI function /requester/makerequest invoked")
        }
        let body = req.body

        //let url = config.canShare.requestEndPoint.url
        //post the request transaction to the custom endpoint
        try {
            let response = await axios.post(requestEndpoint,body)

            res.send(response.data)
        } catch (err) {
            //the server (node red) returned an error status code.

            if (err.response) {
                //console.log('resp')
                res.status(err.response.status).send(err.response.data)
            } else {
                res.status(400).send(err)
            }
        }

    })

    //retrieve forms templates
    app.get('/requester/templates', async function(req,res){
        res.json()

    })

}



module.exports = {
    setup : setup
};