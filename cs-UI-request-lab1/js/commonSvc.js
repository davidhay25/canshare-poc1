/*
* Services used by both requester & lab
*
* */

angular.module("pocApp")


    .service('commonSvc', function($q,$http) {

        let config= {}


        return {

            

            //todo - convert to server side function that follows paging...
            retrieveAllDRforPatient : function (patient) {
                let deferred = $q.defer()
                let qry = `${this.config.canShare.fhirServer.url}/DiagnosticReport?patient._id=${patient.id}&_include=DiagnosticReport:result`
                qry += "&_count=50"
                $http.get(qry).then(
                    function(data) {

                        console.log(data.data)
                        //construct array of objects {DR: observations:[], other:[]}
                        let bundle = data.data
                        //construct hash of all resources by type & id
                        let hash = {}
                        if (bundle.entry) {
                            bundle.entry.forEach(function (entry) {
                                let resource = entry.resource
                                let key = resource.resourceType + "/" + resource.id
                                hash[key] = resource

                            })

                            //now create hash of DR reso
                            let arDR = []
                            bundle.entry.forEach(function (entry) {
                                let resource = entry.resource
                                //let key = resource.resourceType + "-" + resource.id
                                if (resource.resourceType == 'DiagnosticReport') {
                                    let item = {DR:resource, observations:[],others:[]}
                                    //now retrieve all the resoult
                                    resource.result.forEach(function (ref) {
                                        //todo - check for others
                                        item.observations.push(hash[ref.reference])
                                    })
                                    arDR.push(item)

                                }

                            })


                            deferred.resolve(arDR)
                            //load all the patients
                        } else {
                            deferred.resolve([])
                        }


                    },function (err) {
                        deferred.reject()
                    }

                )

                return deferred.promise
            },
            createUUIDIdentifier : function() {
                //described in the spec - http://hl7.org/fhir/datatypes.html#Identifier
                return {system:"urn:ietf:rfc:3986",value:this.createUUID()}
            },
            init : function(){
                //initialization code - currently loading the config...
                let deferred = $q.defer()
                let that = this

                $http.get("/config").then(
                    function(data) {
                        that.config = data.data
                        deferred.resolve(that.config)
                        //load all the patients

                    },function (err) {
                        deferred.reject()
                    }

                )
                return deferred.promise
            },
            getAllPatients : function() {
                let deferred = $q.defer()
                let url = `${this.config.canShare.fhirServer.url}/Patient`
                $http.get(url).then(
                    function (data) {

                        deferred.resolve(data.data)

                    }
                ), function(err) {
                    deferred.reject(err)
                }
                return deferred.promise
            },
            retrieveSRandDetails : function(SR) {
                let deferred = $q.defer()
                //given an SR, retrieve the associated reesources - QR and DR bundle
                let that = this

                let vo = {}
                //retrieve the referenced QR
                let QRReference
                SR.supportingInfo.forEach(function (si) {
                    if (si.reference.startsWith("QuestionnaireResponse")) {
                        QRReference = si.reference

                    }
                })

                if (QRReference) {
                    let url = `${that.config.canShare.fhirServer.url}/${QRReference}`
                    $http.get(url).then(
                        function (data) {
                            vo.QR = data.data

                            //now get any DR/obs. - todo - may need to move to $q.all() if there is more to be done...
                            let url1 = `${that.config.canShare.fhirServer.url}/DiagnosticReport?based-on=${SR.id}&_include=DiagnosticReport:result`
                            $http.get(url1).then(
                                function (data) {
                                    let obj = {observations:[], other:[]}
                                    if (data.data && data.data.entry) {
                                        data.data.entry.forEach(function (entry) {
                                            let resource = entry.resource
                                            switch (resource.resourceType) {
                                                case "DiagnosticReport" :
                                                    obj.DR = resource
                                                    break
                                                case "Observation" :
                                                    obj.observations.push(resource)
                                                default :
                                                    obj.other.push(resource)
                                            }
                                        })
                                    }


                                    vo.DRobject = obj



                                    deferred.resolve(vo)
                                }, function(err) {
                                    deferred.reject(err)
                                }

                            )

                        }, function(err) {
                            deferred.reject(err)
                        }

                        )
                }



                return deferred.promise
            },

            makeQR : function (Q,formData) {
                //construct a QR
                let QR = {resourceType:"QuestionnaireResponse",questionnaire:Q.url,status:'completed',item:[]}
                QR.id = this.createUUID()


                Q.item.forEach(function (sectionItem) {
                    let sectionRootItem = null
                    sectionItem.item.forEach(function (childItem) {
                        //todo - add group level activity - check for childItem.item and iterate through the grand children
                        if (formData[childItem.linkId]) {
                            //create the answerItem
                            let answerItem = {linkId:childItem.linkId,text:childItem.text,answer:[]}

                            //display depends on item datatype. The default is string...
                            switch (childItem.type)  {
                                case "choice":
                                    //answerItem.answer.push({valueCoding:formData[childItem.linkId]})
                                    answerItem.answer.push(formData[childItem.linkId])
                                    break
                                case "integer":
                                    //answerItem.answer.push({valueCoding:formData[childItem.linkId]})
                                    answerItem.answer.push({valueString:formData[childItem.linkId]})
                                    break
                                default :
                                    answerItem.answer.push({valueString:formData[childItem.linkId]})
                                    break

                            }



                            //have we created the sectionitem yet?
                            if (! sectionRootItem) {
                                //this is the first child entry that has data
                                sectionRootItem = {linkId:sectionItem.linkId,text:sectionItem.text,item:[]}     //create the section answer
                                sectionRootItem.item.push(answerItem)  //add the actual answer
                                QR.item.push(sectionRootItem)   //add the section to the root..

                            } else {
                                sectionRootItem.item.push(answerItem)
                            }
                        }
                    })

                })

                return QR

            },

            getPatientName : function(patient) {
                let name = ""
                if (patient && patient.name) {
                    //todo look for firstName, lastName etc.
                    name = patient.name[0].text
                }
                return name
            },
            parseQ : function(Q) {
                //parse a Q into a simple display structure - sections holding questions. 2 level only.

                let arSections = []
                Q.item.forEach(function (sectionItem) {
                    let section = {text:sectionItem.text,questions:[]}
                    arSections.push(section)
                    sectionItem.item.forEach(function (questionItem) {
                        //let question = {text:questionItem.text,type:questionItem.type,linkId:questionItem.linkId}

                        section.questions.push(questionItem)
                        //section.questions.push(question)

                    })
                })
                return arSections

            },
            makePOSTEntry :function (resource) {
                //Make a create entry. Assume the resource has an id that is a UUID
                let entry = {}
                entry.fullUrl = "urn:uuid:"+ resource.id
                entry.resource = resource
                entry.request = {method:"POST",url:"urn:uuid:"+ resource.id}
                return entry


            },
            createUUID : function() {

                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

        }
    }
)