//functions to provide terminology services
//don't use ajax as need to inject tokens when accessing the NZHTS

const axios = require("axios");
//const commonModule = require("./serverModuleCommonUI");

function setup(app) {
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