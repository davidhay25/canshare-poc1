angular.module("pocApp")
    .controller('cmCtrl',
        function ($scope,$http,$q,querySvc,cmSvc,$uibModal,utilsSvc) {

            $scope.local = {cmOptions : {},cm:{property:{}}}
            $scope.default = {}

            //the mode of operation of the UI - manual or directed

            $scope.default.mode = 'directed'

            $scope.cmProperties = {}

            // $scope.local.conceptMapTab = 3      //select the UI tab while developing
            $scope.local.uiValues = {}          //a hash of values selected in the UI
            //$scope.input.showHelp = true

            $scope.log= []

            let snomed = "http://snomed.info/sct"

            let vsPrefix = "https://nzhts.digital.health.nz/fhir/ValueSet/"




            //functions to get ConceptMap & expanded ValueSet..
            //localforage is defined by the library script. uses indexedDb as the local storage...
            //https://localforage.github.io/localForage/#data-api-getitem
            $scope.fromCache = false
            localforage.getItem('cmData').then(function(value) {
                // This code runs once the value has been loaded
                // from the offline store.
                if (value) {
                    //if there's a value then the data was already in the cache
                    $scope.fromCache = true
                    $scope.fullSelectedCM = value.cm
                    $scope.hashExpandedVs = value.vs
                    $scope.cacheDate = value.when
                    console.log('retrieved cm & vs from cache')

                    console.log(`Size of ConceptMap: ${utilsSvc.getSizeOfObject($scope.fullSelectedCM)/1000} Kb`)
                    console.log(`Size of ValueSets : ${utilsSvc.getSizeOfObject($scope.hashExpandedVs)/1000} Kb`)
                    //can setup as the service vs will be present

                    console.log($scope.hashExpandedVs)

                    setup()

                   // let vo = {cm:$scope.fullSelectedCM,vs:$scope.hashExpandedVs}
                } else {
                    //retrieve cs & vs from the terninology server. when complete the function
                    //fires the hashExpandedVs event which is trapped below and will save in the cache.
                    console.log('cache empty. Retrieving from TS.')
                    alert("Need to build the terminology cache. This will take around 20 seconds, please wait.")
                    $scope.selectCMItem({cm:{url:"http://canshare.co.nz/fhir/ConceptMap/canshare-select-valueset-map"}})
                }


                //console.log(value);
            }).catch(function(err) {
                // This code runs if there were any errors
                console.log(err);
            });

            $scope.refreshCache = function () {
                let msg = "This will re-load all the artifacts from the terminology server. It will take several seconds (10-20) to complete. Are you sure?"
                if (confirm(msg)) {
                    //$scope.refreshingCache = true
                    //just need to re-read from the TS. Will populate forage cache
                    $scope.selectCMItem({cm:{url:"http://canshare.co.nz/fhir/ConceptMap/canshare-select-valueset-map"}})
                }


            }

            //as the expansion is performed by a child controller, we use this event to get the hash
            $scope.$on('hashExpandedVs',function (event,data) {
                $scope.hashExpandedVs = data


                //save the conceptMap and VS in the db
                let vo = {cm:$scope.fullSelectedCM,vs:$scope.hashExpandedVs,when:new Date()}
                $scope.cacheDate = vo.when
                //https://localforage.github.io/localForage/#data-api-setitem
                localforage.setItem('cmData', vo).then(function (value) {
                    // Do other things once the value has been saved.
                    console.log(value);
                   // delete $scope.refreshingCache
                    alert("Cache has been updated from the Terminology Server.")
                    setup()
                }).catch(function(err) {
                    // This code runs if there were any errors
                    console.log(err);
                });

            })


            //------------- functions supporting the form UI

            //Key variables
            //$scope.cmProperties[key] - the definition of the property.
            //  .options() has the set of possible concepts
            //  .concept is the snomed concept for the property
            //  .singleConcept is set when there is only a single possible value for the property

            //$scope.local.cmOptions[key] - the actual value (a concept) for the property
            
            $scope.clearProperty = function (propKey) {
                //todo should just be empty

                alert('disabled')

                return
                $scope.log = []
                $scope.log.push({msg:`Clearing value of ${propKey}`})

                delete $scope.local.cmOptions[propKey]
                delete $scope.cmProperties[propKey].singleConcept
              //  $scope.log.push({msg:`Start populate from ${propKey}`})
               // $scope.populateUIControl(propKey)

            }



            //called when the 'select concept' icon is clicked to display the filter dialog
            $scope.selectConcept = function (propKey,propDef) {

                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    //size : 'lg',
                    templateUrl: 'modalTemplates/selectConcept.html',

                    controller: 'selectConceptCtrl',

                    resolve: {
                        propDef: function () {
                            return propDef
                        }
                    }

                }).result.then(function (concept) {
                    console.log(concept)

                    //need to set the value of the dropdown as well
                    $scope.local.cmOptions[propKey] = concept

                    $scope.uiValueSelected(propKey,concept)
                })


            }


            $scope.setMaximalOptions = function (propName) {

                let currentValue = $scope.local.cmOptions[propName]

                let vsUrl = `${vsPrefix}${$scope.cmProperties[propName].fullVS}`
                console.log(vsUrl,$scope.hashExpandedVs[vsUrl])
                $scope.cmProperties[propName].options = angular.copy($scope.hashExpandedVs[vsUrl])

                if (currentValue) {
                    for (const concept of $scope.cmProperties[propName].options) {
                        if (concept.code == currentValue.code) {
                            $scope.local.cmOptions[propName] = concept
                            break
                        }
                    }
                }




            }

            //handler when a value is selected
            $scope.uiValueSelected = function (propKey,value) {
                //called when a selection is made for a property in the UI.
                //first perform the reverse lookup to ensure the preceeding values are correct
                //  Mostly the empty ones - but also check that existing values are correct (?when would they not be)
                //  We then populate options for the next one...
                //      actually keep on going if there are no options or only a single one

                if ($scope.default.mode == 'manual') {
                    //in manual mode no action is taken when the user selects a value
                    return
                }

                $scope.log = []     //log actions.
                delete $scope.local.logEntry

                $scope.local.uiTitle = `Property selected: ${propKey}`


                if (propKey == 'primary-site-laterality') {
                    $scope.log.push({msg:'Ignoring laterality'})
                    return
                }


                if (! value) {
                    //I think this is being triggered when a value is being updated after reverse lookup
                    //but in any case, if there is no value then don't do anything
                    $scope.log.push({msg:`uiValueSelected() called with no value. Property value ${propKey} deleted`})
                    delete $scope.local.cmOptions[propKey]
                    return
                }

                //this is the reverse lookup stuff.
                //sets $scope.reverseLookup which {targets:[],element: {},hashProperty:{}}

                performReverseLookup(propKey,value)

                if ($scope.reverseLookup) {
                    //now apply the reverse lookup stuff. Sets empty properties & check already entered
                    $scope.applyReverse()
                }


                $scope.log.push({msg:`Starting forward checks`})
                if (false) {
                    //if the user changes a value in the 'middle' of the set of properties, then the reverse
                    //will have adjusted the ones 'above' it. This code segment checks those 'below' it
                    //this segment checks that any selected values below the selected one are in the options for that property
                    //todo ?? why did I check this - is it still necessary
                    //disabling the check for now - pretty sure it's redundant


                    let checkValue = false
                    Object.keys($scope.cmProperties).forEach(function (key) {

                        if (checkValue) {
                            $scope.log.push({msg:`Fwd: checking existing value of ${key}`})
                            //checkValue is set when we're past the current property
                            //if there is a value, then check to see if it is in local.cmOptions[propName].
                            //if it is then leave it
                            //if not then clear the value (but not the options)
                            //(this supports the reverse lookup)

                            //cmProperties[key].options has the list of options
                            //local.cmOptions[key] has the current value
                            //cmProperties[key].singleConcept has the value if there is only 1

                            if ($scope.local.cmOptions[key]) {
                                $scope.log.push({msg:`Value already selected`,obj:$scope.local.cmOptions[key],objTitle:"Current valie"})
                                //there is a selected value here - is it in the list of options
                                let currentValue = $scope.local.cmOptions[key]
                                let ar = $scope.cmProperties[key].options.filter(concept => concept.code == currentValue.code )


                                if (ar.length == 0) {
                                    $scope.log.push({msg:`${key} value not in new list. Clearing.`,obj:$scope.cmProperties[key].options,objTitle:"Current options"})
                                    //the current value is not in the set of possible values. clear it
                                    //todo - this is different to the reverse lookup where we default the first one. ?which is correct
                                    delete $scope.local.cmOptions[key]
                                    delete $scope.cmProperties[key].singleConcept
                                }
                            }

                            /*
                            $scope.cmProperties[key].options = []  //options for the property. Used by the rules rather than lookup
                            delete $scope.cmProperties[key].singleConcept //flag that the option is a single concept
                            delete $scope.cmProperties[key].noMatches  //flag that no options were found
                            delete $scope.local.uiValues[key]  //data entered for that property
                            delete $scope.local.cmOptions[key]  //list of options for that property
                            */
                        }
                        if (key == propKey) {
                            //ready to start checking values...
                            checkValue = true
                        }
                    })

                }


                //---------------- now can process the next property in the sequence
                let def = $scope.cmProperties[propKey]
                if (def && def.next) {  //next is the property after this one (defined in the initial setup)
                    //def.next is the next control in the order
                    $scope.log.push({msg:`Populate UI control for ${def.next}`})
                    $scope.populateUIControl(def.next)  //populate the UI with the set of possible values. Will check all following properties
                }

                //so that the dropdowns work, make sure the value (local.cmOptions) is from the list cmProperties[k].options
                //Otherwise angular doesn't set the dropdown correctly
                Object.keys($scope.cmProperties).forEach(function (propName) {
                    if ($scope.local.cmOptions[propName] && $scope.cmProperties[propName].options) {
                        let code = $scope.local.cmOptions[propName].code
                        for (const c of $scope.cmProperties[propName].options) {
                            if (c.code == code) {
                                $scope.local.cmOptions[propName] = c
                                break
                            }
                        }
                    }
                })



            }


            //sets the options for a specific property
            $scope.populateUIControl = function (propKey,noNext,calledFromUI) {
                //called to populate the UI control for a single property. Called when a user clicks on the property name in the UI
                //as opposed to uiValueSelected() which is called when a value is selected for a property.
                //it is also called from uiValueSelected() to populate the next property
                //if noNext is true then only lookup the values for this property. Otherwise process all properties below this one
                delete $scope.lstMatchingConceptsForUI
                delete $scope.uiMatchingVS
                delete $scope.singleConcept     //if a single concept is returned (rather than a VS)
                delete $scope.cmProperties[propKey].singleConcept
                delete $scope.cmProperties[propKey].noMatches


                if (calledFromUI) {
                    $scope.local.uiTitle = `Property selected ${propKey}`
                    $scope.log = []
                }

                $scope.log.push({msg:`Looking for options for ${propKey}`})

                if (noNext) {
                    $scope.log.push({msg:`Will only evaluate for this property`})
                }



                //delete $scope.reverseLookup

                //if there is already a value for this property then leave it alone and don't
                //progress further. - no, we need to check that it is still relevant.
                /*
                if ($scope.local.cmOptions[propKey]) {
                    $scope.log.push({msg:`${propKey} already has a value - leave it`  })
                   return
                }
*/
               // $scope.local.uiTitle = `Looking for possible values for ${propKey}`
                //propKey is the property we're wanting to populate
                //strategy is that we want to find the matching target in the CM based solely on the values
                //of elements 'before' this property in the property order.


                //get the ConceptMap element "element" that has all the targets for this property
                let propertyCode = $scope.cmProperties[propKey].concept.code        //the actual code in the element.code
                let cmElement = {}  //the 'element' element from the CM
                for (const element of $scope.fullSelectedCM.group[0].element) {
                    if (element.code == propertyCode) {     //this is the set of targets which could match this code
                        cmElement = element
                        break
                    }
                }


                if (! cmElement.code) {
                    $scope.log.push({msg:`An element in the Concept map for the code ${propertyCode} could not be located`})
                    return
                }

                $scope.log.push({msg:`Found cm element for ${propKey}`,obj:cmElement,objTitle:"CM element"})

                //a hash of all the data entered - but only those 'before' this element
                $scope.uiHashValues = {}

                for (const prop of Object.keys($scope.cmProperties)) {
                    //break when we reach the property being populated.
                    //does assume the object retains the order...
                    if (prop == propKey) {
                        // 27-may - use all values break
                    }
                    $scope.uiHashValues[prop] = $scope.local.cmOptions[prop] //$scope.local.cmOptions has the data entered thus far.
                }

                $scope.log.push({msg:`About to execute rules engine for ${propKey}`,obj:$scope.uiHashValues,objTitle:"Current property values"})

                //now, execute the rules engine to this element and set of codes
                //note that the values passed to this function are only those 'before' this one...
                let vo = cmSvc.rulesEngine($scope.uiHashValues,cmElement,$scope.hashExpandedVs)

                $scope.log.push({msg:`Executed rules engine for ${propKey}`,obj:vo,objTitle:"Engine response"})

                $scope.uiMatchingVS = vo.lstVS                //The valuesets from all rules that were matched
                //$scope.uiMmatchedRules = vo.lstMatches         //the actual targets that matched
                $scope.uiMatchingTargets = vo.lstMatchingTargets

                //Apply the result from the forward rules engine.
                //if it is a valueset then just set the possible values ($scope.cmProperties[propKey].options)
                //If the result is a single concept (does not start with http) then
                //  set the property value ($scope.local.cmOptions[propKey]) and process the next property
                //  also set ($scope.cmProperties[propKey].singleConcept) so it displays in the UI
                //If the result returns no values then set $scope.cmProperties[propKey].noMatches and process the next property

                if ($scope.uiMatchingVS && $scope.uiMatchingVS.length > 0) {

                    $scope.log.push({msg:`${$scope.uiMatchingVS.length} valueset or concept returned`,obj:$scope.uiMatchingVS,objTitle:"ValueSet or concept"})

                    //actually, all VS are aggregated. We look at the first entry only to see if it is a single concept
                    /* if ($scope.uiMatchingVS.length > 1) {
                        $scope.log.push({msg:`WARNING: Only the first one evaluated. `})
                    }
                    */

                    if ($scope.uiMatchingVS[0].indexOf('http') == -1) {
                        //this is a single concept. We can get the display details from the first element of $scope.uiMatchingTargets

                        let target = $scope.uiMatchingTargets[0]
                        $scope.singleConcept = {code:target.code,display:target.display,system:target.system}

                        $scope.cmProperties[propKey].singleConcept = {code:target.code,display:target.display,system:target.system}

                        $scope.log.push({msg:`A single concept for ${propKey} was returned`,obj:$scope.uiMatchingVS[0],objTitle:"Concept"})

                        //set the value of the fixed element
                        //todo - there are multiple objects storing this value - need to be refactored

                        $scope.uiHashValues[propKey] = $scope.singleConcept
                        $scope.local.cmOptions[propKey] = $scope.singleConcept

                        //if the singleConcept isn't in the list of options then it won't display
                        //??? why should this happen?
                        $scope.cmProperties[propKey].options = [$scope.singleConcept]





                        //$//scope.uiHashValues[prop] = $scope.local.cmOptions[prop] //$scope.local.cmOptions has the data entered thus far.


                        //as there is only a single concept, which is not editable then move on to the next one
                        //todo - this does mean we won't see the details
                        let next = $scope.cmProperties[propKey].next
                        if (next && ! noNext) {
                            //$scope.log.push({msg:`WARNING: Only the first one evaluated. `})
                            $scope.populateUIControl(next)
                        }

                    } else {
                        //now examine the valueset expansions to get the actual concepts. There may be more than one...

                        //The list of concepts to apply should be the intersection between what is already in
                        //the property list ($scope.cmProperties[propKey].options) and the list of concepts returned
                        //from the forwards engine (ie a concept that is in both)


                        //empty the current set of options
                        //$scope.cmProperties[propKey].options = []

                        //actually, we now have all the expanded VS in memory (after implementing the reverseengine
                        //and this routine does check all valuesets

                        //first create the complete set of concepts from the forward engine
                        //this is a de-duping exercise...
                        let forwardList = []
                        for (const url of $scope.uiMatchingVS) {
                            let arConcepts = $scope.hashExpandedVs[url]
                            if (arConcepts) {
                                for (const concept of arConcepts) {
                                    let ar = forwardList.filter(concept1 => concept1.code == concept.code )
                                    if (ar.length == 0) {
                                        forwardList.push(concept)
                                    }
                                }

                                //$scope.lstMatchingConceptsForUI = $scope.cmProperties[propKey].options
                                $scope.log.push({msg:`List of concepts `,obj:$scope.cmProperties[propKey].options,objTitle:"Possible concepts"})

                            } else {
                                alert(`The VS with the url ${url} is not present`)
                            }
                        }

                        //now that we have the forward list, we match it with the current list to get those in both
                        //let existingList = $scope.cmProperties[propKey].options || []


                        //todo #1 replace the set of options with the set form the forwards ebgine.
                        //If there is an existing values and it is in the set then leave it
                        //otherwise remove it
                        $scope.cmProperties[propKey].options = forwardList

                        if ($scope.local.cmOptions[propKey]) {
                            let concept = $scope.local.cmOptions[propKey]
                            let ar = forwardList.filter(concept1 => concept1.code == concept.code )
                            if (ar.length == 0) {
                                //nope - the existing value is not in the new list
                                delete $scope.local.cmOptions[propKey]
                            }
                        }



                        /*

                        //TOTO REPLACE empty the properties list
                        if ( $scope.cmProperties[propKey].options.length == 0) {
                            //There's nothing yet so the full forward list can be used
                            $scope.cmProperties[propKey].options = forwardList
                        } else {
                            //there's already a list - need to change it to the intersection...
                            $scope.cmProperties[propKey].options = []

                            //go through the forwardlist...
                            for (let concept of forwardList)  {
                                //is it in the existing list
                                let ar = existingList.filter(concept1 => concept1.code == concept.code )

                                //they are in both....
                                if (ar.length > 0) {
                                    //yes! we can add it...
                                    $scope.cmProperties[propKey].options.push(concept)
                                }
                            }



                        }
                        */






/*
                        //now that we've updated the list of options, we have to update the value as well (for angular)
                        if ($scope.local.cmOptions[propKey]) {
                            let currentCode = $scope.local.cmOptions[propKey].code
                            for (const v of $scope.cmProperties[propKey].options ) {
                                if (v.code == currentCode) {
                                    $scope.local.cmOptions[propKey] = v
                                    break
                                }
                            }
                        }
                        */


                    }



                //we still have to check all the lower ones as well
                    // todo - not completely sure this is right. If so, then we can re-factor the code to alwqys do it (duplicated code ATM)
                let next = $scope.cmProperties[propKey].next
                if (next && ! noNext) {
                    $scope.populateUIControl(next)
                }


                } else {
                    //If there are no applicable values for this property...
                    $scope.log.push({msg:`No options were found`})
                    $scope.cmProperties[propKey].noMatches = true
                    $scope.cmProperties[propKey].options = []
                    delete $scope.cmProperties[propKey].singleConcept

                    let next = $scope.cmProperties[propKey].next
                    if (next && ! noNext) {
                        $scope.populateUIControl(next)
                    }

                }


                //now that we've updated the list of options, we have to update the value as well (for angular)
                //otherwise the dropdowns won't be correctly displayed
                if ($scope.local.cmOptions[propKey]) {
                    let currentCode = $scope.local.cmOptions[propKey].code
                    for (const v of $scope.cmProperties[propKey].options ) {
                        if (v.code == currentCode) {
                            $scope.local.cmOptions[propKey] = v
                            break
                        }
                    }
                }

            }



            function performReverseLookup(propKey,value) {
                //the function that performs the reverse lookup populating the
                //$scope.reverseLookup variable containing possible values for all properties
                //'before' the indicated propKey from the top down to that property.
                // This variable is then used by $scope.applyReverse()
                delete $scope.reverseLookup
                //the concept code is needed for the lookup.
                let elementCode = $scope.cmProperties[propKey].concept

                //locate the cm.element for that property / code
                let cmElement = {}
                for (const element of $scope.fullSelectedCM.group[0].element) {
                    if (element.code == elementCode.code) {     //this is the set of targets which could match this code
                        cmElement = element
                        break
                    }
                }

                let result

                if (cmElement.target) {
                    //found the CM element to check

                    //create the values object with all values 'before' this one
                    let propKeyToExamine = propKey

                    while (propKeyToExamine) {
                        let hashValues = getHashValues(propKeyToExamine)

                        $scope.log.push({msg:`Performing reverse lookup from ${propKeyToExamine} value ${value.code}`,
                            obj:hashValues,objTitle:"Values passed to reverse engine"})

                        let result = cmSvc.reverseRulesEngine(cmElement,value, $scope.hashExpandedVs,hashValues)
                        if (result.targets.length == 0) {
                            //look at the previous propkey
                            propKeyToExamine = $scope.cmProperties[propKeyToExamine].previous

                            $scope.log.push({msg:`No targets found. Examining ${propKeyToExamine}`})

                        } else {
                            propKeyToExamine = null
                            $scope.reverseLookup = result
                            $scope.log.push({msg:`Performed reverse lookup from ${propKey} value ${value.code}`,
                                obj:$scope.reverseLookup,objTitle:"Reverse engine response"})
                        }
                    }



                    function getHashValues(propKey) {
                        let hash = {}
                        let propKeyToGet = $scope.cmProperties[propKey].previous
                        while (propKeyToGet) {
                            hash[propKeyToGet] = $scope.local.cmOptions[propKeyToGet]
                            propKeyToGet = $scope.cmProperties[propKeyToGet].previous
                        }
                        return hash
                    }

                }

            }



            $scope.applyReverse = function () {
                //apply the information from the reverse lookup to all the properties prior to this one. Algorithm to apply from top down (excl. gender):
                //if the result is empty, then apply the options from the reverse object {targets:,element:,hashProperty, sourceConcept:}
                //      hashProperty is list of possible concepts for a property keyed by property
                //If there is already a value, then see if that value is in the property[propertyname].
                //      if it is, then leave it alone
                //      if not, then clear that value
                let propertyCode = $scope.reverseLookup.element.code    //the snomed code for this property (it's held in the element, the property name is defined above)

                let canApply = true //set false when we're past the current property - ie only look at the previous properties
                Object.keys($scope.cmProperties).forEach(function (propName) {  //assume this is ordered...


                    //are we past the property that had the reverse lookup yet?
                    let cmProperty = $scope.cmProperties[propName]
                    if (cmProperty.concept.code == propertyCode) {
                        canApply = false        //turn off the application process. properties after this one will not have their options set
                    }


                    if (canApply) {
                        //set false when we're past the current property and stop setting the value
                        //cmProperties[propname].options is the list of options

                        $scope.log.push({msg:`Rev: check ${propName} `})

                        let arNewOptions = $scope.reverseLookup.hashProperty[propName]       //an array of possible concepts from the reverse engine



                        if (arNewOptions) {
                            //console.log(propName,arNewOptions.length)
                            //there are options for this element fromthe reverse lookup




                            if (arNewOptions.length == 1) {
                                //if there's only 1 value, then set it
                                $scope.log.push({msg:`Setting single value for ${propName}`,obj:arNewOptions[0],objTitle:"Value set"})
                                cmProperty.singleConcept = arNewOptions[0]
                                cmProperty.options.length = 0
                                delete cmProperty.noMatches

                                $scope.local.cmOptions[propName] = arNewOptions[0]      //set the value
                            } else {

                                //create a new list which is the intersection of the list of the reverse
                                //and the current options in the property (from forward)
                                let newList = []

                                let currentList = cmProperty.options   //current options - presumably from last forwar

                                for (let concept of arNewOptions)  {
                                    //is it in the existing list
                                    let ar = currentList.filter(concept1 => concept1.code == concept.code )
                                    //they are in both....
                                    if (ar.length > 0) {
                                        //yes! we can add it...
                                        newList.push(concept)
                                    }
                                }

                                //assign the new list to the property options
                                $scope.cmProperties[propName].options = newList

                                //If there's a value, then make sure it is in the new list
                                //otherwise remove it
                                if ($scope.local.cmOptions[propName]) {
                                    let concept = $scope.local.cmOptions[propName]
                                    let ar = newList.filter(concept1 => concept1.code == concept.code )
                                    if (ar.length == 0) {
                                        //nope - the existing value is not in th enew list
                                        delete $scope.local.cmOptions[propName]
                                    }
                                }

                                $scope.log.push({msg:`Setting options for ${propName}`,obj:arNewOptions,objTitle:"Options"})
                                cmProperty.options = arNewOptions   //set the list of possible concepts to those from the reverse lokup
                                delete cmProperty.singleConcept



                                //Check that any current value is still in the list of options ($scope.cmProperties[propName].options)
                                checkCurrentValue(propName,arNewOptions)

                                /*
                                if (! $scope.local.cmOptions[propName]) {
                                    $scope.log.push({msg:`No existing data, setting options`,obj:arNewOptions})
                                    $scope.local.cmOptions[propName] = cmProperty.options[0]
                                } else {
                                    //see if the current value is in the set of concepts.
                                    //If it is then all good - otherwise set it to the first
                                    let currentValue = $scope.local.cmOptions[propName]
                                    let ar = $scope.cmProperties[propName].options.filter(concept => concept.code == currentValue.code )
                                    if (ar.length == 0) {
                                        $scope.log.push({msg:`Existing value not in set. Removing.`,obj:currentValue})
                                        //there is a current value, and it's not in the set of options. clear it
                                        delete $scope.local.cmOptions[propName]
                                    }
                                }
                                */


                            }

                        } else {
                            //if there are no options from the reverse lookup to apply, then delete any existing value
                            //that might be there, and set the .noMatches flag on cmProperties (? todo couldn't we just look at the length of options)
                            if ($scope.default.mode !== 'manual') {
                                $scope.log.push({msg:`There were no options from the reverse lookup. Clearing value.`})
                                cmProperty.options = []
                                cmProperty.noMatches = true
                                delete cmProperty.singleConcept
                                $scope.local.cmOptions[propName] = null
                            }



                        }
                    }
                })

            }


            //checks that ant current value for the property is in the options ($scope.cmProperties[propName].options)
            //if not, then set it to the first value
            //$scope.local.cmOptions - current value
            //$scope.cmProperties has possible values
            // $scope.cmProperties[propName].options must have been set first
            function checkCurrentValue(propName) {
                if (! $scope.local.cmOptions[propName]) {
                    //$scope.log.push({msg:`No existing value, setting to first`,obj:$scope.cmProperties[propName],objTitle:"All options"})
                    $scope.log.push({msg:`No existing value, not setting anything`,obj:$scope.cmProperties[propName],objTitle:"All options"})
                    //$scope.local.cmOptions[propName] = $scope.cmProperties[propName].options[0]


                } else {
                    //see if the current value is in the set of concepts.
                    //If it is then all good - otherwise set it to the first
                    let currentValue = $scope.local.cmOptions[propName]
                    let ar = $scope.cmProperties[propName].options.filter(concept => concept.code == currentValue.code )
                    if (ar.length == 0) {
                        $scope.log.push({msg:`Existing value not in set. Removing.`,obj:currentValue,objTitle:"Value being removed"})
                        //there is a current value, and it's not in the set of options. clear it
                        delete $scope.local.cmOptions[propName]
                    }
                }
            }

            $scope.selectManualOverride = function (m) {
                //console.log(m)
                if (! m) {
                    $scope.default.mode = 'manual'
                    //about to be checked
                    $scope.changeMode('manual')

                } else {
                    $scope.default.mode = 'directed'
                    $scope.changeMode('directed')
                }

            }

            //mode can either be directed or manual.
            //directed follows the ConceptMap
            //manual just shows them all

            $scope.changeMode = function (mode) {

                if (mode == 'directed') {
                    $scope.resetUI()
                }

                if (mode == 'manual') {
                    //set all the options to the maximal set

                    //set the list oo options for all properties
                    for (const key of Object.keys($scope.cmProperties)) {

                        //let fullVS = $scope.cmProperties[key].fullVS

                        let cmProperty = $scope.cmProperties[key]
                        if (cmProperty.fullVS) {

                            let fullVSName = `${vsPrefix}${cmProperty.fullVS}`

                            cmProperty.options = $scope.hashExpandedVs[fullVSName]

                            if (cmProperty.options && cmProperty.options.length > 0) {
                                //set  the value to the first element in the VS
                                //clear the value
                                let currentConcept = $scope.local.cmOptions[key]
                                if (currentConcept) {
                                    for (const c of cmProperty.options) {
                                        if (c.code == currentConcept.code){
                                            $scope.local.cmOptions[key] = c
                                            break
                                        }
                                    }

                                }


                                //delete $scope.local.cmOptions[key]
                                //$scope.local.cmOptions[key] = cmProperty.options[0]
                            }

                        }



                    }



                }
            }

            $scope.setDefaultService = function (concept) {
//alert('change')
                let serviceCode = $scope.cmProperties['cancer-stream'].concept.code

                for (const element of $scope.fullSelectedCM.group[0].element) {
                    if (element.code == serviceCode) {     //this is the set of targets which could match this code

                        let hash = {'cancer-service':concept}
                        let vo = cmSvc.rulesEngine(hash,element,$scope.hashExpandedVs)
                        console.log(vo)

                        $scope.input.allStreams = $scope.hashExpandedVs[vo.lstVS[0]]

                        $scope.resetUI()

                        break
                    }
                }


            }




            //reset all the inputs for the UI
            $scope.resetUI = function () {
                delete $scope.lstMatchingConceptsForUI
                delete $scope.uiMatchingVS
                delete $scope.uiHashValues
                delete $scope.reverseLookup
                //delete $scope.appliedFromReverse        //if true, then the reverse stuff was applied to previous properties
                $scope.local.cmOptions = {}     //the data entered

                $scope.default.mode = 'directed'    //uses the conceptmap

                $scope.log = []

                setup()         //sets the defaulvalues


                let defaultServiceSelected = false
                if ($scope.default.service && $scope.default.service.code) {
                    //$scope.cmProperties['cancer-service'].options = $scope.input.allService
                    $scope.local.cmOptions['cancer-service'] = $scope.default.service
                    defaultServiceSelected = true
                   $scope.uiValueSelected('cancer-service',$scope.local.cmOptions['cancer-service'])
                }




/*

                //if there's a default stream, then there must be a default service
                if ($scope.default.stream && $scope.default.stream.code) {
                    $scope.local.cmOptions['cancer-stream'] = $scope.default.stream

                    $scope.cmProperties['cancer-stream'].options = $scope.input.allStreams

                    //if there's a default stream, then populate from the stream
                    $scope.uiValueSelected('cancer-stream',$scope.local.cmOptions['cancer-stream'])
                } else {
                    //if there's no default stream, then populate from the service
                    if (defaultServiceSelected) {
                        $scope.uiValueSelected('cancer-service',$scope.local.cmOptions['cancer-service'])
                    }

                }


*/


            }



            //------------- end of main form UI functions

            $scope.selectCMItem = function (item,expand) {
                $scope.selectedCM = item.cm
                delete $scope.fullSelectedCM
                delete $scope.resultParameters
                delete $scope.resultParametersList
                delete $scope.translateParameters
                delete $scope.doProperties
                delete $scope.input.cmOptions
                delete $scope.cmSources
                delete $scope.myResult
                delete $scope.translateError
                delete $scope.expandedCMVS

                $scope.loadingCM = true

                if ($scope.input.loadComplete) {
                    expand = true
                }

                querySvc.getOneConceptMap(item.cm.url,expand).then(
                    function (ar) {
                        $scope.fullSelectedCM = ar[0]       //todo what of there's > 1

                        //add the operator to the DependsOn element from the extension (makes UI processing easier
                        let lstVsUrl = []   //list of all ValueSets that are used by 'in-vs' rules
                        //add the VS with all topography. used for the primary-site-laterality
                        lstVsUrl.push('https://nzhts.digital.health.nz/fhir/ValueSet/canshare-topography')
                        lstVsUrl.push('https://nzhts.digital.health.nz/fhir/ValueSet/canshare-cancer-service')


                        $scope.fullSelectedCM.group.forEach(function (group) {
                            group.element.forEach(function (element) {
                                element.target.forEach(function (target) {

                                    if (target.code && target.code.startsWith('http')) {
                                        lstVsUrl.push(target.code)
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
                                                            if (lstVsUrl.indexOf(dep.value) == -1) {
                                                                lstVsUrl.push(dep.value)
                                                            }

                                                        }

                                                    }
                                                })
                                            }

                                        })
                                    }


                                })
                            })

                        })

                        //expand all the valuesets
                        if (lstVsUrl.length > 0) {
                            $scope.showWaiting = true
                            cmSvc.getVSContentsHash(lstVsUrl).then(
                                function (data) {
                                    console.log('vs size',utilsSvc.getSizeOfObject(data)/1024 )

                                    $scope.$broadcast('hashExpandedVs',data)    //the list is processed by cmCtrl
                                },
                                function (err) {
                                    alert(err)
                                }
                            ).finally(function () {
                                $scope.showWaiting = false
                            })
                        }



                        //make the download link
                        // $scope.downloadLinkMap = window.URL.createObjectURL(new Blob([angular.toJson($scope.fullSelectedCM,true) ],{type:"application/json"}))
                        // $scope.downloadLinkMapName = `ConceptMap-${$scope.fullSelectedCM.id}.json`

                        let treeData = querySvc.makeTree($scope.fullSelectedCM,$scope.cmProperties)
                        showCmTree(treeData)


                        //now get the set of 'dependsOn' properties (if any)
                        let vo = querySvc.getCMProperties($scope.fullSelectedCM)
                        $scope.doProperties = vo.hashProperties // querySvc.getCMProperties($scope.fullSelectedCM)
                        $scope.cmSources = vo.arSources
                        $scope.input.selectedCmSource = $scope.cmSources[0]

                        //actually, we need to set the doProperties for this particular source
                        let vo1 = querySvc.getCMProperties($scope.fullSelectedCM,$scope.input.selectedCmSource.code)
                        $scope.doProperties = vo1.hashProperties //

                        //decide whether to show 'canshare' tab
                        //$scope.showTranslate = Object.keys($scope.doProperties).length > 0

                    }, function (err) {

                    }
                ).finally(function () {
                    $scope.loadingCM = false
                })

            }


            $scope.showTarget = function (target) {
                if ($scope.selectedTarget && target.code == $scope.selectedTarget.code) {
                    delete $scope.selectedTarget
                } else {
                    $scope.selectedTarget = target
                }

            }

            $scope.selectTarget = function (target) {
                $scope.selectedTarget = target
            }


            $scope.viewVS = function (url) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
                        }, refsetId : function () {
                            return null
                        }
                    }

                })
            }

            //expand a ValueSet
            $scope.cmExpandVS = function (url) {
                delete $scope.cmExpandedVS
                delete $scope.selectedTarget
                delete $scope.lstMatchingConcepts
                delete $scope.matchingVS


                let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=en-x-sctlang-23162100-0210105`
                console.log(qry)
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.cmExpandedVS = data.data


                        if ($scope.cmExpandedVS.expansion && $scope.cmExpandedVS.expansion.contains) {

                            $scope.cmExpandedVS.expansion.contains.sort(function(a,b) {
                                if (a.display > b.display) {
                                    return 1
                                } else {
                                    return -1
                                }
                            })

                        }




                    }, function (err) {

                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
            }

            function expandVDEP(url) {
                let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=${nzDisplayLanguage}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.expandedVS = data.data
                    }, function (err) {

                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
            }

            function showCmTree(treeData) {
                $('#cmTree').jstree('destroy');

                let x = $('#cmTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    if (data.node) {
                        $scope.selectedCmTreeTarget = data.node.data;
                        console.log(data.node)
                        delete $scope.expandedCMVS
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes
                    $scope.$digest();
                });

            }

            function setup() {
                $scope.local.cmOptions = {}
                //these are the properties
                $scope.cmProperties = {}

                $scope.cmProperties['patient-sex'] = {concept: {code:"184100006"},
                    next:'cancer-service',options:[]}

                $scope.cmProperties['cancer-service'] = {concept: {code:"299801000210106"},
                    next:'cancer-stream',options:[],fullVS:'canshare-cancer-service'}

                $scope.cmProperties['cancer-stream'] = {concept:{code:"299811000210108",display:"Cancer Stream",system:snomed},
                    next:'cancer-substream',previous:'cancer-service', options : [],fullVS:'canshare-cancer-stream'}

                $scope.cmProperties['cancer-substream'] = {concept: {code:"299821000210103"},
                    next:'cancer-type',previous:'cancer-stream',options:[],fullVS:'canshare-cancer-substream'}

                $scope.cmProperties['cancer-type'] = {concept: {code:"299831000210101"},
                    next:'primary-site',previous:'cancer-substream',options:[],fullVS:'canshare-cancer-type'}

                $scope.cmProperties['primary-site'] = {concept: {code:"399687005"},
                    next:'primary-site-laterality',previous:'cancer-type',options:[],fullVS:'canshare-primary-topography'}

                $scope.cmProperties['primary-site-laterality'] = {concept: {code:"297561000210100"},
                    next:'histologic-type-primary',previous:'primary-site',options:[],fullVS:'canshare-laterality'}

                $scope.cmProperties['histologic-type-primary'] = {concept: {code:"512001000004108"},options:[],fullVS:'canshare-who-histology',
                    previous:'primary-site-laterality'}

                $scope.cmProperties['patient-sex'].options.push({code:"U",display:"Unknown"})
                $scope.cmProperties['patient-sex'].options.push({code:"O",display:"Other"})
                $scope.cmProperties['patient-sex'].options.push({code:"F",display:"Female"})
                $scope.cmProperties['patient-sex'].options.push({code:"M",display:"Male"})



                //get the list of services from the ConceptMap
                let serviceUrl = "https://nzhts.digital.health.nz/fhir/ValueSet/canshare-cancer-service"
                let serviceConcepts = $scope.hashExpandedVs[serviceUrl]


                $scope.input.allService = [{display:"No default"}]    //for default

                if (serviceConcepts) {
                    for (const concept of serviceConcepts) {
                        $scope.cmProperties['cancer-service'].options.push(concept)
                        $scope.input.allService.push(concept)
                    }
                } else {
                    alert(`The service ValueSet ${serviceUrl} was not found`)
                }

/*
                //cancer service options are fixed - todo get from CM
                $scope.cmProperties['cancer-service'].options.push({code:"394803006",display:"Clinical haematology"})
                $scope.cmProperties['cancer-service'].options.push({code:"394593009",display:"Medical oncology"})
                $scope.cmProperties['cancer-service'].options.push({code:"418002000",display:"Paediatric oncology"})
                $scope.cmProperties['cancer-service'].options.push({code:"419815003",display:"Radiation oncology"})
                $scope.cmProperties['cancer-service'].options.push({code:"0",display:"No service"})
*/

                let treeData = querySvc.makeTree($scope.fullSelectedCM,$scope.cmProperties)
                showCmTree(treeData)

                //stuff for the histology UI
                $scope.histology = $scope.hashExpandedVs['https://nzhts.digital.health.nz/fhir/ValueSet/canshare-who-histology']

            }

            //when a concept is selected from the histology typeahead in the histology UI
            $scope.histoSelected = function (concept) {

                performReverseLookup('histologic-type-primary',concept)
                console.log($scope.reverseLookup)

                //populate the data from reverse todo ?move to seperate fuction
                for (const prop of Object.keys($scope.reverseLookup.hashProperty)) {

                    $scope.cmProperties[prop].options = $scope.reverseLookup.hashProperty[prop]

                    //set the default values is between 1 and 3 (will be rendered as radios in the UI
                    if ($scope.cmProperties[prop].options && $scope.cmProperties[prop].options.length < 4) {
                        $scope.local.cmOptions[prop] = $scope.cmProperties[prop].options[0].code



                    }

                    //$scope.local.cmOptions[prop] = $scope.reverseLookup.hashProperty[prop]
                }

                console.log($scope.cmProperties)



            }

            $scope.getFirstValueDEP = function (lst) {
                if (lst && lst.length > 0) {
                    return lst[0].code
                }

            }

            $scope.showConcept = function(c) {
                return `${c.display} (${c.code})`
            }

            //get all the concepts for a single property - this is applying the rules engine...
            //called from the Rules tab
            $scope.getOptionsOnePropertyDEP = function() {
                //console.log($scope.local.cm.property)
                delete $scope.lstMatchingConcepts
                delete $scope.cmExpandedVS      //so it's not in the display area
                delete $scope.displayMatchNumber
                //call the rules engine to determine the possible concepts. The engine needs:

                //  the list of user selected values for all properties so far  - local.cm.property
                //  the property that needs the list - input.cmProperty & $scope.selectedElement

                //

                //rules engine takes:
                //
                let vo = cmSvc.rulesEngine($scope.local.cm.property,
                    $scope.selectedElement,$scope.hashExpandedVs)

                $scope.matchingVS = vo.lstVS
                $scope.matchedRules = vo.lstMatches

                //look uo the matched elements (to display in the UI as well as the table)
                $scope.displayMatchNumber = "Match: "
                $scope.selectedElement.target.forEach(function (target) {
                    if (target.matched) {
                        $scope.displayMatchNumber += target.comment + " "
                    }
                })
                if ( $scope.displayMatchNumber == "Match: ") {
                    $scope.displayMatchNumber = 'No matching targets'
                }

                let qry = `/nzhts/expandMultipleVs`
                $http.post(qry,vo.lstVS).then(
                    function (data) {
                        console.log(data)
                        $scope.lstMatchingConcepts = data.data
                    }, function (err) {
                        console.log(err)
                    }
                )

            }

            //clear the value for a specific property
            $scope.resetValue = function (k) {
                delete $scope.local.cm.property[k]
            }

            $scope.resetUIDataDEP = function () {
                delete $scope.displayMatchNumber
                delete $scope.input.cmProperty
                delete $scope.cmExpandedVS
                delete $scope.matchingVS
                setup()
                delete $scope.selectedElement
                $scope.local.cm.property = {}
                delete $scope.reverseLookup



            }

            //construct a list of all the potential targets for a given property
            //invoked when the property to be populated is selected
            $scope.makeListOfTargetsDEP = function (key) {
                if (! key) {return}
                delete $scope.selectedElement
                delete $scope.selectedTarget
                delete $scope.cmExpandedVS
                delete $scope.displayMatchNumber
                let concept = $scope.cmProperties[key].concept
                $scope.hashProperties = {} //a hash of all properties in all dependsOn and all their possible values

                for (const element of $scope.fullSelectedCM.group[0].element) {
                    if (element.code == concept.code) {     //this is the set of targets which could match this code
                        $scope.selectedElement = element

                        //now create the list of all properties referenced in all the dependsOn elements..
                        if (element.target) {

                            element.target.forEach(function (target) {
                                if (target.dependsOn) {
                                    target.dependsOn.forEach(function(don) {
                                        let property = don.property   //this is the 'determinant'
                                        let canAdd = true
                                        $scope.hashProperties[property] = $scope.hashProperties[property] || []
                                        if (don['x-operator'] == 'in-vs') {
                                            //this is actually a reference to a valueset. the don will match if the supplied value
                                            // of the property is in the valueset. So we need to add the contents of the VS to the
                                            // set of possible values
                                            let options = $scope.hashExpandedVs[don.value]
                                            console.log(options)
                                            options.forEach(function (concept) {
                                                let ar = $scope.hashProperties[property].filter(c =>c.code == concept.code)
                                                if (ar.length == 0) {
                                                    $scope.hashProperties[property].push(concept)
                                                }
                                            })
                                            
                                            canAdd = false  //just to stop the value being added .
                                        } else {
                                            let v = don.value //the value is actually a code
                                            let ar = $scope.hashProperties[property].filter(c =>c.code == v)
                                            if (ar.length == 0) {
                                                $scope.hashProperties[property].push({code:v,display:don.display})
                                            }
                                        }



                                    })
                                }

                            })


                        }


                        //special handling for primary-site-laterality. The primary site is all sites
                        //return the set of all codes
                        if (key == 'primary-site-laterality') {
                            $scope.hashProperties['primary-site'] = []     //empty the list assembled from dependsOn
                            $scope.hashExpandedVs['https://nzhts.digital.health.nz/fhir/ValueSet/canshare-topography'].forEach(function (concept) {
                                $scope.hashProperties['primary-site'].push(concept)
                            })

                        }




                        console.log(element)
                        console.log($scope.hashProperties)

                        Object.keys($scope.hashProperties).forEach(function (key) {
                            //now sort the hash contents
                            $scope.hashProperties[key].sort(function (a,b) {
                                if (a.display > b.display) {
                                    return 1
                                } else {
                                    return -1
                                }

                            })
                        })

                        break
                    }
                }
            }


            //locate all values for other properties which could result in this value
            //value is a concept

            //create an array of params representing the selected value of all properties
            function makeParams() {
                let params = []
                for (const key of Object.keys($scope.cmProperties)) {

                    let v = $scope.local.cmOptions[key]
                    console.log(key,v)
                    if (v) {

                        let item = {}
                        item.property = key
                        item.value = v
                        //myParams.push(item)

                        params.push(item)
                    }

                }
                return params

            }

            function makeHashParams() {
                let params = {}
                for (const key of Object.keys($scope.cmProperties)) {

                    let v = $scope.local.cmOptions[key]
                    console.log(key,v)
                    if (v) {
                        params[key] = v

                    }

                }
                return params

            }


            $scope.lookupByRowNumber = function (rowNumber) {
                $scope.singleTargetByRow = $scope.targetByRow[rowNumber]
            }

            //---------  deprecated functions here....

            //generate the translate query from the canshare lookup tab
            function makeTranslateQueryDEP(conceptWeWant,cmUrl)  {

                conceptWeWant.system = conceptWeWant.system || "http://snomed.info/sct"

                let myParams = []    //an array of simplified parameters for my parser

                let translateParameters = {resourceType:"Parameters", parameter:[]}
                //the conceptmap url
                translateParameters.parameter.push({name:"url",valueUri: cmUrl })

                //the conceptWeWant
                translateParameters.parameter.push({name:"coding",valueCoding:conceptWeWant})

                //add the dependencies
                if ($scope.local.cmOptions) {
                    Object.keys($scope.local.cmOptions).forEach(function (key) {
                        let p = $scope.local.cmOptions[key]
                        p.system = snomed
//console.log(p)
                        let depParam1 = {name:"dependency",part :[]}
                        translateParameters.parameter.push(depParam1)
                        let part1 = {"name":"element","valueUri":key}
                        depParam1.part.push(part1)
                        //let ccValue = {coding:[{system:snomed,code:$scope.input.dep1}]}
                        let ccValue = {coding:[p]}
                        let part2 = {"name":"concept","valueCodeableConcept":ccValue}
                        depParam1.part.push(part2)

                        //my parameters
                        let item = {}
                        item.property = key
                        item.value = p
                        myParams.push(item)


                    })
                }


                $scope.translateParameters = translateParameters

                return {parameters:translateParameters,myParams : myParams}

            }

            function performTranslateDEP(parameters) {
                let deferred = $q.defer()
                //let parameters = vo.parameters  //the parameters resource
                $http.post('nzhts',parameters).then(
                    function (data) {
                        let resultParameters = data.data
                        let resultParametersList = []
                        //make a list of matches from the parameters
                        if (resultParameters.parameter){
                            resultParameters.parameter.forEach(function (param) {
                                if (param.name == 'match' && param.part) {
                                    param.part.forEach(function (part) {
                                        if (part.name == 'concept') {
                                            resultParametersList.push(part.valueCoding)
                                        }
                                    })
                                }

                            })
                        }

                        deferred.resolve(resultParametersList)


                        console.log(data)
                    },function (err) {

                        deferred.reject(err.data)

                    }
                )

                return deferred.promise
            }




            $scope.editRuleDEP = function (target) {

                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    size : 'lg',
                    templateUrl: 'modalTemplates/editRule.html',

                    controller: function ($scope,target) {
                        $scope.input = {}
                        $scope.target = target

                        $scope.properties = []
                        $scope.properties.push("cancer-service")
                        $scope.properties.push("cancer-stream")
                        $scope.properties.push("cancer-substream")
                        $scope.properties.push("cancer-type")
                        $scope.properties.push("primary-site-laterality")
                        $scope.properties.push("histologic-type-primary")

                        if (target) {
                            $scope.input.url = target.code
                            $scope.input.display = target.display
                            $scope.input.dependsOn = target.dependsOn
                        } else {
                            $scope.input.dependsOn = []
                        }

                        $scope.addTrigger = function () {
                            let trigger = {property:$scope.input.newTriggerProperty}
                            trigger.display = $scope.input.newTriggerDisplay
                            trigger.value = $scope.input.newTriggerValue
                            $scope.input.dependsOn.push(trigger)
                            delete $scope.input.newTriggerProperty
                            delete $scope.input.newTriggerDisplay
                            delete $scope.input.newTriggerValue
                        }

                    },
                    resolve: {
                        target: function () {
                            return target
                        }
                    }

                }).result.then(function (vo) {

                })

            }


            //called when a property option in the UI changes
            $scope.cmLookupDEP = function (inputProp,v,propKey) {
                //propKey is the property name = eg cancer-service



                //console.log(inputProp,v,propKey)
                //determine the set of properties that are inpts into this one.
                //these are the properties 'before' the one we're looking at
                //eg if we're after the property 'cancer-stream' then we're only interested in patient-sex and cancer-service

                // $scope.local.uiValues  has the values selected thus far. a hash keyed on property. content is Coding

                for (const prop of Object.keys($scope.cmProperties)) {
                    console.log(prop)
                    if (prop == propKey) {
                        break
                    }
                }





                return;

                //just set the next one
                let nextProperty = $scope.cmProperties[inputProp.next]

                //

                let params = makeHashParams()   //a hash of all data thus far ?todo only the preceeding ones

                //find the cm element that corresponds to the option being populated - it has the potential targets


                //parameters:
                //  property - the property name for which concepts are sought - eg cancer-stream
                //  hashInput - a hash keyed by property name that has all the properties where the user has selected a value
                //  element -  has all the possible targets for that property (each property has one element in the CM)


                //let vo = cmSvc.getOptionsOneProperty($scope.input.cmProperty,$scope.local.cm.property,$scope.selectedElement)

                let vo = cmSvc.rulesEngine(params,$scope.selectedElement)

                console.log(vo)


                return


                //get the set of options for each of the properties based on the current values of all properties
                let currentValues = makeParams()

                for (const key of Object.keys($scope.cmProperties)) {
                    if (key !== 'cancer-service' && key !== propKey) {

                        let prop = $scope.cmProperties[key]

                        let lookingForProperty = prop.concept
                        let results = querySvc.processMyTranslate(lookingForProperty,currentValues,$scope.fullSelectedCM)
                        console.log(key,lookingForProperty,results)


                        $scope.cmProperties[key].options = results
                    }

                }



            }



        })