angular.module("pocApp").service('dashboardSvc', function($q,$http,questionnaireSvc) {

    //where the Q's are todo - might want to be able to select from different servers
    //let designerServer = "http://canshare.co.nz:9099/baseR4/"   //actually the public server ATM
    let designerServer = "http://test.canshare.co.nz:9099/baseR4/"   //actually the public server ATM


    return {

        getActiveSR : function () {
            let deferred = $q.defer()
            let qry = `ServiceRequest?status=active&_include=ServiceRequest:subject&_include=ServiceRequest:supportingInfo`
            let encodedQry = encodeURIComponent(qry)
            //the proxy endpoint will follow the paging to return all matching resources...
            let hash = {}
            let activeSR = []
            $http.get(`proxy?qry=${encodedQry}`).then(
                function (data) {
//console.log(data.data)
                    //create a summary object for display
                    if (data.data && data.data.entry) {
                        //create a hash of Patient
                        let hashPatient = {}, hashQR = {}
                        data.data.entry.forEach(function (entry) {
                            switch (entry.resource.resourceType) {
                                case 'Patient' :
                                    hashPatient[`Patient/${entry.resource.id}`] = entry.resource
                                    break
                                case 'QuestionnaireResponse' :
                                    hashQR[`QuestionnaireResponse/${entry.resource.id}`] = entry.resource
                                    break
                            }

                        })
                        //create the list of active SR
                        data.data.entry.forEach(function (entry) {
                            if (entry.resource.resourceType == 'ServiceRequest') {
                                let sr = entry.resource
                                let vo = {sr:sr}
                                vo.patient = hashPatient[sr.subject.reference]
                               // vo.qr =
                                let siLink = sr.supportingInfo[0].reference
                                vo.qr = hashQR[siLink]
                                activeSR.push(vo)
                            }
                        })

                        //console.log(activeSR)
                        deferred.resolve(activeSR)
                    }



                    //console.log(qry, data)
                },function (err) {
                    console.log(err)
                }
            )
            return deferred.promise
        },

        cleanQ : function (Q,context) {
            //remove all the extensions that are not needed for rendering - eg hiso ones
/*
            let keeplist = {}      //a list of all the extension urls to keep
            keeplist["http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"] = true
            keeplist["http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"] = true
            keeplist["http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"] = true
            keeplist["http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"] = true

*/



            let issues = []
            let summary = []
            if (!Q.item) {
                return Q
            }

            Q.item.forEach(function (section) {
                //let sectionText = section.
                cleanItem(section,section)
                if (section.item) {
                    section.item.forEach(function (child) {
                        cleanItem(child,section)
                        if (child.item) {
                            child.item.forEach(function (gc) {
                                cleanItem(gc,section)
                            })
                        }
                    })
                }
            })

            return {Q:Q,issues:issues,summary:summary}


            function cleanItem(item,section) {
                let meta = questionnaireSvc.getMetaInfoForItem(item)        //so can do issue checking

                //console.log(item.type,meta.itemControl)

                //generate the summary for this item
                let sumry = {item:item,section:section,issues:[]}
                if (item.code) {
                    sumry.code = item.code[0].code
                    sumry.status = 'ok'
                } else {
                    //sumry.obs = "Text only"
                    sumry.status = 'warning'
                }

                //resource extraction
                if (meta.extraction || item.definition) {
                    if (meta.extraction.extractObservation) {
                        sumry.extract = "Observation"
                    } else {
                        if (item.definition) {
                            let def = item.definition
                            sumry.extract = def
                        }
                    }

                }

                //let extract = meta.extraction || {}


                summary.push(sumry)


                //check that a choice item set as checkbox has repeats set
                if (meta.itemControl && meta.itemControl.coding && meta.itemControl.coding[0].code == 'check-box') {
                    if (! item.repeats) {
                        sumry.issues.push("repeats flag should be set as it's a checkbox")
                        sumry.status = 'error'
                        let iss = {display:"A choice item that renders as checkboxs must have the 'repeats' flag set"}
                        iss.item = item
                        iss.section = section

                        issues.push(iss)
                    }
                }


                //remove hiso extensions
                if (item.extension) {
                    let extCopy = JSON.parse(JSON.stringify(item.extension))
                    delete item.extension
                    extCopy.forEach(function (ext) {
                        //change so that it only removes hiso extensions
                        if (ext.url.indexOf('hiso') == -1) {
                        //if (keeplist[ext.url]) {
                            item.extension = item.extension || []
                            item.extension.push(ext)
                        }

                    })
                }


            }

        },

        getSingleQFromDesigner : function(miniQ){
            //get the complete Q
            let deferred = $q.defer()
            let url = `${designerServer}Questionnaire/${miniQ.id}`


            let lst = []
            $http.get(url).then(
                function (data) {
                    deferred.resolve(data.data)     //returns the actual Q
                }, function (err) {
                    deferred.reject(err)
                }
            )
            return deferred.promise
        },

        getQfromFormsServer : function() {
            //retrieve a description of the Q on the forms  server. return a simple list of custom objects
            let deferred = $q.defer()

            //let qry = `${formsServer}Questionnaire?_elements=url`
            //don't include the server base - the proxy endpoint will automatically query against the POC fhir server
            let qry = `Questionnaire?_elements=url,version`
            let encodedQry = encodeURIComponent(qry)

            //the proxy endpoint will follow the paging to return all matching resources...
            let hash = {}
            $http.get(`proxy?qry=${encodedQry}`).then(
                function (data) {
                    console.log(qry,data)
                    if (data.data.entry) {
                        data.data.entry.forEach(function (entry) {
                            let resource = entry.resource
                            hash[resource.url] = resource

                        })
                    }
                    deferred.resolve(hash)

                }, function (err) {
                    console.log(err.data)
                    deferred.reject(err.data)
                })

            return deferred.promise
        },

        getQFromDesigner:  function (hash) {
            //retrieve a description of the Q on the designer server. return a simple list of custom objects
            //the hash has the urls (annd resource )already on the forms server
            let deferred = $q.defer()
            let hashFS = angular.copy(hash)

            //by setting the designer server root, we force the proxy endpoint to query the designer not the POC fhir server
            let qry = `${designerServer}Questionnaire?_elements=url,title,name,version,description,extension,context-type-value&_sort=name&status:not=retired`
            let encodedQry = encodeURIComponent(qry)
            let lst = []
            $http.get(`proxy?qry=${encodedQry}`).then(
            //$http.get(url).then(
                function (data) {
                    if (data.data.entry) {
                        data.data.entry.forEach(function (entry) {
                            let resource = entry.resource
                            let miniQ = {id:resource.id,name:resource.name,url:resource.url,title:resource.title}
                            miniQ.designResource = resource //the resourc e on the designer
                            if (hashFS[resource.url]) {
                                miniQ.fsResource = hashFS[resource.url] //the resource on the FormsServer

                                miniQ.existsOnFormsServer = true
                            }
                            lst.push(miniQ)
                        })
                    }
                    deferred.resolve(lst)

                }, function (err) {
                    console.log(err.data)
                    deferred.reject(err)
                })

            return deferred.promise
        }

    }
})