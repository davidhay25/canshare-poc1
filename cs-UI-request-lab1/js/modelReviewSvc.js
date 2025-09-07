angular.module("pocApp")

    .service('modelReviewSvc', function(utilsSvc) {

        let config = {}
        let cmConfig = {}


        return {
            makeDG: function(Q){

                let dg = {kind:'dg',id: 'newdg', name:Q.name,title:Q.title,active:true}

                dg.diff = []
                function processItem(item,parentPath) {

                    let ed = {}
                    ed.type = ['string']
                    ed.mult = '0..'
                    if (item.required) {
                        ed.mult = '1..'
                    }

                    if (item.repeats) {
                        ed.mult += '*'
                    } else {
                        ed.mult += '1'
                    }


                    ed.mult = '0..1'

                    switch (item.type) {
                        case 'choice' :
                            ed.type = ['CodeableConcept']
                            break
                    }
                    ed.path = item.linkId
                    if (parentPath) {
                        ed.path = `${parentPath}.${item.linkId}`
                    }

                    let ar = item.text.split('-')
                    ed.title = ar[0]
                    ed.description = ar[1]



                    if (item.answerOption) {
                        ed.options = []
                        for (const ao of item.answerOption) {
                            if (ao.valueCoding) {
                                let concept = {code:ao.valueCoding.code,display:ao.valueCoding.display}
                                concept.system = ao.valueCoding.system
                                ed.options.push(concept)
                            }

                        }
                    }


                    dg.diff.push(ed)


                    if (item.item) {
                        ed.type = ['group']

                        for (let child of item.item) {
                            processItem(child,ed.path)

                        }
                    }


                }

                if (Q.item) {
                    let parentPath = ""
                    for (let child of Q.item) {
                        processItem(child,parentPath)
                    }
                }

                return {dg:dg}


            },
            convertR4: function(Q,makeGroup){
                //convert an R5 Q to R4 (at least the bits I care about)
                //todo - make specific for rcpa (or souece)
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

                    if (makeGroup && item.item && item.type !== 'group') {
                        //if the item has children and is not a group, then create a group and add the item to it
                        let clone = angular.copy(item)
                        delete clone.item

                        item.type = 'group'
                        item.linkId = utilsSvc.getUUID()
                        delete item.answerOption
                        delete item.code

                        item.item.splice(0,0,clone)

                    }



                    if (item.item) {
                        for (let child of item.item) {
                            processItem(child)
                        }
                    }

                }

                delete Q.meta   //there's a profile in there

                Q.publisher="RCPA"

                let name = 'noname'
                if (Q.title) {
                    name = Q.title.replace(/\s+/g, "")
                    name = name.replace(/:/g, "")
                }
                Q.name = name
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
