angular.module("pocApp")
    .controller('cmCtrl',
        function ($scope,$http,$q,querySvc,cmSvc,$uibModal) {

            let snomed = "http://snomed.info/sct"
            $scope.local = {cmOptions : {},cm:{property:{}}}

            $scope.cmProperties = {}

            $scope.local.conceptMapTab = 3      //select the UI tab while developing
            $scope.local.uiValues = {}          //a hash of values selected in the UI
            //$scope.input.showHelp = true

            $scope.showTarget = function (target) {
                if ($scope.selectedTarget && target.code == $scope.selectedTarget.code) {
                    delete $scope.selectedTarget
                } else {
                    $scope.selectedTarget = target
                }

            }

            //as the expansion is performed by a child controller, I use this event to get the hash
            $scope.$on('hashExpandedVs',function (event,data) {
                $scope.hashExpandedVs = data
                //alert('hash')
                console.log(data)
            })


            $scope.selectCMItemDEP = function (item,expand) {
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
                        $scope.fullSelectedCM.group.forEach(function (group) {
                            group.element.forEach(function (element) {
                                element.target.forEach(function (target) {
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
                            cmSvc.getVSContentsHash(lstVsUrl).then(
                                function (data) {
                                    console.log(data)
                                    $scope.$broadcast('hashExpandedVs',data)    //the list is processed by cmCtrl
                                },
                                function (err) {
                                    alert(err)
                                }
                            )
                        }



                        //make the download link
                       // $scope.downloadLinkMap = window.URL.createObjectURL(new Blob([angular.toJson($scope.fullSelectedCM,true) ],{type:"application/json"}))
                       // $scope.downloadLinkMapName = `ConceptMap-${$scope.fullSelectedCM.id}.json`

                        let treeData = querySvc.makeTree($scope.fullSelectedCM)
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
                        $scope.showTranslate = Object.keys($scope.doProperties).length > 0

                    }, function (err) {

                    }
                ).finally(function () {
                    $scope.loadingCM = false
                })

            }


            //load the CM
            //$scope.selectCMItem({cm:{url:"http://canshare.co.nz/fhir/ConceptMap/canshare-scripted-dec"}})
            $scope.selectCMItem({cm:{url:"http://canshare.co.nz/fhir/ConceptMap/canshare-scripted-mar2024"}})



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


            function setup() {
                $scope.local.cmOptions = {}
                //these are the properties
                $scope.cmProperties = {}
                $scope.cmProperties['patient-sex'] = {concept: {code:"184100006"},
                    next:'cancer-service',options:[]}
                $scope.cmProperties['cancer-service'] = {concept: {code:"299801000210106"},
                    next:'cancer-stream',options:[]}
                $scope.cmProperties['cancer-stream'] = {concept:{code:"299811000210108",display:"Cancer Stream",system:snomed},
                    next:'cancer-substream', options : []}
                $scope.cmProperties['cancer-substream'] = {concept: {code:"299821000210103"},
                    next:'cancer-type',options:[]}
                $scope.cmProperties['cancer-type'] = {concept: {code:"299831000210101"},
                    next:'primary-site',options:[]}
                $scope.cmProperties['primary-site'] = {concept: {code:"399687005"},
                    next:'primary-site-laterality',options:[]}
                $scope.cmProperties['primary-site-laterality'] = {concept: {code:"297561000210100"},
                    next:'histologic-type-primary',options:[]}
                $scope.cmProperties['histologic-type-primary'] = {concept: {code:"512001000004108"},options:[]}

                $scope.cmProperties['patient-sex'].options.push({code:"U",display:"Unknown"})
                $scope.cmProperties['patient-sex'].options.push({code:"O",display:"Other"})
                $scope.cmProperties['patient-sex'].options.push({code:"F",display:"Female"})
                $scope.cmProperties['patient-sex'].options.push({code:"M",display:"Male"})

                //cancer service options are fixed - todo get from CM
                $scope.cmProperties['cancer-service'].options.push({code:"394803006",display:"Clinical haematology"})
                $scope.cmProperties['cancer-service'].options.push({code:"394593009",display:"Medical oncology"})
                $scope.cmProperties['cancer-service'].options.push({code:"418002000",display:"Paediatric oncology"})
                $scope.cmProperties['cancer-service'].options.push({code:"419815003",display:"Radiation oncology"})
                $scope.cmProperties['cancer-service'].options.push({code:"0",display:"No service"})

            }
            setup()

            $scope.showConcept = function(c) {
                return `${c.display} (${c.code})`
            }

            //get all the concepts for a single property - this is applying the rules engine...
            //called from the Rules tab
            $scope.getOptionsOneProperty = function() {
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
                let vo = cmSvc.rulesEngine($scope.input.cmProperty,$scope.local.cm.property,
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

            $scope.resetUIData = function () {
                delete $scope.displayMatchNumber
                delete $scope.input.cmProperty
                delete $scope.cmExpandedVS
                delete $scope.matchingVS
                setup()
                delete $scope.selectedElement
                $scope.local.cm.property = {}

            }

            //construct a list of all the potential targets for a given property
            //invoked when the property to be populated is selected
            $scope.makeListOfTargets = function (key) {
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


            //when a selection is made in the UI. We want to select options for the next one...
            $scope.uiValueSelected = function (propKey) {
                //console.log(propKey)

                //when a value is selected, then clear all the subsequent entries
                let clear = false
                Object.keys($scope.cmProperties).forEach(function (key) {

                    if (clear) {
                        //clear is set when we're past the current property
                        $scope.cmProperties[key].options = []  //optios for the property. Used by the rules rather than lookup
                        delete $scope.cmProperties[key].singleConcept //flag that the option is a single concept
                        delete $scope.cmProperties[key].noMatches  //flag that no options were found
                        delete $scope.local.uiValues[key]  //data enterd for that property
                        delete $scope.local.cmOptions[key]  //list of options for that property
                    }
                    if (key == propKey) {
                        clear = true
                    }
                })


                let def = $scope.cmProperties[propKey]
                if (def && def.next) {
                    $scope.populateUIControl(def.next)
                }

            }

            //reset all the inputs for the UI
            $scope.resetUI = function () {
                delete $scope.lstMatchingConceptsForUI
                delete $scope.uiMatchingVS
                delete $scope.uiHashValues

                $scope.local.cmOptions = {}     //the data entered
/*
                Object.keys($scope.cmProperties).forEach(function (key) {
                    $scope.cmProperties[key].options = []
                    delete $scope.cmProperties[key].singleConcept
                    delete $scope.cmProperties[key].nomatches

                })

                */

                setup()         //sets the defaulvalues

            }

            //called to populate the UI control for a single property
            //if noNext
            $scope.populateUIControl = function (propKey,noNext) {
                delete $scope.lstMatchingConceptsForUI
                delete $scope.uiMatchingVS
                delete $scope.singleConcept     //if a single concept is returned (rather than a VS)

                $scope.local.uiTitle = `Looking for possible values for ${propKey}`
                //propKey is the property we're wanting to populate
                //strategy is that we want to find the matching target in the CM based solely on the values
                //of elements 'before' this property in the property order.


                //get the ConceptMap element that has all the targets for this property
                let propertyCode = $scope.cmProperties[propKey].concept.code        //the actual code in the element.code
                let cmElement = {}
                for (const element of $scope.fullSelectedCM.group[0].element) {
                    if (element.code == propertyCode) {     //this is the set of targets which could match this code
                        cmElement = element
                    }
                }

                if (! cmElement) {
                    alert(`An element in the Concept map for the code ${propertyCode} could not be located`)
                    return
                }


                $scope.uiHashValues = {}     //a hash of all the data entered - but only those 'before' this element
                for (const prop of Object.keys($scope.cmProperties)) {
                    if (prop == propKey) {
                        break
                    }
                    $scope.uiHashValues[prop] = $scope.local.cmOptions[prop] //$scope.local.cmOptions has the data entered thus far.
                    //console.log(prop,$scope.local.cmOptions[prop])
                }


                //now, apply the rules engine to this element and set of codes
                let vo = cmSvc.rulesEngine(null,$scope.uiHashValues,cmElement,$scope.hashExpandedVs)

                $scope.uiMatchingVS = vo.lstVS                //The valuesets from all rules that were matched
                //$scope.uiMmatchedRules = vo.lstMatches         //the actual targets that matched
                $scope.uiMatchingTargets = vo.lstMatchingTargets


                //console.log($scope.uiMatchingVS)



                if ($scope.uiMatchingVS && $scope.uiMatchingVS.length > 0) {

                    if ($scope.uiMatchingVS[0].indexOf('http') == -1) {
                        //this is a single concept. We can get the display details from the first element of $scope.uiMatchingTargets
                        let target = $scope.uiMatchingTargets[0]
                        $scope.singleConcept = {code:target.code,display:target.display,system:target.system}
                        $scope.cmProperties[propKey].singleConcept = {code:target.code,display:target.display,system:target.system}


                        //set the value of the fixed element
                        //todo - there are multiple objects storing this value - need to be refactored
                        $scope.uiHashValues[propKey] = $scope.singleConcept
                        $scope.local.cmOptions[propKey] = $scope.singleConcept

                        //$//scope.uiHashValues[prop] = $scope.local.cmOptions[prop] //$scope.local.cmOptions has the data entered thus far.


                        //as there is only a single concept, which is not editable then move on to the next one
                        //todo - this does mean we won't see the details
                        let next = $scope.cmProperties[propKey].next
                        if (next && ! noNext) {
                            $scope.populateUIControl(next)
                        }

                    } else {
                        //now expand the valuesets to get the actual concepts
                        let qry = `/nzhts/expandMultipleVs`
                        $http.post(qry,$scope.uiMatchingVS).then(
                            function (data) {
                                console.log(data)

                                $scope.cmProperties[propKey].options = data.data

                                $scope.lstMatchingConceptsForUI = data.data
                            }, function (err) {
                                console.log(err)
                            }
                        )
                    }




                } else {
                    $scope.cmProperties[propKey].noMatches = true

                    let next = $scope.cmProperties[propKey].next
                    if (next && ! noNext) {
                        $scope.populateUIControl(next)
                    }

                   // alert(`There were no matching ValueSets found for ${propKey}`)


                }





            }

            //called when a property option in the UI changes
            $scope.cmLookup = function (inputProp,v,propKey) {
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

                let vo = cmSvc.rulesEngine(nextProperty,params,$scope.selectedElement)
                //$scope.matchingVS = vo.lstVS


                //$scope.matchedRules = vo.lstMatches

                //let results = querySvc.processMyTranslate( nextProperty.concept,params,$scope.fullSelectedCM)
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

                     //   if (! )
                        $scope.cmProperties[key].options = results
                    }

                }

                /*
                let nextProperty = $scope.cmProperties[prop.next]

                let params = makeParams()
                let results = querySvc.processMyTranslate( nextProperty.concept,params,$scope.fullSelectedCM)
                console.log(results)
                */


                    /* - don't delete - this uses the term server
                $scope.cmParamQry = makeTranslateQuery(nextProperty.concept,$scope.fullSelectedCM.url)

                performTranslate($scope.cmParamQry.parameters).then(
                    function (data) {
                        console.log(data)
                    },function (err) {
                        console.log(err)
                    }
                )

               */

            }

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

                        //let item = {}
                        //item.property = key
                        //item.value = v
                        //myParams.push(item)

                        //params.push(item)
                    }

                }
                return params

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
console.log(p)
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

            $scope.deleteRuleDEP = function () {

            }

            $scope.addRuleDEP = function () {

            }

        })