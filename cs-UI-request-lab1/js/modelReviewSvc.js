angular.module("pocApp")

    .service('modelReviewSvc', function() {

        let config = {}
        let cmConfig = {}


        return {
            convertR4: function(Q){
                //convert an R5 Q to R4 (at least the bits I care about)
                //written for the Q from RCPA
                let log = []

                function processItem(item) {
                    if (item.type) {
                        if (item.type == 'coding') {
                            item.type = 'choice'
                            log.push({linkId : item.linkId,msg:"Changed type from 'coding' to 'choice'"})
                        }
                    } else {
                        item.type = "string"
                        log.push({linkId : item.linkId,msg:"Missing item.type"})
                    }

                    if (item.answerConstraint) {
                        delete item.answerConstraint
                        log.push({linkId : item.linkId,msg:"Deleted item.answerConstraint"})
                    }



                    if (item.item) {
                        for (let child of item.item) {
                            processItem(child)
                        }
                    }

                }

                delete Q.meta   //there's a profile in there

                let name = 'noname'
                if (Q.title) {
                    name = Q.title.replace(/\s+/g, "")
                    name = name.replace(/:/g, "")
                }

                Q.id = `canshare-rcpa-${name}`

                if (! Q.url) {


                    Q.url = `http://canshare.co.nz/fhir/questionnaire/rcpa-${name}`
                    log.push({linkId : 'root',msg:`Set url to ${Q.url}`})
                }


                if (Q.item) {
                    for (let child of Q.item) {
                        processItem(child)
                    }
                }

                return {Q:Q,log:log}

            }
        }
    })
