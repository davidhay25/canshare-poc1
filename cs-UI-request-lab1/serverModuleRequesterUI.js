//endpoints used by the requester UI component

const axios = require("axios");
const showLog = true

let serverBase = process.env.SERVERBASE
let requestEndpoint = process.env.CUSTOMOPS + "$acceptRequest"  //where the request bundle is sent
let testExtractEndpoint = process.env.CUSTOMOPS + "testExtraction"  //the EP that will extract the resources


let db
//set the database, source server and backup API points
function setup(app,inDb) {

    db = inDb

    app.get('/requester/validate',async function(req,res){
        let bundle = req.body
        let qry = serverBase + "/csValidate"
        try {
            let response = await axios.post(qry,bundle)
            let bundle = response.data
            res.json(bundle)
        } catch (ex) {
            res.json(ex.response.data)
        }
    })

    //tests the extraction from the QR
    app.post('/requester/extract',async function(req,res){
        let QR = req.body

        console.log("Posting to " + testExtractEndpoint)

        try {
            //returns a list of resources (ie not a FHIR endpoint ATM)
            let response = await axios.post(testExtractEndpoint,QR)
            let list = response.data
            res.json(list)
        } catch (ex) {
            res.json(ex.response.data)
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