angular.module("pocApp")

    .service('labSvc', function($q,commonSvc) {

        return {
            makeReport : function(QR,request,reportQ,status) {
                //return a bundle with the generated resources...
                //status is 'preliminary' or 'final'. Both Observation and DiagReport support these
                //request is {pat:, sr:, qr:, dr: obs:}
                //any existing observations have their status set to 'cancelled'. Existing DR is updated
                // A smarter algorithm could look for unchanged observations or updates rather than wholesale invalidation

                let bundle = {resourceType:"Bundle",type:'transaction',entry:[]}
                //needed for the fullUrl in the bundle
                let fhirServerUrl = "http://test"   //todo - need to get thos from config somewhere...

                if (request.obs && request.obs.length > 0) {
                    //each existing resource has their status updated and added to the bundle as an update.
                    request.obs.forEach(function (obs) {
                      //  if (obs.status !== 'cancelled') {
                            //may have already beed cancellled - if there were multiple interims
                            obs.status = "cancelled"
                            addToBundleAsPUT(bundle,obs)
                            /*
                            let entry = {resource:obs}
                            entry.fullUrl = fhirServerUrl + "/Observation/"+ obs.id
                            entry.request = {method:"PUT",url:"Observation/"+obs.id}
                            bundle.entry.push(entry)
                            */
                    //    }


                    })
                }

                /*  No  - nnot any more
                if (request.dr) {
                    //invalidate the dr and add to the bundle as an update
                    request.dr.status = "cancelled"
                    let entry = {resource:request.dr}
                    entry.fullUrl = fhirServerUrl + "/DiagnosticReport/"+ request.dr.id
                    entry.request = {method:"PUT",url:"DiagnosticReport/"+request.dr.id}
                    bundle.entry.push(entry)
                }
                * */



                let SR = request.sr     //the service reqest
                let patient = request.pat   //the patient



                //Either create a new DR or update an existing one. References to Observations are added later

                let DR
                if (request.dr) {
                    //If there's an existing DR, this means that there was a previous interim report.
                    //We'll keep the DR,
                    DR = request.dr     //shouldn't matter if we're altering the existing one...
                    DR.result = []      //remove all existing references to Observations. todo: this is a simple replacement algorithm that could be improved
                    //add to the bundle as a PUT - ie an update
                    addToBundleAsPUT(bundle,DR)


                } else {
                    //Otherwisee create a new one
                    DR = {resourceType:"DiagnosticReport",id:commonSvc.createUUID(), status:status,result:[]}

                    //There's a bug in the hapi narrative generator for DR, so make sure there's on there...
                    DR.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Lab report</div>"}
                    DR.identifier = [commonSvc.createUUIDIdentifier()]
                    DR.basedOn = [{reference:'ServiceRequest/'+ SR.id}]
                    DR.subject = {reference:'Patient/' + patient.id}
                    DR.basedOn = [{reference: `ServiceRequest/${SR.id}`}]
                    DR.performer = [{display:"Pertinent Pathology"}]
                    DR.issued = new Date().toISOString()
                    DR.code = {text:"Histology report"}
                    //add to the bundle as a POST - ie create new
                    bundle.entry.push(commonSvc.makePOSTEntry(DR))
                }

                    //There isn't already a DR for this SR (ie it's not a report update





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

                        let obs = {"resourceType":"Observation",id:commonSvc.createUUID(),status:status}
                        obs.identifier = [commonSvc.createUUIDIdentifier()]
                        obs.subject = {reference:'Patient/' + patient.id}
                        obs.performer = [{display:"Pertinent Pathology"}]
                        obs.basedOn = [{reference:'ServiceRequest/'+ SR.id}]

                        //the code is defined in the Q item (along with the linkId which is the key)
                        //todo - do we need to check that there is a code?
                        //obs.code =  {coding:[hashLinkIdCodes[linkId]]}
                        obs.code =  hashLinkIdCodes[linkId]         //this is a CC


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

                //If the status us 'final', also need to update and add the SR to the bundle.
                //it should be safe to use the one we retrieved first time as no one else should have updated it in the interim
                //we need to add the SR regardless, as it's used for the provenance

                if (status == 'final') {
                    SR.status = "completed"
                }

                //add to the bundle - note that it's a PUT, and it has a real id (the one on the CS server)
                //todo - should this be a conditional update
                addToBundleAsPUT(bundle,SR)
                /*
                let entry = {resource:SR}
                entry.fullUrl = fhirServerUrl + "/ServiceRequest/"+ SR.id
                entry.request = {method:"PUT",url:"ServiceRequest/"+SR.id}
                bundle.entry.push(entry)
                */


                //add the patient
                addToBundleAsPUT(bundle,patient)
                /*
                let patEntry = {resource:patient}
                patEntry.fullUrl = fhirServerUrl + "/Patient/"+ patient.id
                patEntry.request = {method:"PUT",url:"Patient/"+patient.id}
                bundle.entry.push(patEntry)
*/

                console.log(bundle)
                return bundle


                //add to the bundle as an update - assumes wee already have the resource id
                function addToBundleAsPUT(bundle,resource) {
                    let entry = {resource:resource}
                    entry.fullUrl = `${fhirServerUrl}/${resource.resourceType}/${resource.id}`  //  fhirServerUrl + "/Patient/"+ patient.id
                    entry.request = {method:"PUT",url: `${resource.resourceType}/${resource.id}`}  //  "Patient/"+patient.id}
                    bundle.entry = bundle.entry || []
                    bundle.entry.push(entry)
                }


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
                        //This is an array of Coding. We only want the first one... - now a CC
                        //using text as the cc.text may not strictly be kosher...
                        hashLinkIdCodes[item.linkId] = {text:item.text,coding:[item.code[0]]}     //note this is a Coding dt
                    }
                }
            }


        }

)