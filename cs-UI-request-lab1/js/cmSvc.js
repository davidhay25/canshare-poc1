angular.module("pocApp")

    .service('cmSvc', function($q,$http) {

        let config= {}

        async function fillListFromValueSet(lst,vsUrl) {

        }

        return {
            rulesEngine :  function (hashInput,element,hashExpandedVs) {
                //get the options for a property. The actual property is not needed as we're just looking in the element
                //parameters:

                //  hashInput - a hash keyed by property name that has all the properties where the user has selected a value. format {code: display:}
                //  element -  has all the possible targets for the property under search(each property has one element in the CM)
                //          we don't need to specify the property - we just need all matching targets (from hashInput) in th eelement
                //  hashExpandedVs - all the valueSets needed for the 'in-valueset' rule


                //current processing:
                //  start by creating a list for all the elements
                //  all the targets in the element are examined.
                //      if there are no dependsOn the target is included. The ValueSet is expanded and all values added to the list.
                //  if the target has a set of dependsOn, they are all examined. Each dependsOn must match for the target to be included
                //      if the value is 0, then there must be no input for that property for the target to be included
                //      otherwise (the value is !== 0) then there must be an input value for that property for it to be included
                //      if all the dependsOn criteria are met, then the target ValueSet is expanded and the contents added to the list

               // let lstConcepts = []    //this will be the set of possible concepts
                if (! element.target) {
                    alert("No element.target")
                    return {}
                }

                if (! hashExpandedVs) {
                    alert("Sorry, the valueSets have not completely loaded. Please try again.")
                    return
                }

                //console.log(hashExpandedVs)

                let lstVs = []          //this will be a list of valueSets whose contents are in the list of possible values
                let lstMatchingRules = []       //the index of rules/targets that were matched
                let lstMatchingTargets = []     //the targets that matched
                element.target.forEach(function (target,inx) {
                    //let include = falsein
                    target.matched = false
                    if (! target.dependsOn) {
                        //No depends on means the VS contents are added
                        target.matched = true
                        lstVs.push(target.code)
                    } else {

                        //let hashPropertiesExamined = {}     //a hash for all the properties in the DON

                        //there is at least dependsOn. All must match for the target VS to be included
                        //let ar = []     //the list of candidate VS
                        let include = true


                        target.dependsOn.forEach(function(don){
                            //hashPropertiesExamined[don.property] = true

                            if (don.value == '0') {
                                //there should be no input with this property - or an input with a code of '0'
                                if (hashInput[don.property]) {
                                    //does it have the value '0'
                                    if (hashInput[don.property].code !== '0') {
                                        include = false     //there is an input value so the target won't match
                                    }

                                } else {
                                    //include = false
                                }
                            } else {
                                //there is an don value - is there an input property with a matching value

                                //here is where we need to have different processing based on operator
                                if (don['x-operator'] == "=" ) {
                                    //simple equality
                                    //if there is no value, or if there is a value and it is different then don't match
                                    if (! hashInput[don.property] || (hashInput[don.property].code !== don.value) ) {
                                        include = false     //nope
                                    }
                                } else  if (don['x-operator'] == "in-vs" ) {
                                    //need to see if the code in hashInput[don.property] is a member of the VS don.value
                                    let isInVs = false      //set to true if a match is found. If not found, the include is false

                                    //include = false

                                   // console.log(don)
                                    let arCodes = hashExpandedVs[don.value.trim()]     //the set of codes in the indicated valueset
                                    let value = hashInput[don.property]         //the value of the property we're looking at

                                    //if there's a value for the property then see if it is in the ValueSet
                                    if (value) {
                                        if (arCodes && value) {
                                            for (const concept of arCodes) {
                                                //console.log(concept)
                                                if (concept.code == value.code) {
                                                    // can't just do this as any vs match would then select the rule include = true
                                                    isInVs = true
                                                    break
                                                }
                                            }
                                        }
                                        if (! isInVs) {
                                            //if the value could not be found in the VS then the rule fails
                                            include = false
                                        }


                                    } else {
                                        //if there's no value for this condition, then the whole rule fails
                                        include = false
                                    }

                                }
                            }

                        })


                        //right, we've looked at all the dependsOn - should the target be included?
                        if (include) {
                            // yes!
                            //todo - could tidy this up a bit
                            lstVs.push(target.code)
                            lstMatchingRules.push(inx)
                            lstMatchingTargets.push(target)
                            target.matched = true
                        }


                    }

                })

                return {lstVS:lstVs,lstMatches:lstMatchingRules,lstMatchingTargets:lstMatchingTargets}


            },
            reverseRulesEngine : function (element,concept,hashExpandedVs) {
                //check all the targets in the element for conditions where the concept would be a match

                if (! element && ! element.target) {
                    return
                }


                //the list of targets that, if the dependsOn are met, would return a vs containing the concept
                //or the concept itself (target.code is the concept)
                let lstTargets = []
                for (const target of element.target) {

                    if (isMatch(target.code,concept)) {
                        lstTargets.push(target)
                    }

                }

                //now, we can assemble the list of property values
                let hashProperty = {}
                for (const target of lstTargets) {
                    if (target.dependsOn) {
                        for (const don of target.dependsOn) {
                            let property = don.property
                            let value = don.value

                            if (value !== '0') {
                                hashProperty[property] = hashProperty[property] || []

                                //see if the code is already in the accumulated list...
                                let ar = hashProperty[property].filter(concept => concept.code == don.value )

                                //... and ignore if it is
                                if (ar.length == 0) {

                                    if (value.startsWith('http')) {
                                        //this is a valueset
                                        let arConcepts = hashExpandedVs[value]
                                        if (arConcepts) {
                                            hashProperty[property] = hashProperty[property] || []

                                            for (const concept of arConcepts) {
                                                let ar = hashProperty[property].filter(c =>c.code == concept.code)
                                                if (ar.length == 0) {
                                                    hashProperty[property].push(concept)
                                                }
                                                //hashProperty[property]
                                            }




                                        } else {
                                            alert(`ValueSet ${value} not found`)
                                        }

                                    } else {
                                        let concept = {code:value,display:don.display}
                                        hashProperty[property].push(concept)
                                    }



                                }
                            }

                        }
                    }
                }


                console.log(hashProperty)


                return {targets:lstTargets,element: element,hashProperty:hashProperty,sourceConcept:concept}


                function isMatch(code,concept) {
                    //is the concept in the code attribute
                    if (code == concept.code) {
                        //the concept IS the code
                        return true
                    }
                    if (hashExpandedVs[code]) {
                        //the code is actually a url in the expanded VS todo ?need to check for when there is no expanded vs
                        let arCodes = hashExpandedVs[code]
                        //let isInVs = false

                        let ar = arCodes.filter(item => item.code == concept.code)
                        if (ar.length > 0) {
                            return true
                        }
                        /*
                        for (const vsConcept of arCodes) {
                            //console.log(concept)
                            if (concept.code == vsConcept.code) {
                               return true
                              //  isInVs = true
                                break
                            }
                        }
                        */
                    }


                }

            },
            saveInCacheDEP : function (window,key,object) {
                let deferred = $q.defer()
                //save the supplied object in an indexedDb cache
                const request = window.indexedDB.open("cmData", 3)

                request.onerror = (event) => {
                    deferred.reject(request.errorCode)
                    // Do something with request.errorCode!
                };
                request.onsuccess = (event) => {

                    // Do something with request.result!
                };

                return deferred.promise

            } ,
            getVSContentsHash : function (lst) {
                let deferred = $q.defer()
                console.log('getting hash')
                //given a list of urls, expand all of them
                //if a given expansion fails, just do the others. The assumption is that
                //the VS is not available

                let hashExpanded = {}
                let promises = []

                lst.forEach(function (url) {
                    //let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`
                    //let encodedQry = encodeURIComponent(qry)
                    //let call = `nzhts?qry=${encodedQry}`
                    //promises.push($http.get(call))
                    promises.push(addToHash(url,hashExpanded))
                })

                $q.all(promises).then(function(results) {
                    // All promises resolved successfully

                    deferred.resolve(hashExpanded)

                }).catch(function(error) {
                    // At least one promise was rejected. This shouldn't actually happen as addToHash() never rejects
                    console.error('Error:', error);
                    console.log(hashExpanded)
                    deferred.resolve(hashExpanded)
                })

                return deferred.promise


                //retrieve the expanded VS from the server and add to hashExpanded
                //ignore any errors - mostly 404
                function addToHash(url,hash) {
                    //console.log(url)
                    let defer = $q.defer()
                    let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`
                    let encodedQry = encodeURIComponent(qry)
                    let call = `nzhts?qry=${encodedQry}`

                    $http.get(call).then(
                        function (response) {
                            //console.log(`${url} success`)
                            if (response.data && response.data.expansion && response.data.expansion.contains) {

                                let ar = []
                                response.data.expansion.contains.forEach(function (concept) {
                                    ar.push(concept)
                                })

                                ar.sort(function (a,b) {
                                    if (a.display > b.display) {
                                        return 1
                                    } else {
                                        return -1
                                    }
                                })

                                hash[response.data.url] = ar
                                defer.resolve()
                            }
                        },
                        function (err) {
                            //ignore any errors
                            //console.log(`${url} fail`)
                            defer.resolve()
                        }
                    )




                    return defer.promise
                }

            },


            getVSContentsHashOriginalDEP : function (lst) {
                console.trace('getting hash')
                //given a list of urls, expand all of them
                //if a given expansion fails, just do the others. The assumption is that
                //the VS is not available


                let deferred = $q.defer()
                let promises = []
                lst.forEach(function (url) {
                    let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`
                    let encodedQry = encodeURIComponent(qry)
                    let call = `nzhts?qry=${encodedQry}`
                    promises.push($http.get(call))
                })

                $q.all(promises).then(function(results) {
                    // All promises resolved successfully

                    let hashExpanded = {}

                    // Process each response
                    angular.forEach(results, function(response) {

                        console.log(response)
                        if (response.data && response.data.expansion && response.data.expansion.contains) {

                            let ar = []
                            response.data.expansion.contains.forEach(function (concept) {
                                ar.push(concept)
                            })

                            ar.sort(function (a,b) {
                                if (a.display > b.display) {
                                    return 1
                                } else {
                                    return -1
                                }
                            })

                            hashExpanded[response.data.url] = ar
                        }

                    });

                    deferred.resolve(hashExpanded)

                }).catch(function(error) {
                    // At least one promise was rejected
                    console.error('Error:', error);
                });

                return deferred.promise


                function f() {

                }

            }




        }
    })