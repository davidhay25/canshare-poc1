angular.module("pocApp")

    .service('labSvc', function($q,commonSvc) {



        return {
            makeReport : function(QR,request) {
                //return a bundle with the generated resources...

                let SR = request.sr     //the service reqest
                let patient = request.pat   //the patient

                let bundle = {resourceType:"Bundle",entry:[]}
                let DR = {resourceType:"DiagnosticReport",id:commonSvc.createUUID(), status:"final",result:[]}
                DR.identifier = [commonSvc.createUUIDIdentifier()]
                DR.basedOn = {reference:'ServiceRequest/'+ SR.id}
                DR.subject = {reference:'Patient/' + patient.id}
                DR.basedOn = {reference: `ServiceRequest/${SR.id}`}
                DR.performer = [{display:"Pertinent Pathology"}]
                DR.issued = new Date().toISOString()
                DR.code = {text:"Histology report"}

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
                            hashAnswers[gc.linkId] = gc.answer
                        }
                    })
                })

                //create a hash for the codes that correspond to linkIds
                let hashLinkIdCodes = this.getCodingForLinkId()

                //so now we have all the answers. Create an observation for each one


                Object.keys($scope.answer).forEach(function (key) {
                    let issuedDate = new Date().toISOString()
                    let value = $scope.answer[key]
                    if (value) {
                        let obs = {"resourceType":"Observation",id:commonSvc.createUUID(),status:"final"}
                        obs.identifier = [commonSvc.createUUIDIdentifier()]
                        obs.subject = {reference:'Patient/' + $scope.selectedRequest.Pat.id}
                        obs.performer = [{text:"Pertinent Pathology"}]
                        obs.basedOn = {reference:'ServiceRequest/'+ $scope.selectedRequest.SR.id}
                        //the code is defined in the Q item (along with the linkId which is the key)
                        obs.code =  {coding:[$scope.hashLinkIdCodes[key]]}

                        obs.effectiveDateTime = issuedDate
                        obs.issued = issuedDate
                        obs.valueString = value
                        DR.result.push({reference:"urn:uuid:"+ obs.id})
                        bundle.entry.push(commonSvc.makePOSTEntry(obs))
                    }
                })
                bundle.entry.push(commonSvc.makePOSTEntry(DR))

                //also need to update and add the SR to the bundle.
                //it should be safe to use the one we retrieved first time as no one else should have updated it
                $scope.selectedRequest.SR.status = "completed"

                //add to the bundle - note that it's a PUT, and it has a real id (the one on the CS server)
                //todo - should this be a conditional update
                let entry = {resource:$scope.selectedRequest.SR}
                entry.fullUrl = $scope.config.canShare.fhirServer.url + "/ServiceRequest/"+ $scope.selectedRequest.SR.id
                entry.request = {method:"PUT",url:"ServiceRequest/"+$scope.selectedRequest.SR.id}
                bundle.entry.push(entry)

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