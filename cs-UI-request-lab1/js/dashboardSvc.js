angular.module("pocApp").service('dashboardSvc', function($q,$http) {

    //where the Q's are
    let designerServer = "http://canshare.co.nz:9099/baseR4/"   //actually the public server ATM
    let formsServer = "http://localhost:8080/fhir/"     //the forms server

    return {

        cleanQ : function (Q,context) {
            //remove all the extensions that are not needed for rendering - eg hiso ones

            let keeplist = {}      //a list of all the extension urls to keep
            keeplist["http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"] = true
            keeplist["http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"] = true
            keeplist["http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"] = true
            keeplist["http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"] = true


            Q.item.forEach(function (section) {
                cleanItem(section)
                if (section.item) {
                    section.item.forEach(function (child) {
                        cleanItem(child)
                        if (child.item) {
                            child.item.forEach(function (gc) {
                                cleanItem(gc)
                            })
                        }
                    })
                }
            })



            function cleanItem(item) {
                if (item.extension) {
                    let extCopy = JSON.parse(JSON.stringify(item.extension))
                    delete item.extension
                    extCopy.forEach(function (ext) {
                        if (keeplist[ext.url]) {
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
            let url = `${formsServer}Questionnaire?_elements=url&_count=50`

            let hash = {}
            $http.get(url).then(
                function (data) {
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
            //retrieve a description of the Q on the server. return a simple list of custom objects
            //the hash has the urls already on the forms server
            let deferred = $q.defer()
            let myHash = angular.copy(hash)

            //first, get the urls of the Q's already on

            let url = `${designerServer}Questionnaire?_elements=url,title,name,description,extension&_sort=name&status:not=retired&_count=50`

            let lst = []
            $http.get(url).then(
                function (data) {
                    if (data.data.entry) {
                        data.data.entry.forEach(function (entry) {
                            let resource = entry.resource
                            let item = {id:resource.id,name:resource.name,url:resource.url,title:resource.title}
                            if (myHash[resource.url]) {
                                item.existsOnFormsServer = true
                            }
                            lst.push(item)
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