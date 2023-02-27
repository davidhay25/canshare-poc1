const { default: axios } = require("axios")
const utilModule = require("./serverModuleUtil.js")

//let serverUrl


function setup(app,serverBase) {
    
    app.post("/([$])acceptActNow",async function(req,res){

        console.log('headers:',req.headers)
        let bundle = req.body
        let metrics = {}
        metrics.start = new Date()

        //if lstIssues length is 0 then no issues were found otherwise there were validation issues. These cannot be ignored.
        let lstIssues = utilModule.level1Validate(bundle)
        if (lstIssues.length > 0) {
            
            let oo = utilModule.makeOO(lstIssues)
            utilModule.logger("actnow",{content:bundle,outcome:oo,headers:req.headers,status:400,metrics:metrics})
            res.status("400").json(oo)
            return
        }

        //todo perform profile validation - ? optional

        //POST the bundle to the root of the FHIR server (it's a transaction) and return the HTTP
        //will also do the logging
        metrics.end = new Date()
        utilModule.postBundleToServer(bundle,metrics,res,"actnow",req)

    /*
        let response
        try {
        
            response = await axios.post(serverBase,bundle)
            let oo = response.data  //if successful, will return an oo
            
            utilModule.logger("actnow",{content:bundle,oo:response.data})
            res.json(oo)

        } catch (ex) {
            //an insert error from the FHIR server
            console.log(`Server error ${ex.code}`)
            let oo
            if (ex.response) {
                oo = ex.response.data
            } else {
                let msg = `Server not contactable. Url: ${serverBase} http code:${ex.code}`
                 oo = utilModule.makeOO([{msg:msg,severity:'error'}])
            }

            utilModule.logger("actnow",{content:bundle,oo:oo})
            res.status(500).json(oo)
        }
*/

       

    })

}

module.exports = {
    setup : setup
};