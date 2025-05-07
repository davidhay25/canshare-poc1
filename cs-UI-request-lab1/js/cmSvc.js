angular.module("pocApp")

    .service('cmSvc', function($q,$http) {

        let config= {}


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
                        lstVs.push(target.code)     //todo 7 may - what is tge code is actually a code not a vs url???
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
            reverseRulesEngine : function (element,concept,hashExpandedVs,currentValues) {
                //check all the targets in the element for conditions where the concept would be a match
                //  ie target.value = concept.code or target.value is a ValueSet Url and the concept is a member of that VS

                //element is the element from the ConceptMap that corresponds to the property for which concept is the value
                //concept is the user selected value
                //hashExpandedVs has all the expanded concepts of all the ValueSets
                //currentValues is the hash[property] value that was selected

                let that = this

                if (! element && ! element.target) {
                    return
                }

                let snomed = "http://snomed.info/sct"

                //the list of targets that, if the dependsOn were met, would return a vs containing the concept
                //or the concept itself (target.code is the concept)
                let lstTargets = []
                for (const target of element.target) {

                    //is the target code either the same as the concept.code or, is target.code a ValueSet url, and if so it the concept.code a member
                    //and the concept is part of that Valueset
                    if (isMatch(target.code,concept)) {

                        //now check the dependsOn. If any of them have the value '0' then the target is not included
                        //if there are no dependsOn, then don't include

                        if (target.dependsOn) {

                            let ar = target.dependsOn.filter(don => don.value == '0' )
                            if (ar.length == 0) {
                                //OK, none of the dependsOn have the value 0
                                //now check the other depends on. If there is a dependsOn for a property, then
                                //the property (in currentValues) must have the correct value (which is either equal or in-vs)

                                let canInclude = true   //start by assuming it can be included, and take it out if not.

                                if (true) {         //this just allows the extended logic to be turned on or off
                                    for (const don of target.dependsOn) {
                                        let propKey = don.property
                                        if (! currentValues[propKey]) {
                                            //there is no entered value for this property, therefore the target is not included
                                            canInclude = true
                                            //canInclude = false
                                        } else {
                                            let userSelectedConcept = currentValues[propKey]    //what the user selected - might be null
                                            //there is a user entered value for this property - does it match the don.value?
                                            if (don['x-operator' == 'in-vs']) {
                                                //the depends on value is a valueset url. The user entered value must be in that vs

                                                let arCodes = hashExpandedVs[don.value] || []     //the codes in the valueset - don.value is the vs url
                                                let ar = arCodes.filter(item => item.code == userSelectedConcept.code)  //is the previous value in the VS?
                                                if (ar.length == 0) {
                                                    //nope.
                                                    canInclude = false
                                                }
                                            } else {
                                                //this is an equality check - the user entered value must be the same
                                                if (userSelectedConcept.code !== don.value) {
                                                    //no, it is different.
                                                    canInclude = false
                                                }
                                            }
                                        }
                                    }

                                }

                                //finally, if all the checks match we can add the target to the list
                                if (canInclude) {
                                    lstTargets.push(target)
                                }
                            }
                        }
                    }
                }

                //now, we have all the matching targets (ie where target.code is the concept code or a VS with the concept as a member
                // now we can assemble the list of property values from the dependsOn values
                //idea is that if the target was matched, then all the values for all the properties are the
                //options for that property. eg if a target.dependsOn has the property 'cancer-stream' and the value '93744007' then
                //  93744007 must be added to the list of possible options for cancer-stream
                let hashProperty = {}   //a hash keyed by property with all the permissable values for that property
                for (const target of lstTargets) {
                    if (target.dependsOn) {
                        for (const don of target.dependsOn) {
                            let property = don.property
                            let value = don.value

                            hashProperty[property] = hashProperty[property] || []

                            if (value.startsWith('http')) {
                                //this is a valueset
                                let arConcepts = hashExpandedVs[value]
                                if (arConcepts) {       //there are some concepts
                                    hashProperty[property] = hashProperty[property] || []

                                    for (const concept of arConcepts) {
                                        //add the concept, unless it is already there
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
                                //the value is a snomed code

                                let concept = {code:value,display:don.display,system:snomed}
                                let ar = hashProperty[property].filter(c =>c.code == concept.code)
                                if (ar.length == 0) {
                                    hashProperty[property].push(concept)
                                }
                                //hashProperty[property].push(concept)
                            }

                        }
                    }
                }

                //todo - remove duplications from hashProperty

                //sort the concept alphabetically, placing anythig with 'other' at the bottom
                for (key of Object.keys(hashProperty)) {
                    hashProperty[key] = that.sortConceptList(hashProperty[key])
                }


                //console.log(hashProperty)
                return {targets:lstTargets,currentValues:currentValues,  element: element,hashProperty:hashProperty,sourceConcept:concept}


                //does the target.code value either match the concept.code or is the
                //code actually a valueSet that has the concept with it
                function isMatch(code,concept) {
                    //is the concept in the code attribute
                    if (code == concept.code) {
                        //the concept IS the code
                        return true
                    }
                    //now see if target.code is a valueset, and the concept is in that valueset
                    if (hashExpandedVs[code]) {
                        //the code is actually a url in the expanded VS todo ?need to check for when there is no expanded vs
                        let arCodes = hashExpandedVs[code]
                        //let isInVs = false

                        let ar = arCodes.filter(item => item.code == concept.code)
                        if (ar.length > 0) {
                            return true
                        }

                    }


                }

            },

            getAllVSinCM : function (CM,lstVsUrl) {
                //get all the VS referenced by a CM. Update the lstVsUrl

                CM.group.forEach(function (group) {
                    group.element.forEach(function (element) {
                        element.target.forEach(function (target) {

                            if (target.code && target.code.startsWith('http')) {
                                //lstVsUrl.push(target.code)
                                addUrlToList(target.code)
                            }

                            if (target.dependsOn) {
                                target.dependsOn.forEach(function (dep) {
                                    dep['x-operator'] = "="
                                    if (dep.extension) {
                                        dep.extension.forEach(function (ext) {
                                            if (ext.url == 'http://canshare.co.nz/fhir/StructureDefinition/do-operator') {
                                                dep['x-operator'] = ext.valueCode

                                                if (ext.valueCode == 'in-vs') {
                                                    //dep.value is a ValueSet url. We will need the contents of this valueset for rules processing

                                                    addUrlToList(dep.value)



                                                }

                                            }
                                        })
                                    }

                                })
                            }


                        })
                    })

                })
                return lstVsUrl

                function addUrlToList(url) {
                    if (lstVsUrl.indexOf(url) == -1) {
                        lstVsUrl.push(url)
                    }

                }

            },

            sortConceptList : function (lst) {
                //sort a list of concepts alphabetically, placing anuthing starting with 'other' at th ebottom

                //first split into 2 lists
                let lstMain = []
                let lstOther = []

                lst.forEach(function (concept) {
                    if (concept.display) {
                        let disp = concept.display.toLowerCase()
                        if (disp.startsWith('other')) {
                            lstOther.push(concept)
                        } else {
                            lstMain.push(concept)
                        }
                    } else {
                        //shouldn't really happen...
                        concept.display = "Code with no display"
                        lstMain.push(concept)
                    }

                })

                //now sort each list
                lstMain.sort(function (a,b) {
                    if (a.display > b.display) {
                        return 1
                    } else {
                        return -1
                    }
                })

                lstOther.sort(function (a,b) {
                    if (a.display > b.display) {
                        return 1
                    } else {
                        return -1
                    }
                })
                //return the concatenated list
                return lstMain.concat(lstOther)

            },
            getVSContentsHash : function (lst) {
                let deferred = $q.defer()
                console.log('getting hash')
                //given a list of urls, expand all of them
                //if a given expansion fails, just do the others. The assumption is that
                //the VS is not available

                let hashExpanded = {}
                let promises = []
                let errors = []         //any errors

                lst.forEach(function (url) {

                    //this placeholder will be replaced with the expanded contents - unless the VS is not found
                    //this avoids calling the expand multiple times... as the calling routine will cache this concept...
                    hashExpanded[url] = [{system:"http://example.com",code:"notfound",display:"ValueSet not found"}]
                    promises.push(addToHash(url,hashExpanded,errors))
                })


                $q.all(promises).then(
                    function(results) {
                    // All promises resolved successfully

                        console.log(errors)
                        //hashExpanded['errors'] = errors     //todo really should use a VO here...
                    deferred.resolve({hashExpanded:hashExpanded,errors:errors})

                }, function () {
                    //console.log(hashExpanded)
                        console.log(errors)
                        //hashExpanded['errors'] = errors     //todo really should use a VO here...
                        deferred.resolve({hashExpanded:hashExpanded,errors:errors})
                    //deferred.resolve(hashExpanded)
                    }

                )


                return deferred.promise


                //retrieve the expanded VS from the server and add to hashExpanded
                //ignore any errors - mostly 404
                function addToHash(url,hash,errors) {
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
                            } else {
                                defer.resolve()
                            }
                        },
                        function (err) {
                            //ignore any errors

                            let errLne = {url:url,status:err.status,oo:err.data}
                            errors.push(errLne)

                            console.log(`${url} fail`)

                          //  hash[response.data.url] = ar

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