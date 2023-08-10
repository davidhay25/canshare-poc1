angular.module("pocApp")

    .service('querySvc', function($q,$http) {

        function findExtension(item,url) {
            //return an array with all matching extensions
            let ar = []

            if (item && item.extension) {
                for (var i=0; i <  item.extension.length; i++){
                    let ext = item.extension[i]
                    if (ext.url == url) {
                        ar.push(ext)
                    }
                }
            }
            return ar
        }

            return {
                makeTree : function (cm) {
                    //generate a tree view of the conceptmap
                    //assume only 1 group
                    //assume that the cm is valid - all elements / targets have a code & display
                    //todo - need cm validator
                    let treeData = []
                    let root = {id:'root',text: "CanShare ConceptMap",parent:'#',data:{}}
                    treeData.push(root)

                    cm.group[0].element.forEach(function (element) {

                        let elementNode = {id:element.code,text:element.display,parent:'root',data:{type:'source',data:element}}
                        treeData.push(elementNode)

                        element.target.forEach(function (target) {

                            let id = `${element.code}-${target.code}`

                            let targetNode = {id:id,text:target.display,parent:elementNode.id,data:{type:'target',data:target}}
                            treeData.push(targetNode)

                            if (target.dependsOn) {
                                target.dependsOn.forEach(function (dep) {
                                    let text = `${dep.property} = ${dep.value} (${dep.display})`
                                    let id = `${target.code}-${dep.property}-${dep.value}`
                                    let depNode = {id:id,text:text,parent:targetNode.id,data:{type:'dependsOn',data:target}}
                                    treeData.push(depNode)
                                })
                            }

                        })
                    })

                    console.log(treeData)
                    return treeData

                },

                getTargetsAllSources : function(params,cm){
                    //get the vs for all elements
                    //much common code with processMyTranslate()
                    //todo extract to common function

                    let results = {}    //returns an array of matching target entries
                    cm.group.forEach(function (group) {
                        group.element.forEach(function (element) {
                            //let matchingTargets = []
                            let sourceCode = element.code
                            results[sourceCode] = []
                            element.target.forEach(function (target) {
                                if (target.dependsOn) {
                                    //create a hash by property
                                    let hashProperty = {}
                                    target.dependsOn.forEach(function (dep) {
                                        hashProperty[dep.property] = dep
                                    })
                                    //now iterate through the params, checking the property and value
                                    let include = true     //whether to include the target. default true
                                    params.forEach(function (param) {
                                        if (hashProperty[param.property]) {
                                            //check the value
                                            let p = hashProperty[param.property]
                                            if (p.value !== param.value.code) {
                                                include = false
                                            }
                                        }
                                    })

                                    if (include) {
                                        results[sourceCode].push(target)
                                    }


                                } else {
                                    //if no dependsOn, then always add
                                    results[sourceCode].push(target)
                                }

                            })

                            console.log('gotchaX!')

                        })
                    })

                    return results

                },

                processMyTranslate : function (lookingForCode,params,cm) {
                    //performing the translate 'lookup' function using my simplified approach
                    //lookingForCode is the code of the thing we want - eg Intentof treatment
                    //params is {property: value:}    - key is the property in the dependsOn, value is the CodeableConcept value
                    //cm is the concept map

                    //iterate through the cm.group and group.element looking for a matching code. There should only be 1
                    //when the element is found, iterate through all the targets.
                    //for each target:
                    //      if there is no dependsOn then the target is added to the result. Otherwise:
                    //      for each item in params, look for a matching target with that property. The logic is AND
                    //          if the matching property in the target does not match the param, then the comparison fails.
                    //              any failure to match means the target is not added to the result
                    //          if there is no target.property that matches the params.property then the comparison succeeds


                    let results = []    //returns an array of matching target entries
                    cm.group.forEach(function (group) {
                        group.element.forEach(function (element) {
                            if (element.code == lookingForCode.code) {
                                element.target.forEach(function (target) {
                                    if (target.dependsOn) {
                                        //create a hash by property
                                        let hashProperty = {}
                                        target.dependsOn.forEach(function (dep) {
                                            hashProperty[dep.property] = dep
                                        })
                                        //now iterate through the params, checking the property and value
                                        let include = true     //whether to include the target. default true
                                        params.forEach(function (param) {
                                            if (hashProperty[param.property]) {
                                                //check the value
                                                let p = hashProperty[param.property]
                                                if (p.value !== param.value.code) {
                                                    include = false
                                                }
                                            } else {
                                                //if the target doesn't have a corresponding property, then include it
                                                //include = true
                                            }

                                        })

                                        if (include) {
                                            //add any ValueSet directly to the target
                                            //todo - not using this now...
                                            /*
                                            let ext = findExtension(target,"http://canshare.co.nz/fhir/StructureDefinition/conceptmap-valueset")
                                            if (ext[0] && ext[0].valueUri) {
                                                target.valueSet = ext[0].valueUri
                                            }
                                            */
                                            results.push(target)
                                        }


                                    } else {
                                        //if no dependsOn, then always add
                                        results.push(target)
                                    }

                                })

                                console.log('gotcha!')
                            }
                        })
                    })

                    return results

                },

                getCMProperties : function (cm) {
                    //return all the properties referred to in the 'dependsOn' element
                    let hash = {}       //will be a hash of all properties mentioned within the map
                    let arSources = []  //all the element.code / element.display items. What can be searched for.

                    if (cm.group) {
                        cm.group.forEach(function (group) {
                            if (group.element) {
                                group.element.forEach(function (element) {
                                    //add the code / display to the list of 'sources'
                                    //assume no dups.
                                    let concept = {code:element.code,display:element.display}
                                    arSources.push(concept)
                                    if (element.target) {
                                        element.target.forEach(function (target) {
                                            if (target.dependsOn) {
                                                target.dependsOn.forEach(function (don) {
                                                    let property = don.property
                                                    //hash[property] = hash[property] || [{code:'dummy',display:'Nothing selected'}]
                                                    hash[property] = hash[property] || []
                                                    let obj = hash[property]
                                                    let concept = {system:don.system,code:don.value,display:don.display}

                                                    if (! obj[concept.code]) {
                                                        obj[concept.code] = concept
                                                    }
                                                })
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    }

                    return {hashProperties:hash,arSources:arSources}


                },

                getOneConceptMap : function(url,expand) {
                    let deferred = $q.defer()

                    let qry = `ConceptMap?url=${url}`  //?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c`

                    if (expand) {
                        qry += "&_summary=false"
                    }

                    console.log(qry)
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {

                            let bundle = data.data
                            if (bundle && bundle.entry) {
                                let ar = []
                                bundle.entry.forEach(function (entry) {

                                    ar.push(entry.resource)
                                })

                                deferred.resolve(ar)
                          } else {
                                deferred.reject("not found")
                            }

                        }, function (err) {
                            console.log(err)
                            deferred.reject(err)
                        }
                    )

                    return deferred.promise
                },
                getConceptMaps : function(){
//return a list of subsetted canshare valuesets
                    let deferred = $q.defer()

                    let qry = `ConceptMap`  //?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c`
                    console.log(qry)
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let bundle = data.data
                            if (bundle && bundle.entry) {
                                let ar = []
                                bundle.entry.forEach(function (entry) {
                                    let item = {cm:entry.resource}
                                    item.display = entry.resource.title || entry.resource.name

                                    ar.push(item)
                                })
                                deferred.resolve(ar)
                            }
                        }, function (err) {
                            console.log(err)
                            deferred.reject(err)
                        }
                    )

                    return deferred.promise
                },

                getValueSets : function () {
                    //return a list of subsetted canshare valuesets
                    let deferred = $q.defer()

                    let qry = `ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c`
console.log(qry)
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let bundle = data.data
                            if (bundle && bundle.entry) {
                                let ar = []
                                bundle.entry.forEach(function (entry) {
                                    let item = {vs:entry.resource}
                                    item.display = entry.resource.title || entry.resource.name

                                    ar.push(item)
                                })
                                deferred.resolve(ar)
                            }
                        }, function (err) {
                            console.log(err)
                            deferred.reject(err)
                        }
                    )

                    return deferred.promise


                }


            }
        }
    )