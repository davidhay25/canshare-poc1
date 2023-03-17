angular.module("pocApp")

    .service('labSvc', function($q,commonSvc) {

        return {
            makeReport : function(QR,request,reportQ) {
                //return a bundle with the generated resources...


                let fhirServerUrl = "http://test"   //todo - need to get thos from config somewhere...

                let SR = request.sr     //the service reqest
                let patient = request.pat   //the patient

                let bundle = {resourceType:"Bundle",type:'transaction',entry:[]}

                let DR = {resourceType:"DiagnosticReport",id:commonSvc.createUUID(), status:"final",result:[]}

                //There's a bug in the hapi narrative generator for DR, so make sure there's on there...
                DR.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Lab report</div>"}

                DR.identifier = [commonSvc.createUUIDIdentifier()]
                DR.basedOn = [{reference:'ServiceRequest/'+ SR.id}]
                DR.subject = {reference:'Patient/' + patient.id}
                DR.basedOn = [{reference: `ServiceRequest/${SR.id}`}]
                DR.performer = [{display:"Pertinent Pathology"}]
                DR.issued = new Date().toISOString()
                DR.code = {text:"Histology report"}

                bundle.entry.push(commonSvc.makePOSTEntry(DR))

                //strategy is to iterate through the Q and generate an Observation wherever there is an answer in the QR

                //generate a hash by linkId for all the entries in the QR with an answer
                let hashAnswers = {}
                QR.item.forEach(function (section) {
                    section.item.forEach(function (child) {
                        if (child.item) {
                            //a group
                            child.item.forEach(function (gc) {
                                hashAnswers[gc.linkId] = gc.answer
                            })
                        } else {
                            //a leaf
                            hashAnswers[child.linkId] = child.answer
                        }
                    })
                })

                //create a hash for the codes that correspond to linkIds - keyed on linkId
                let hashLinkIdCodes = this.getCodingForLinkId(reportQ)

                //so now we have all the answers. Create an observation for each one
                Object.keys(hashAnswers).forEach(function (linkId) {
                    let arAnswers = hashAnswers[linkId]    //array of answers

                    if (arAnswers && arAnswers.length > 0) {
                        let answer = arAnswers[0]
                        let issuedDate = new Date().toISOString()

                        let obs = {"resourceType":"Observation",id:commonSvc.createUUID(),status:"final"}
                        obs.identifier = [commonSvc.createUUIDIdentifier()]
                        obs.subject = {reference:'Patient/' + patient.id}
                        obs.performer = [{display:"Pertinent Pathology"}]
                        obs.basedOn = [{reference:'ServiceRequest/'+ SR.id}]

                        //the code is defined in the Q item (along with the linkId which is the key)
                        //todo - do we need to check that there is a code?
                        obs.code =  {coding:[hashLinkIdCodes[linkId]]}

                        obs.effectiveDateTime = issuedDate
                        obs.issued = issuedDate

                        //obs.valueString = value
                        let newObs = {...obs, ...answer}

                        console.log(newObs)
                        DR.result.push({reference:"urn:uuid:"+ obs.id})

                        bundle.entry.push(commonSvc.makePOSTEntry(newObs))

                    }

                })

              /*
                //iterate through the QR. For all those with an answer, create an observation
                QR.item.forEach(function (section) {
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.item) {
                                //group
                            } else {
                                //leaf
                                makeObservation(child)
                            }

                        })
                    }
                })


                Object.keys($scope.answer).forEach(function (key) {

                })

               */

                //also need to update and add the SR to the bundle.
                //it should be safe to use the one we retrieved first time as no one else should have updated it
                SR.status = "completed"

                //add to the bundle - note that it's a PUT, and it has a real id (the one on the CS server)
                //todo - should this be a conditional update
                let entry = {resource:SR}
                entry.fullUrl = fhirServerUrl + "/ServiceRequest/"+ SR.id
                entry.request = {method:"PUT",url:"ServiceRequest/"+SR.id}
                bundle.entry.push(entry)

                //add the patient
                let patEntry = {resource:patient}
                patEntry.fullUrl = fhirServerUrl + "/Patient/"+ patient.id
                patEntry.request = {method:"PUT",url:"Patient/"+patient.id}
                bundle.entry.push(patEntry)


                console.log(bundle)
                return bundle




            },
            getCodingForLinkId : function(Q) {
                //generate a hash of codings for each linkId. Used by the Observations that are generated
                let hashLinkIdCodes = {}

                Q.item.forEach(function (sectionItem) {
                    sectionItem.item.forEach(function (item) {
                        if (item.item) {
                            //this is a group
                            item.item.forEach(function (child) {
                                addCode(child)
                            })
                        } else {
                            addCode(item)
                        }

                    })
                })


                return hashLinkIdCodes

                function addCode(item) {
                    if (item.code)
                        //This is an array of Coding. We only want the first one...
                        hashLinkIdCodes[item.linkId] = item.code[0]         //note this is a Coding dt
                    }
                }
            }


        }

)