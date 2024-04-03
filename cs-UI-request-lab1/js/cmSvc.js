angular.module("pocApp")

    .service('cmSvc', function($q,$http) {

        let config= {}

        async function fillListFromValueSet(lst,vsUrl) {

        }



        return {
            rulesEngine :  function (propertyDEP,hashInput,element,hashExpandedVs) {
                //get the options for a property.
                //parameters:
                //  property - the property name for which concepts are sought - eg cancer-stream
                //  hashInput - a hash keyed by property name that has all the properties where the user has selected a value. format {code: display:}
                //  element -  has all the possible targets for that property (each property has one element in the CM)
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

                        let hashPropertiesExamined = {}     //a hash for all the properties in the DON

                        //there is at least dependsOn. All must match for the target VS to be included
                        let ar = []     //the list of candidate VS
                        let include = true
                        target.dependsOn.forEach(function(don){
                            hashPropertiesExamined[don.property] = true
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
                                    include = false

                                    console.log(don)
                                    let arCodes = hashExpandedVs[don.value.trim()]     //the set of codes in the indicated valueset
                                    let value = hashInput[don.property]         //the value of the property we're looking at

                                    //if there's a value for the property then see if it is in the ValueSet
                                    if (value) {
                                        if (arCodes && value) {
                                            for (const concept of arCodes) {
                                                //console.log(concept)
                                                if (concept.code == value.code) {
                                                    include = true
                                                    break
                                                }
                                            }
                                        }
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
            getVSContentsHash : function (lst) {
                let deferred = $q.defer()
                console.log('getting hash')
                //given a list of urls, expand all of them
                //if a given expansion fails, just do the others. The assumption is that
                //the VS is not available

                let hashExpanded = {}
              //  let deferred = $q.defer()
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

                    //let hashExpanded = {}
/*
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
*/

                    console.log(hashExpanded)
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


            getVSContentsHashOriginal : function (lst) {
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