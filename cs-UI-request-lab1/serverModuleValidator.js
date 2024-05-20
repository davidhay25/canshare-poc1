const axios = require("axios");


let serverBase = "http://test.canshare.co.nz:8080/fhir/"
async function setup(app) {


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