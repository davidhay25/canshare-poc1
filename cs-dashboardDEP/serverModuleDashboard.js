

function setup(app) {
    console.log('setup')

    app.get("/logs/:module",async function(req,res){

        let qry = {}    //retre
        let collection = req.params.module
        console.log(`${collection} logs`)
        try {
            let entries = await database.collection(collection).find(qry).toArray()
            res.json(entries)
        } catch(ex) {
            res.status(500).json(ex)
        }
       

    });

   
    
}

module.exports = {
    setup : setup
};