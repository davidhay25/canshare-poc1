angular.module("pocApp")

    .service('cmSvc', function($q,$http) {

        let config= {}

        async function fillListFromValueSet(lst,vsUrl) {


        }



        return {
            getOptionsOneProperty : function (property,hashInput,element) {
                //get the options for a property.
                //parameters:
                //  property - the property name for which concepts are sought - eg cancer-stream
                //  hashInput - a hash keyed by property name that has all the properties where the user has selected a value
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
                        //there is at least dependsOn. All must match for the target VS to be included
                        let ar = []     //the list of candidate VS
                        let include = true
                        target.dependsOn.forEach(function(don){
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
                                if (! hashInput[don.property] || hashInput[don.property].code !== don.value) {
                                    include = false     //nope
                                }
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


            }

        }
    })