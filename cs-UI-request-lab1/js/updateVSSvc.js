angular.module("pocApp")

    .service('updateVSSvc', function($q,$http,utilsSvc) {

        let extUrl = "http://canshare.co.nz/fhir/StructureDefinition/concept-type"

        //A codesystem that has pre-published concepts (ie the same as unpublished)
        let csUrl = "http://canshare.co.nz/fhir/CodeSystem/prepub-concepts"


        //let csId = "canshare-prepub-concepts"

        let csVersion = "http://snomed.info/sct/version/21000210109"

        let snomed = "http://snomed.info/sct"

        return {
            makeDownload : function (arItem) {
                let that = this
                let ar = []
                ar.push(`Url\tId\tStatus\tTitle\tDescription\tLastUpdated\tECL\n`)
                arItem.forEach(function (item) {
                    let vs = item.vs
                    let lne = vs.url
                    lne += `\t${vs.id}`
                    lne += `\t${vs.status}`
                    lne += `\t${tidyText(vs.title)}`
                    lne += `\t${tidyText(vs.description)}`
                    lne += `\t${vs.meta.lastUpdated}`
                    lne += `\t${that.getEcl(vs)}`
                    ar.push(lne)
                })
                let downLoad = ar.join('\n')
                return downLoad

                function tidyText(s) {
                    if (s) {
                        s = s.replace(/\t/g, " ");
                        s = s.replace(/\n/g, " ");
                        s = s.replace(/\r/g, " ");
                        return s
                    } else {
                        return ""
                    }
                }

            },
            getEcl : function (vs) {
                let ecl = ""
                if (vs.compose && vs.compose.include) {

                    vs.compose.include.forEach(function (inc) {
                        //if the include has a filter, then it's the ecl. Otherwise it's a diect concept
                        if (inc.filter) {
                            //this is the ecl
                            ecl = inc.filter[0].value
                        }

                    })
                }
                return ecl
            },
            addConceptToCodeSystem : function (cs,newConcept) {
                //add a concept to the pre-pub codesystem if not already there
                //returns true if the CS was updated
                for (const concept of cs.concept) {
                    if (newConcept.code == concept.code && newConcept.system == concept.system) {
                        //already exists
                        return
                    }
                }
                let nc = angular.copy(newConcept)
                delete nc.extension
                cs.concept.push(nc)
                return true         //to indicate that the CS was updated


            },

            updateCodeSystem : function (cs) {
                //save the CS to the terminology server
                let deferred = $q.defer()

                //deferred.reject({msg:"CodeSystem update disabled"})
                //return

                cs.version = "1"

                let qry = '/nzhts/CodeSystem'
                $http.put(qry,cs).then(
                    function (data) {
                        deferred.resolve(data)
                    }, function (err) {
                        deferred.reject(angular.toJson(err))
                    }
                )

                return deferred.promise

            },
            getCodeSystem : function (id,url) {

                //get the CodeSystem used for pre published concepts
                let deferred = $q.defer()
                let qry = `CodeSystem/${id}`

                //console.log(qry)
                let encodedQry = encodeURIComponent(qry)

                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        //the CodeSystem was found
                        deferred.resolve(data.data)
/*
                        let bundle = data.data
                        console.log(bundle)
                        if (bundle ) {
                            bundle.entry = bundle.entry || []
                            let ar = []
                            switch (bundle.entry.length) {
                                case 0 :
                                    //a new CodeSystem
                                    let cs = {resourceType : 'CodeSystem',status:'active',name:"UnpublishedConcepts"}
                                    cs.id = id
                                    cs.url = url
                                    //cs.version =  csVersion //"http://snomed.info/sct/21000210109"
                                    cs.title = "Concepts that are not yet formally published"
                                    cs.identifier = [{system:"http://canshare.co.nz/fhir/NamingSystem/codesystems",value:cs.name}]
                                    cs.publisher = "Te Aho o Te Kahu"
                                    cs.contact = [{telecom:[{system:"email",value:"info@teaho.govt.nz"}]}]
                                    cs.concept = []
                                    deferred.resolve(cs)


                                    break
                                case 1 :
                                    console.log(bundle.entry[0].resource)
                                    deferred.resolve(bundle.entry[0].resource)
                                    break
                                default :
                                    deferred.reject(`There were ${bundle.entry.length} CodeSystem resources with the url ${csUrl}`)
                            }


                        } else {
                            deferred.reject("No data returned ")
                        }
                        */

                    }, function (err) {
                        if (err.status == '404') {
                            //not found - create
                            let cs = {resourceType : 'CodeSystem',status:'active',name:id}
                            cs.id = id
                            cs.url = url
                            cs.content = "complete"
                            cs.title = "Concepts that are not yet formally published"
                            cs.identifier = [{system:"http://canshare.co.nz/fhir/NamingSystem/codesystems",value:cs.name}]
                            cs.publisher = "Te Aho o Te Kahu"
                            cs.contact = [{telecom:[{system:"email",value:"info@teaho.govt.nz"}]}]
                            cs.concept = []
                            deferred.resolve(cs)
                        } else {
                            console.log(err)
                            deferred.reject(err)
                        }



                    }
                )
                return deferred.promise

            },

            getConceptTypeDEP : function(el)  {
                //get the type of concept - display or prepub
                let code
                if (el.extension) {
                    el.extension.forEach(function (ext) {
                        if (ext.url == extUrl) {
                            code = ext.valueCode
                        }

                    })
                }
                return code
            },


        setConceptTypeDEP : function(el,type)  {
            //set the concept type = 'prepub' and 'display'
            //right now we can assume that this will be the only extension we use.
            //If there's already an extension on this element then just remve it
            if (el.extension) {
                el.extension.length = 0
            } else {
                el.extension = []
            }

            let ext = {url:extUrl,valueCode:type}
            el.extension.push(ext)
        }




    }


    })