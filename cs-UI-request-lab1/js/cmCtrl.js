angular.module("pocApp")
    .controller('cmCtrl',
        function ($scope,$http,$q,querySvc,cmSvc,$uibModal,utilsSvc,$timeout,updateVSSvc) {

            $scope.local = {cmOptions : {},cm:{property:{}}}
            $scope.default = {}
            $scope.cmSvc = cmSvc

            let nzDisplayLanguage = "en-x-sctlang-23162100-0210105"

            //the mode of operation of the UI - manual or directed (ie the engines are invoked)
            $scope.default.mode = 'directed'

            $scope.cmProperties = {}

            $scope.local.uiValues = {}          //a hash of values selected in the UI
            $scope.log = []

            let snomed = "http://snomed.info/sct"
            let vsPrefix = "https://nzhts.digital.health.nz/fhir/ValueSet/"
           // $scope.loadingCM = true

            function loadFromCache() {
                //functions to get ConceptMap & expanded ValueSet..
                //localforage is defined by the library script. uses indexedDb as the local storage in the browser...
                //https://localforage.github.io/localForage/#data-api-getitem
               // $scope.loadingCM = true

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

                        //set the CM dropdown
                        for (const id of $scope.allCM) {
                            if (id == $scope.fullSelectedCM.id) {
                                $scope.input.selectCMControl = id
                                break
                            }
                        }


                        console.log(`Size of ConceptMap: ${utilsSvc.getSizeOfObject($scope.fullSelectedCM)/1000} Kb`)
                        console.log(`Size of ValueSets : ${utilsSvc.getSizeOfObject($scope.hashExpandedVs)/1000} Kb`)

                        setup()

                    } else {
                        //retrieve cs & vs from the terminology server. when complete the function
                        //fires the hashExpandedVs event which is trapped below and will save in the cache.
                        console.log('cache empty. Retrieving from TS.')
                        alert("Need to build the terminology cache. This will take around 20 seconds, please wait.")
                        $scope.loadCM("canshare-select-valueset-map")
                        //$scope.selectCMItem({cm:{url:"http://canshare.co.nz/fhir/ConceptMap/canshare-select-valueset-map"}})
                    }



                }).catch(function(err) {
                    // This code runs if there were any errors
                    console.log(err);
                    alert(err.message)
                });
            }

            $http.get('/nzhts/ConceptMap/allVersions').then(
                function (data) {
                    $scope.allCM = []
                    data.data.entry.forEach(function (entry) {
                        $scope.allCM.push(entry.resource.id)
                    })

                    loadFromCache()

                }, function () {
                    alert("Unable to load ConceptMaps")
                }
            )

            $scope.loadSelected = function (id) {
                let msg = "This will re-load all the artifacts from the terminology server. It will take several seconds (10-20) to complete. Are you sure?"
                if (confirm(msg)) {
                    $scope.loadCM(id)
                }
            }


            //as the expansion is performed by a child controller, we use this event to get the hash
            $scope.$on('hashExpandedVs',function (event,data) {
                $scope.hashExpandedVs = data


                //save the conceptMap and VS in the db
                let vo = {cm:$scope.fullSelectedCM,vs:$scope.hashExpandedVs,when:new Date()}
                $scope.cacheDate = vo.when

                localforage.setItem('cmData', vo).then(function (value) {
                    // Do other things once the value has been saved.
                    console.log(value);
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

            //$scope.local.cmPropertyValue[key] - the actual value (a concept) for the property
            
            $scope.clearProperty = function (propKey) {
                //todo should just be empty

                alert('disabled')

                return
                $scope.log = []
                $scope.log.push({msg:`Clearing value of ${propKey}`})

                delete $scope.local.cmPropertyValue[propKey]
                delete $scope.cmProperties[propKey].singleConcept


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
                    $scope.local.cmPropertyValue[propKey] = concept

                    $scope.uiValueSelected(propKey,concept)
                })


            }

            $scope.setMaximalOptions = function (propName) {


                let currentValue = $scope.local.cmPropertyValue[propName]

                let vsUrl = `${vsPrefix}${$scope.cmProperties[propName].fullVS}`
                //console.log(vsUrl,$scope.hashExpandedVs[vsUrl])
                let options = $scope.hashExpandedVs[vsUrl]
                $scope.cmProperties[propName].options = angular.copy(options)

                if (currentValue) {
                    for (const concept of $scope.cmProperties[propName].options) {
                        if (concept.code == currentValue.code) {
                            $scope.local.cmPropertyValue[propName] = concept
                            break
                        }
                    }
                }
            }

            //handler when a value is selected
            $scope.uiValueSelected = function (propKey,value) {
                //called when a selection is made for a property in the UI
                // oct 4 - or when a default value is set in populateUIControl()
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

                //Changing laterality won't change any other values so don't bother with
                if (propKey == 'primary-site-laterality') {
                    $scope.log.push({msg:'Ignoring laterality forward and reverse checks'})
                    return
                }


                if (! value) {
                    //I think this is being triggered when a value is being updated after reverse lookup
                    //but in any case, if there is no value then don't do anything
                    $scope.log.push({msg:`uiValueSelected() called with no value. Property value ${propKey} deleted`})
                    delete $scope.local.cmPropertyValue[propKey]
                    return
                }

                //this is the reverse lookup stuff. ie, with the value seleced, are previous values
                //consistent with the rules
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
                            //if there is a value, then check to see if it is in local.cmPropertyValue[propName].
                            //if it is then leave it
                            //if not then clear the value (but not the options)
                            //(this supports the reverse lookup)

                            //cmProperties[key].options has the list of options
                            //local.cmPropertyValue[key] has the current value
                            //cmProperties[key].singleConcept has the value if there is only 1

                            if ($scope.local.cmPropertyValue[key]) {
                                $scope.log.push({msg:`Value already selected`,obj:$scope.local.cmPropertyValue[key],objTitle:"Current valie"})
                                //there is a selected value here - is it in the list of options
                                let currentValue = $scope.local.cmPropertyValue[key]
                                let ar = $scope.cmProperties[key].options.filter(concept => concept.code == currentValue.code )


                                if (ar.length == 0) {
                                    $scope.log.push({msg:`${key} value not in new list. Clearing.`,obj:$scope.cmProperties[key].options,objTitle:"Current options"})
                                    //the current value is not in the set of possible values. clear it
                                    //todo - this is different to the reverse lookup where we default the first one. ?which is correct
                                    delete $scope.local.cmPropertyValue[key]
                                    delete $scope.cmProperties[key].singleConcept
                                }
                            }


                        }
                        if (key == propKey) {
                            //ready to start checking values...
                            checkValue = true
                        }
                    })

                }



                //---------------- now can process the next property in the sequence
                //unless we only want to set this one


                let def = $scope.cmProperties[propKey]
                if (def && def.next) {
                    //next is the property after this one (defined in the initial setup)
                    //def.next is the next control in the order
                    $scope.log.push({msg:`Populate UI control for ${def.next}`})
                    $scope.populateUIControl(def.next)  //populate the UI with the set of possible values. Will check all following properties

                    //if the property that was selected (propKey) is the cancer type, then it may be possible
                    //to default the primary site.
                    if (propKey == 'cancer-type') {
                        getDefaultPrimarySite(value,function (value) {
                            if (value) {
                                //there was a single primary site which was set.
                                //we need to invoke the forward engine to set the laterality...
                                $scope.uiValueSelected  ('primary-site',value)



                                //new 12 jun
                               // $scope.$broadcast('dxChanged',{values:$scope.local.cmPropertyValue})



                            }

                        })

                    }

                }




                //so that the dropdowns work, make sure the value (local.cmPropertyValue) is from the list cmProperties[k].options
                //Otherwise angular doesn't set the dropdown correctly
                setDropDowns()
                
                $scope.$broadcast('dxChanged',{values:$scope.local.cmPropertyValue})


                function setDropDowns() {
                    Object.keys($scope.cmProperties).forEach(function (propName) {
                        if ($scope.local.cmPropertyValue[propName] && $scope.cmProperties[propName].options) {
                            let code = $scope.local.cmPropertyValue[propName].code
                            for (const c of $scope.cmProperties[propName].options) {
                                if (c.code == code) {
                                    $scope.local.cmPropertyValue[propName] = c
                                    break
                                }
                            }
                        }
                    })
                }

            }

            function getDefaultPrimarySite(concept,cb) {
                //alert(`check default primary site: ${concept.code}`)

                $scope.lookUpCache = $scope.lookUpCache || {}     //cache to improve performance
                /* the cache doesn't seem to work - the concept is not defaulting - not sure why


                if ($scope.lookUpCache[concept.code]) {
                    if ($scope.lookUpCache[concept.code] == "notfound") {
                        cb()
                    } else {
                        console.log($scope.lookUpCache[concept.code])
                        cb($scope.lookUpCache[concept.code])

                    }
                    return
                }

                 */

                $scope.log.push({msg:`check default primary site: ${concept.code}`})
                let siteCodes = []      //there can be multiple site codes for a given diagnosis
                let system = snomed // concept.system || snomed
                let code = concept.code //'93849006'// '93689003' //concept.code
                let findingSiteCode = 363698007  //the code for the finding site attribute

                ///CodeSystem/$lookup?system=http://snomed.info/sct&code=93689003&property=363698007
                let qry = `CodeSystem/$lookup?system=${system}&code=${code}&property=${findingSiteCode}`
                let encodedQry = encodeURIComponent(qry)
                //$scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        let parameters = data.data
                        if (parameters.parameter) {
                            for (const p of parameters.parameter) {

                                if (p.name == 'property' && p.part) {
                                    for (const part of p.part) {
                                        if (part.name == 'subproperty' && part.part) {
                                            for (const subpart of part.part) {
                                                if (subpart.name == 'value') {
                                                    //at last - a site code value!!
                                                    siteCodes.push(subpart.valueCode)
                                                }
                                            }

                                        }
                                    }

                                }
                            }
                        }


                        if (siteCodes.length == 0) {
                            $scope.log.push({msg:`No site codes found for this concept`})
                        } else {
                            let sum = "Codes found: "
                                siteCodes.forEach(function (code) {
                                sum += code + " "
                            })
                            $scope.log.push({msg:sum})


                            //look for the code in the list.
                            let foundConcept = null
                            for (const code of siteCodes) {
                                for (const concept of $scope.cmProperties['primary-site'].options) {
                                    if (concept.code == code) {
                                        $scope.local.cmPropertyValue['primary-site'] = concept
                                        foundConcept = concept
                                        break
                                    }
                                }
                            }



                            if (foundConcept) {
                                console.log(`${foundConcept.code} found`)
                                $scope.log.push({msg:`Code is in list, setting as default`})
                                $scope.lookUpCache[concept.code] = foundConcept
                                cb(foundConcept)
                            } else {
                                $scope.log.push({msg:`Code not found in list, ignoring`})
                                console.log(`${concept.code} not found`)
                                $scope.lookUpCache[concept.code] = "notfound"
                                cb()
                            }



                        }



                    }
                )
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
                    //would indicate an issue with the ConceptMap
                    $scope.log.push({msg:`An element in the Concept map for the code ${propertyCode} could not be located. This is an issue with the ConceptMap`})
                    return
                }

                $scope.log.push({msg:`Found cm element for ${propKey}`,obj:cmElement,objTitle:"CM element"})

                //a hash of all the data entered
                // now all of them - at one point was only those 'before' this element
                $scope.uiHashValues = {}
                for (const prop of Object.keys($scope.cmProperties)) {
                    if (prop == propKey) {
                        // 27-may - use all values break
                    }
                    //todo - this seems a duplication...
                    $scope.uiHashValues[prop] = $scope.local.cmPropertyValue[prop] //$scope.local.cmPropertyValue has the data entered thus far.
                }

                $scope.log.push({msg:`About to execute rules engine for ${propKey}`,obj:$scope.uiHashValues,objTitle:"Current property values"})

                //now, execute the rules engine to this element and set of codes
                //note that the values passed to this function are only those 'before' this one...
                let vo = cmSvc.rulesEngine($scope.uiHashValues,cmElement,$scope.hashExpandedVs)

                $scope.log.push({msg:`Executed rules engine for ${propKey}`,obj:vo,objTitle:"Engine response"})

                $scope.uiMatchingVS = vo.lstVS                //The valuesets from all rules that were matched (includes single concepts)
                //$scope.uiMmatchedRules = vo.lstMatches         //the actual targets that matched
                $scope.uiMatchingTargets = vo.lstMatchingTargets

                //Apply the result from the forward rules engine.
                //if it is a valueset then just set the possible values ($scope.cmProperties[propKey].options)
                //If the result is a single concept (does not start with http) then
                //  set the property value ($scope.local.cmPropertyValue[propKey]) and process the next property
                //  also set ($scope.cmProperties[propKey].singleConcept) so it displays in the UI
                //If the result returns no values then set $scope.cmProperties[propKey].noMatches and process the next property

                if ($scope.uiMatchingVS && $scope.uiMatchingVS.length > 0) {

                    $scope.log.push({msg:`${$scope.uiMatchingVS.length} valueset or concept returned`,obj:$scope.uiMatchingVS,objTitle:"ValueSet or concept"})

                    if ($scope.uiMatchingVS[0].indexOf('http') == -1) {
                        //this is a single concept (not a VS). We can get the display details from the first element of $scope.uiMatchingTargets

                        let target = $scope.uiMatchingTargets[0]
                        $scope.singleConcept = {code:target.code,display:target.display,system:target.system}

                        $scope.cmProperties[propKey].singleConcept = {code:target.code,display:target.display,system:target.system}

                        $scope.log.push({msg:`A single concept for ${propKey} was returned`,obj:$scope.uiMatchingVS[0],objTitle:"Concept"})

                        //set the value of the fixed element
                        //todo - there are multiple objects storing this value - need to be refactored

                        $scope.uiHashValues[propKey] = $scope.singleConcept
                        $scope.local.cmPropertyValue[propKey] = $scope.singleConcept

                        //if the singleConcept isn't in the list of options then it won't display
                        //??? why should this happen?
                        $scope.cmProperties[propKey].options = [$scope.singleConcept]


                        //Oct 4 as we've selected a value we need to perform the processing
                        //associated with selecting it.
                        $scope.uiValueSelected(propKey, $scope.singleConcept   )

                        //as there is only a single concept, which is not editable then move on to the next one

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

                        if ($scope.local.cmPropertyValue[propKey]) {
                            let concept = $scope.local.cmPropertyValue[propKey]
                            let ar = forwardList.filter(concept1 => concept1.code == concept.code )
                            if (ar.length == 0) {
                                //nope - the existing value is not in the new list
                                delete $scope.local.cmPropertyValue[propKey]
                            }
                        }

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
                if ($scope.local.cmPropertyValue[propKey]) {
                    let currentCode = $scope.local.cmPropertyValue[propKey].code
                    for (const v of $scope.cmProperties[propKey].options ) {
                        if (v.code == currentCode) {
                            $scope.local.cmPropertyValue[propKey] = v
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
                if (! $scope.cmProperties[propKey]) {
                    console.error(`There is no current value for ${propKey}`)
                    return
                }
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
                        //hashValues is current values of all properties before this one
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
                            hash[propKeyToGet] = $scope.local.cmPropertyValue[propKeyToGet]
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

                                $scope.local.cmPropertyValue[propName] = arNewOptions[0]      //set the value
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
                                //todo - Wed 7 May - is this segment redundant, given the checkCurrentValue() call below?

                                if (false && $scope.local.cmPropertyValue[propName]) {
                                    let concept = $scope.local.cmPropertyValue[propName]
                                    let ar = newList.filter(concept1 => concept1.code == concept.code )
                                    if (ar.length == 0) {
                                        //nope - the existing value is not in th enew list
                                        delete $scope.local.cmPropertyValue[propName]
                                    }
                                }

                                $scope.log.push({msg:`Setting options for ${propName}`,obj:arNewOptions,objTitle:"Options"})
                                cmProperty.options = arNewOptions   //set the list of possible concepts to those from the reverse lokup
                                delete cmProperty.singleConcept



                                //Check that any current value is still in the list of options ($scope.cmProperties[propName].options)

                               checkCurrentValue(propName,arNewOptions)

                                /*
                                if (! $scope.local.cmPropertyValue[propName]) {
                                    $scope.log.push({msg:`No existing data, setting options`,obj:arNewOptions})
                                    $scope.local.cmPropertyValue[propName] = cmProperty.options[0]
                                } else {
                                    //see if the current value is in the set of concepts.
                                    //If it is then all good - otherwise set it to the first
                                    let currentValue = $scope.local.cmPropertyValue[propName]
                                    let ar = $scope.cmProperties[propName].options.filter(concept => concept.code == currentValue.code )
                                    if (ar.length == 0) {
                                        $scope.log.push({msg:`Existing value not in set. Removing.`,obj:currentValue})
                                        //there is a current value, and it's not in the set of options. clear it
                                        delete $scope.local.cmPropertyValue[propName]
                                    }
                                }
                                */


                            }

                        } else {
                            //if there are no options from the reverse lookup to apply, then delete any existing value
                            //that might be there, and set the .noMatches flag on cmProperties (? todo couldn't we just look at the length of options)
                            if ($scope.default.mode !== 'manual') {

                                //laterality is a special case - don't update any value here.
                                if (propName !== 'primary-site-laterality') {
                                    $scope.log.push({msg:`There were no options from the reverse lookup. Clearing value.`})
                                    cmProperty.options = []
                                    cmProperty.noMatches = true
                                    delete cmProperty.singleConcept
                                    $scope.local.cmPropertyValue[propName] = null
                                } else {
                                    $scope.log.push({msg:`Not changing any value for laterality.`})
                                }

                            }
                            
                        }
                    }
                })

            }


            //checks that any current value for the property is in the options ($scope.cmProperties[propName].options)
            //if not, then set it to the first value
            //$scope.local.cmPropertyValue - current value
            //$scope.cmProperties has possible values
            // $scope.cmProperties[propName].options must have been set first
            function checkCurrentValue(propName) {
                if (! $scope.local.cmPropertyValue[propName]) {
                    //$scope.log.push({msg:`No existing value, setting to first`,obj:$scope.cmProperties[propName],objTitle:"All options"})
                    $scope.log.push({msg:`No existing value, not setting anything`,obj:$scope.cmProperties[propName],objTitle:"All options"})
                    //$scope.local.cmPropertyValue[propName] = $scope.cmProperties[propName].options[0]


                } else {
                    //see if the current value is in the set of concepts.
                    //If it is then all good - otherwise set it to the first
                    let currentValue = $scope.local.cmPropertyValue[propName]
                    let ar = $scope.cmProperties[propName].options.filter(concept => concept.code == currentValue.code )
                    if (ar.length == 0) {
                        $scope.log.push({msg:`Existing value not in set. Removing.`,obj:currentValue,objTitle:"Value being removed"})
                        //there is a current value, and it's not in the set of options. clear it
                        delete $scope.local.cmPropertyValue[propName]
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
                                let currentConcept = $scope.local.cmPropertyValue[key]
                                if (currentConcept) {
                                    for (const c of cmProperty.options) {
                                        if (c.code == currentConcept.code){
                                            $scope.local.cmPropertyValue[key] = c
                                            break
                                        }
                                    }

                                }


                                //delete $scope.local.cmPropertyValue[key]
                                //$scope.local.cmPropertyValue[key] = cmProperty.options[0]
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
                $scope.local.cmPropertyValue = {}     //the data entered

                $scope.default.mode = 'directed'    //uses the conceptmap

                $scope.log = []

                setup()         //sets the defaulvalues

                let defaultServiceSelected = false
                if ($scope.default.service && $scope.default.service.code) {
                    //$scope.cmProperties['cancer-service'].options = $scope.input.allService
                    $scope.local.cmPropertyValue['cancer-service'] = $scope.default.service
                    defaultServiceSelected = true
                   $scope.uiValueSelected('cancer-service',$scope.local.cmPropertyValue['cancer-service'])
                }

            }



            //------------- end of main form UI functions

            //retrieve a specific ConceptMap and save it in the
            $scope.loadCM = function (cmId) {

                delete $scope.fullSelectedCM

                delete $scope.doProperties
                delete $scope.input.cmOptions
                delete $scope.expandedCMVS
                delete $scope.expandErrors

                $scope.$parent.loadingCM = true

                //get the map
                querySvc.getOneConceptMap(cmId).then(
                    function (CM) {

                        $scope.fullSelectedCM = CM

                        //a hash of elemets from the CM by code.
                        $scope.hashElementsByCode = {}


                        //now retrieve all the ValueSets (effectively refresh the cache)
                        //add the operator to the DependsOn element from the extension (makes UI processing easier
                        let lstVsUrl = []   //list of all ValueSets that are used by 'in-vs' rules
                        //add the VS with all topography. used for the primary-site-laterality
                        lstVsUrl.push('https://nzhts.digital.health.nz/fhir/ValueSet/canshare-topography')
                        lstVsUrl.push('https://nzhts.digital.health.nz/fhir/ValueSet/canshare-cancer-service')


                        //these are ones I added dusinr satging testing. May be incomplete...
                        lstVsUrl.push('https://nzhts.digital.health.nz/fhir/ValueSet/canshare-sact-cancer-service')
                        lstVsUrl.push('canshare-who-sact-primary-histology')


                        //Add all the 'maximal valuesets' from the config
                        for (const key of Object.keys($scope.cmProperties)) {
                            let prop = $scope.cmProperties[key]
                            if (prop.fullVS) {
                                lstVsUrl.push(`https://nzhts.digital.health.nz/fhir/ValueSet/${prop.fullVS}`)
                            }
                        }



                        /* - wed 2 oct. to check.
                        //locate all the ValueSets referenced in the CM
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

                        */

                        //parse the CM to get all referenced VS. Update the lstVsUrl
                        cmSvc.getAllVSinCM($scope.fullSelectedCM,lstVsUrl)

                        //expand all the valuesets
                        if (lstVsUrl.length > 0) {


                            lstVsUrl.sort()
                            lstVsUrl.forEach(function (url) {
                                console.log('|' + url + '|  ' + url.length)
                                // console.log(url.match(/[^\x20-\x7E]/g))
                            })


                            $scope.showWaiting = true
                            cmSvc.getVSContentsHash(lstVsUrl).then(
                                function (data) {
                                    let hashExpanded = data.hashExpanded
                                    $scope.expandErrors = data.errors
                                    console.log('vs size',utilsSvc.getSizeOfObject(hashExpanded)/1024 )

                                    $scope.$broadcast('hashExpandedVs',hashExpanded)    //the list is processed by cmCtrl
                                },
                                function (err) {
                                    alert(err)
                                }
                            ).finally(function () {
                                $scope.$parent.loadingCM = false
                                $scope.showWaiting = false
                            })
                        }





                        let treeData = querySvc.makeTree($scope.fullSelectedCM,$scope.cmProperties)
                        showCmTree(treeData)

/* - I don't think these are used any more...
                        //now get the set of 'dependsOn' properties (if any)
                        let vo = querySvc.getCMProperties($scope.fullSelectedCM)
                        $scope.doProperties = vo.hashProperties // querySvc.getCMProperties($scope.fullSelectedCM)
                        $scope.cmSources = vo.arSources
                        $scope.input.selectedCmSource = $scope.cmSources[0]

                        //actually, we need to set the doProperties for this particular source
                        let vo1 = querySvc.getCMProperties($scope.fullSelectedCM,$scope.input.selectedCmSource.code)
                        $scope.doProperties = vo1.hashProperties //
*/
                        //decide whether to show 'canshare' tab
                        //$scope.showTranslate = Object.keys($scope.doProperties).length > 0

                    }, function (err) {

                    }
                ).finally(function () {
                   // $scope.loadingCM = false
                    //do this when the expand all VS is complete and the event fired
                })

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


            $scope.expandVSFromCM = function (code) {
                //when a VS is selected in a CM expansion...
                //This can either be a valueset url or a code

                let url
                if (code.indexOf('http') > -1) {
                    //this is a valueset url
                    url = code
                } else {
                    url = `http://snomed.info/sct?fhir_vs=refset/${code}`
                }

                $scope.input.showParams = false
                delete $scope.expandedCMVS
                //default to a canshare expansion
                let qry = `ValueSet/$expand?url=${url}&_summary=false&displayLanguage=${nzDisplayLanguage}`

                $scope.expandVSFromCMQuery = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.expandedCMVS = data.data
                    }, function (err) {
                        alert(`ValueSet: ${url} not found`)
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
                        //$scope.$digest();
                        //expandedCMVS
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
                $scope.local.cmPropertyValue = {}
                //these are the properties

                $http.get('/cmConfig').then(
                    function (data) {
                        let config = data.data

                        $scope.cmConfig = config //added so staging can access config
                        $scope.tnmLUT = config.tnmLUT   //lookup table for snomed codes for TNM\
                        cmSvc.setConfig(config)         //so cmService can manipulate it

                        //cmProperties will have only those entries that are in the diagnostic tab
                        $scope.cmProperties = {}
                        $scope.cmProperties = config.diagnosticProperties
                        $scope.stagingProperties = config.stagingProperties

                        $scope.$broadcast("cmConfigLoaded")


                        //a hash of code keyed on propertyKey. Used in conjunction with hashElements
                        //$scope.hashCodeByPropKey = {}



                        //get the list of services from the ConceptMap
                        let serviceUrl = "https://nzhts.digital.health.nz/fhir/ValueSet/canshare-sact-cancer-service"
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

                        let treeData = querySvc.makeTree($scope.fullSelectedCM,$scope.cmProperties)
                        showCmTree(treeData)

                      //  $scope.loadingCM = false    //will show the UI


                    },function (err) {
                        alert("Error getting ConceptMap config")
                    }
                )



            }


            $scope.showConcept = function(c) {
                return `${c.display} (${c.code})`
            }


            //clear the value for a specific property
            $scope.resetValue = function (k) {
                delete $scope.local.cm.property[k]
            }



            $scope.lookupByRowNumber = function (rowNumber) {
                $scope.singleTargetByRow = $scope.targetByRow[rowNumber]
            }


            $scope.viewConceptMap = function (property) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/cmViewer.html',
                    //backdrop: 'static',
                    size: 'xlg',
                    controller: 'cmViewerCtrl',

                    resolve: {
                        conceptMap: function () {
                            return $scope.fullSelectedCM
                        },
                        hashExpandedVs : function () {
                            return $scope.hashExpandedVs
                        }, selectedProperty : function () {
                            return property
                        }, data : function() {
                            return $scope.local.cmPropertyValue
                        }
                    }

                })
            }


            //====================  deprecated functions here....
            $scope.refreshCacheDEP = function () {
                let msg = "This will re-load all the artifacts from the terminology server. It will take several seconds (10-20) to complete. Are you sure?"
                if (confirm(msg)) {
                    //$scope.refreshingCache = true
                    //just need to re-read from the TS. Will populate forage cache
                    $scope.loadCM("http://canshare.co.nz/fhir/ConceptMap/canshare-select-valueset-map")
                    //$scope.selectCMItem({cm:{url:"http://canshare.co.nz/fhir/ConceptMap/canshare-select-valueset-map"}})
                }
            }


            //select the development version of the ConceptMap
            //could later generalize this to multiple CM
            $scope.selectDevDEP = function () {

                let url = "http://canshare.co.nz/fhir/ConceptMap/canshare-select-valueset-map-dev"
                //load the CM

                querySvc.getOneConceptMap("canshare-select-valueset-map-dev",true).then(
                    function (CM) {
                        //now retrieve all the ValueSets (effectively refresh the cache)


                        $scope.fullSelectedCM = CM //ar[0]       //todo what of there's > 1
                        console.log($scope.fullSelectedCM)



                        let lstVsUrl = []   //list of all ValueSets that are used by 'in-vs' rules

                        //parse the CM to get all referenced VS. Update the lstVsUrl
                        cmSvc.getAllVSinCM($scope.fullSelectedCM,lstVsUrl)


                        lstVsUrl.sort()
                        lstVsUrl.forEach(function (url) {
                            console.log('|' + url + '|  ' + url.length)
                            // console.log(url.match(/[^\x20-\x7E]/g))
                        })

                        let newVS = []  //this will be  a list of new ValueSets that need to be retrieved
                        if (lstVsUrl.length > 0) {
                            for (url of lstVsUrl) {
                                if (! $scope.hashExpandedVs[url]) {
                                    newVS.push(url)
                                }
                            }
                        }

                        console.log(newVS)

                        if (newVS.length > 0 ) {
                            //there are new ValueSets in the dev version that need to be retrieved and added to the cache

                            $scope.showWaiting = true
                            cmSvc.getVSContentsHash(newVS).then(
                                function (vo) {
                                    let hashNewVS = vo.hashExpanded
                                    $scope.expandErrors = vo.errors
                                    console.log('vs size',utilsSvc.getSizeOfObject(hashNewVS)/1024 )
                                    //now we can add the VS to the full hash

                                    for (const url of Object.keys(hashNewVS) ) {
                                        $scope.hashExpandedVs[url] = hashNewVS[url]

                                        //  alert(url)
                                    }

                                },
                                function (err) {
                                    alert(err)
                                }
                            ).finally(function () {
                                $scope.showWaiting = false
                            })
                        }


                        let treeData = querySvc.makeTree($scope.fullSelectedCM,$scope.cmProperties)
                        showCmTree(treeData)



                    },
                    function () {
                        alert("canshare-select-valueset-map-dev not found")
                    }
                )



            }



        })