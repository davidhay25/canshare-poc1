angular.module("pocApp")

    .service('labSvc', function($q,commonSvc) {

        let extDRtoComp = "http://canshare.co.nz/fhir/StructureDefinition/diagnosticreport-composition"
        let extDRtoQR = "http://canshare.co.nz/fhir/StructureDefinition/diagnosticreport-qr"

        return {

            setInitialQValuesFromQR : function (Q,hashByCode) {
                //update the .initial values in the Q. This will 'pre-populate' the values when the template isbeing built in the renderForm directive
                // hashByCode is keyed by system|code as a different template

                //need to recursively check each section
                if (Q.item) {
                    Q.item.forEach(function (section) {
                        checkItem(section)

                    })
                }

                //check an item and all the descendants recursively
                function checkItem(item) {
                    setInitial(item,hashByCode)
                    if (item.item) {
                        item.item.forEach(function (child) {
                            checkItem(child)
                        })
                    }
                }


                //set the initial value - for specific datatypes only
                //todo - do we need to think about datatype? currently assimung they are the same dt in different templates with the same code
                function setInitial(item,hashValues) {
                    if (item.code) {
                        //can only pre-pop based on code
                        let key = `${item.code[0].system}|${item.code[0].code}`
                        if (hashValues[key]) {
                            //console.log(item.linkId,hashValues[item.linkId])

                            item.initial = []       //only 1 initial is supported

                            let ans = hashValues[key].answers[0].answer  //todo currently only 1 answer

                            item.initial.push(ans)

                        }
                    }

                    /*
                    if (hashValues[item.linkId]) {
                        //console.log(item.linkId,hashValues[item.linkId])

                        item.initial = []       //only 1 initial is supported
                        item.initial.push(hashValues[item.linkId])

                    }
                    */
                }

            },

            setInitialQValuesFromObs : function (Q,arObs) {
                //create a hash of prepop data keyed on linkId from inputs (obs) that are identifier by code (not linkId).
                //for each item in the Q, if it has a .code and if there is an observation that has that code, then add the obs.value[x] to
                //to hash using the item.linkId as the key. Then the hash can be use by 'setInitialQValues'

                //first create a hash of observation values keyed by code
                let hashData = {}
                arObs.forEach(function (obs) {
                    if (obs.code) {   //a codeableconcept. look at the first coding only
                        let key = `${obs.code.coding[0].system}|${obs.code.coding[0].code}`
                        let ans
                        //get the answer, todo Is there a more efficient way to do this?
                        if (obs.valueString) {
                            ans = {valueString:obs.valueString}
                        } else if (obs.valueCodeableConcept) {
                            ans = obs.valueCodeableConcept.coding[0]        //A CC in the obs is a coding in the Q
                        }
                        if (ans) {
                            hashData[key] = ans
                        }
                    }
                })

                //now we can set the initial values
                //need to recursively check each section
                if (Q.item) {
                    Q.item.forEach(function (section) {
                        checkItem(section)

                    })
                }

                function checkItem(item) {
                    //if the item has a code, and there is data in the hash then set the initial value
                    if (item.code) { //this is a coding
                        let key = `${item.code[0].system}|${item.code[0].code}`
                        if (hashData[key]) {
                            item.initial = []       //only 1 initial is supported
                            item.initial.push(hashData[key])
                            console.log("Setting " + key + " to ",hashData[key])
                        }
                    }
                    if (item.item) {
                        item.item.forEach(function (child) {
                            checkItem(child)
                        })
                    }

                }




            },


            setInitialQValuesFromHash : function (Q,hashData) {
                //update the .initial values in the Q. This will 'pre-populate' the values when the template isbeing built in the renderForm directive
                // hashData is keyed by linkId, so is specific to this template

                //need to recursively check each section
                if (Q.item) {
                    Q.item.forEach(function (section) {
                        checkItem(section)

                    })
                }

                //check an item and all the descendants recursively
                function checkItem(item) {
                    setInitial(item,hashData)
                    if (item.item) {
                        item.item.forEach(function (child) {
                            checkItem(child)
                        })
                    }
                }


                //set the initial value - for specific datatypes only
                function setInitial(item,hashValues) {
                    if (hashValues[item.linkId]) {
                        //console.log(item.linkId,hashValues[item.linkId])

                        item.initial = []       //only 1 initial is supported
                        item.initial.push(hashValues[item.linkId])

                    }
                }


            },
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
                        obs.status = "cancelled"
                        addToBundleAsPUT(bundle,obs)
                    })
                }


                //objects used by functions below
                let SR = request.sr     //the service reqest
                let patient = request.pat   //the patient
                let issuedDate = new Date().toISOString()


                //Either create a new DR or update an existing one. References to Observations are added later

                let DR
                if (request.dr) {
                    //If there's an existing DR, this means that there was a previous interim report.
                    //We'll keep the DR,
                    DR = request.dr     //shouldn't matter if we're altering the existing one...
                    DR.issued = new Date().toISOString()
                    DR.result = []      //remove all existing references to Observations. todo: this is a simple replacement algorithm that could be improved
                    DR.status = status
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


                //we want to create a Composition to have the report structure. todo: think about report updates - ? a new composition
                let composition = {resourceType:"Composition",status:status,id:commonSvc.createUUID()}
                composition.date = new Date().toISOString()
                composition.author = [{display:"Pertinent Pathology"}]
                composition.subject = {reference:'Patient/' + patient.id}
                composition.identifier = [commonSvc.createUUIDIdentifier()]  //for some reason the validation wants one of these...
                composition.title = "Pathology Report"
                composition.type = {text:"path report"}
                composition.section = []
                /* DON'T DELETE
                    Not quite sure if we actually do want a composition. The same kind of data is in the presentedForm
                    leaving it here for now as the report generation routine will update composition
                //Now, we create an extension on DR that references the Composition. (In FHIR R5 there is a dr.composition element)
                DR.extension = DR.extension || []
                DR.extension.push({url:extDRtoComp,valueReference:{reference:`urn:uuid:${composition.id}`}})


                bundle.entry.push(commonSvc.makePOSTEntry(composition))

                */

                //strategy is to iterate through the Q and generate an Observation wherever there is an answer in the QR
                //for an item that is marked with the 'extract Observation' SDC extension


                //generate a hash by linkId for all the entries in the QR with an answer
                let hashAnswers = {} //note that the answers are in an array...
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

                //now we move through the Q. If an item is marked with the extractObservation extension, and there is an answer then we can create an observation
                //at the same time, create an array with all the answers so we can generate the textual report
                let arAllAnswers = []


                function getAnswersForSection(item) {
                    if (hashAnswers[item.linkId] && hashAnswers[item.linkId].length > 0) {

                        hashAnswers[item.linkId].forEach(function (answer) {
                            //The 'code' element in the Observation is a CodepableConcept, whereal in the Q it is a Coding...

                            if (item.code) {
                                code = {coding:[item.code[0]]}        //only use the first code in the Q
                                let obs = makeObservation(item.linkId,code,answer)

                                bundle.entry.push(commonSvc.makePOSTEntry(obs))
                                DR.result.push({reference:"urn:uuid:"+ obs.id})

                            }

                            arAllAnswers.push({linkId:item.linkId,text:item.text,answer:answer})

                        })
                    }

                    if (item.item) {
                        item.item.forEach(function (child) {
                            getAnswersForSection(child)
                        })
                    }
                }


                reportQ.item.forEach(function (section) {
                    getAnswersForSection(section)
                })


                //construct the textual report and add to the DR
                makeTextualReport(arAllAnswers,DR)

                //now add the QR as another presentedForm. This is a bit of a hack for POC to support
                //pre-pop when updating a report. In real like, this data would likely be stored in the lab system
                //rather then canshare. A better way might be to store the QR as a separate resource - or as a contained resource.
                //Anyway, it will do for now.

                //let txtAnswers = angular.toJson(arAllAnswers)

                //convert the answers into a hash of answers in the same format as form
                let hash = {}
                arAllAnswers.forEach(function (ans) {
                    hash[ans.linkId] = ans.answer
                })

                let vo = {data:hash,url:reportQ.url}         //add the url of the template Q

                let strVo = angular.toJson(vo)          //all the form data as a hash


                let att = {'contentType':'application/json',data:btoa(strVo),title:"Raw form data"}
                DR.presentedForm.push(att)
                


                //If the status us 'final', also need to update and add the SR to the bundle.
                //it should be safe to use the one we retrieved first time as no one else should have updated it in the interim
                //we need to add the SR regardless, as it's used for the provenance

                if (status == 'final') {
                    SR.status = "completed"
                }

                //add to the bundle - note that it's a PUT, and it has a real id (the one on the CS server)
                //todo - should this be a conditional update
                addToBundleAsPUT(bundle,SR)

                //add the patient
                addToBundleAsPUT(bundle,patient)

                return bundle

                //generate the 'textual' report. We'll make it a simple html file for now - can enhance later
                function makeTextualReport(arAllAnswers,DR) {
                    let ar = []
                    ar.push("<table class='table table-bordered table-condensed'>")
                    ar.push("<tr><th>Item</th><th>Value</th><th>LinkId</th></tr>")
                    arAllAnswers.forEach(function (vo) {
                        let ans = vo.answer
                        ar.push("<tr>")
                        ar.push(`<td>${vo.text}</td>`)
                        ar.push("<td>")
                        //todo - add other datatypes
                        if (ans.valueString) {
                            ar.push(ans.valueString)
                        }
                        if (ans.valueCoding) {
                            ar.push(ans.valueCoding.display)
                        }

                        ar.push("</td>")
                        ar.push(`<td>${vo.linkId}</td>`)
                        ar.push("</tr>")
                    })
                    ar.push("</table>")
                    let html = ar.join("\n")

                    //console.log(html)
                    let att = {'contentType':'text/html',data:btoa(html),title:"The generated report"}
                    DR.presentedForm = [att]

                }

                function makeObservation(linkId,code,answer) {


                    let obs = {"resourceType":"Observation",id:commonSvc.createUUID(),status:status}
                    obs.identifier = [commonSvc.createUUIDIdentifier()]
                    obs.subject = {reference:'Patient/' + patient.id}
                    obs.performer = [{display:"Pertinent Pathology"}]
                    obs.basedOn = [{reference:'ServiceRequest/'+ SR.id}]

                    //the code is defined in the Q item (along with the linkId which is the key)
                    //todo - do we need to check that there is a code?
                    //obs.code =  {coding:[hashLinkIdCodes[linkId]]}
                    obs.code =  code //hashLinkIdCodes[linkId]         //this is a CC


                    obs.effectiveDateTime = issuedDate
                    obs.issued = issuedDate

                    //obs.valueString = value
                    //unfortunately the datatypes between Q & Obs are different :(
                    let newAnswer = angular.copy(answer)        //if we don't make a copy, we wind up changing the QR type!

                    //codings in the Q are reprsented as CodeableConcepts
                    if (newAnswer.valueCoding) {
                        newAnswer.valueCodeableConcept = {coding: [answer.valueCoding]}
                        delete newAnswer.valueCoding
                    }

                    let newObs = {...obs, ...newAnswer}

                   // console.log(newAnswer,newObs)

                    return newObs

                }

                //add to the bundle as an update - assumes we already have the resource id
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
                    if (sectionItem.item) {
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
                    }

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