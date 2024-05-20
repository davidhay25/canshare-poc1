const axios = require("axios");
const commonModule = require("./serverModuleCommonUI");


let serverBase = "http://test.canshare.co.nz:8080/fhir/"
async function setup(app) {


    app.put('/validator/proxy',async function(req,res) {
        //for a put we assume that the content is a single resource that is to be updated

        let vo = req.body
        let qry = vo.qry    //the qry is the server root
        let resource = vo.content

        let fullQry = `${qry}/${resource.resourceType}/${resource.id}`

        console.log(fullQry)
            //the query was url encoded so it could be passed to the server
           // console.log(vo)
            try {
                let result = await axios.put(fullQry,resource)
                res.json(result.data)
            } catch (ex) {

                res.status(400).json(ex)
            }
        }
    )

    app.post('/validator/proxy',async function(req,res) {

            let vo = req.body
            let qry = vo.qry
            let content = vo.content

            //the query was url encoded so it could be passed to the server
         //   console.log(vo)
            try {
                let result = await axios.post(qry,content)
                res.json(result.data)
            } catch (ex) {

                res.status(400).json(ex)
            }
        }
    )


    app.post('/validator/validateBundle', async function (req,res) {
        let bundle = req.body
        if (! bundle || ! bundle.entry) {
            res.status(400).json({msg:"Must contain a bundle. Is the content-type header set to 'application/json' "})
        } else {
            let validationEP = `${serverBase}Bundle/$validate`
            try {
                let response = await axios.post(validationEP,bundle)
                res.json(response.data)
            } catch (ex) {
                res.status(500).json(ex)
            }
        }
    })



}


module.exports = {
    setup : setup
};