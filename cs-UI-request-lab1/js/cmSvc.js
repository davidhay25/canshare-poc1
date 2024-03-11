angular.module("pocApp")

    .service('cmSvc', function($q,$http) {

        let config= {}

        async function fillListFromValueSet(lst,vsUrl) {

        }



        return {
            rulesEngine :  function (property,hashInput,element,hashExpandedVs) {
                //get the options for a property.
                //parameters:
                //  property - the property name for which concepts are sought - eg cancer-stream
                //  hashInput - a hash keyed by property name that has all the properties where the user has selected a value. format {code: display:}
                //  element -  has all the possible targets for that property (each property has one element in the CM)

                //current processing:
                //  start by creating a list for all the elements
                //  all the targets in the element are examined.
                //      if there are no dependsOn the target is included. The ValueSet is expanded and all values added to the list.
                //  if the target has a set of dependsOn, they are all examined. Each dependsOn must match for the target to be included
                //      if the value is 0, then there must be no input for that property for the target to be included
                //      otherwise (the value is !== 0) then there must be an input value for that property for it to be included
                //      if all the dependsOn criteria are met, then the target ValueSet is expanded and the contents added to the list

                let lstConcepts = []    //this will be the set of possible concepts
                if (! element.target) {
                    return lstConcepts
                }

                console.log(hashExpandedVs)

                let lstVs = []          //this will be a list of valueSets whose contents are in the list of possible values
                let lstMatchingRules = []   //the rules that were matched
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
                                    if (! hashInput[don.property] || hashInput[don.property].code !== don.value) {
                                        include = false     //nope
                                    }
                                } else  if (don['x-operator'] == "in-vs" ) {
                                    //need to see if the code in hashInput[don.property] is a member of the VS don.value
                                    include = false
                                    console.log(don)
                                    let arCodes = hashExpandedVs[don.value]
                                    let value = hashInput[don.property]
                                    if (arCodes) {
                                        for (const concept of arCodes) {
                                            if (concept.code == value.code) {
                                                include = true
                                                break
                                            }
                                        }
                                    }
                                }
                            }

                        })

                        //If there are any properties with input values that we haven't examined, then exclude
                        //ie if some other property has a value, but the don doesn't mention it then exclude it

                        Object.keys(hashInput).forEach(function (inputProperty) {
                            //inputProperty is a property that has a provided input
                            if (! hashPropertiesExamined[inputProperty]) {
                                //there is a property that was passed in with a value, but none of the DONs had it as a value.
                                //in this case the match fails.
                                include = false
                            }


                        })




                        //right, we've looked at all the dependsOn - should the target be included?
                        if (include) {
                            // yes!
                            lstVs.push(target.code)
                            lstMatchingRules.push(inx)
                            target.matched = true
                        }


                    }

                })

                return {lstVS:lstVs,lstMatches:lstMatchingRules}


            },
            getVSContentsHash : function (lst) {
                //given a list of urls, expand all of them
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


                            hashExpanded[response.data.url] = ar
                        }

                    });

                    deferred.resolve(hashExpanded)

                }).catch(function(error) {
                    // At least one promise was rejected
                    console.error('Error:', error);
                });

                return deferred.promise



            }







        }
    })