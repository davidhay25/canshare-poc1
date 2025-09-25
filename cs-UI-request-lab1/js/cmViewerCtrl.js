
/*
The controller for the modal that will display the contents of a ConceptMap (cmViewer) and allow them to be viewed.
There's no update capability - concept maps are authored in a spreadsheet and imported into the server.
 */

angular.module("pocApp")
    .controller('cmViewerCtrl',
        function ($scope,conceptMap,$uibModal,cmTesterSvc,hashExpandedVs,selectedProperty,data,$http,config,$timeout) {
            $scope.input = {}

            console.log(config)

            $scope.data = data

            let snomed = "http://snomed.info/sct"

            //create an array for the data display table
            if (data) {
                let lst = []
                for (const [key, value] of Object.entries(data)) {
                    if (value) {
                        let item = {}
                        item.propKey = key

                        item.code = value.code
                        item.display = value.display
                        item.system = value.system

                        lst.push(item)
                    }


                }

                lst.sort(function (a,b) {
                    if (a.propKey > b.propKey) {
                        return 1
                    } else {
                        return -1
                    }
                })
                $scope.sortedData = lst

            }

            $scope.conceptMap = conceptMap
            //$scope.updateVSSvc = updateVSSvc

            //create a hash of propertynames by snomed code
            //for (const )


//Create the display of property name vs snomed code
            function makePropertyAudit() {
                $scope.hashPropertyNames = {}      //all the codes for the properties
                $scope.hashPropertyForCode = {}    //the property name for a code

                //pass 1 - get all the propertyname / codes from the config file
                for (const [key, value] of Object.entries(config.tnmLUT)) {
                    $scope.hashPropertyNames[key] = {code: value}
                    $scope.hashPropertyForCode[value] = {prop:key}
                }

                //add the diagnostirProperties, stagingProperties and gradingProperties to the hash
                for (let root of ['diagnosticProperties','stagingProperties','gradingProperties']) {
                    let branch = config[root]
                    for (const [key, value] of Object.entries(branch)) {
                        $scope.hashPropertyNames[key] = {code: value.concept}
                        $scope.hashPropertyForCode[value.concept.code] = {prop:key,display:value.concept.display}
                    }
                }

console.log($scope.hashPropertyNames,$scope.hashPropertyForCode)

                //pass 2 - get all the properties referenced in the current map
                //and the element codes in use
                    let hashDON = {}    //all the dependsOn properties in all elements
                    let hashElementCode = {}    //all the codes in the elements
                    for (const element of conceptMap.group[0].element) {
                        hashElementCode[element.code] = {}

                        if (! $scope.hashPropertyForCode[element.code]) {
                            $scope.hashPropertyForCode[element.code] = {} //{prop:"No property name from Config"}
                        } else {
                            if (! $scope.hashPropertyForCode[element.code].display) {
                                $scope.hashPropertyForCode[element.code].display = element.display + " from CM"
                            }
                        }

                        for (const target of element.target) {
                            if (target.dependsOn) {
                                for (const don of target.dependsOn) {
                                    hashDON[don.property] = {}
                                }
                            }
                        }
                    }
                    //console.log(hashDON,hashElementCode)




                //pass 2 - add the snomed code from the config file

            }
            makePropertyAudit()



            $scope.getCMOperator = function(don) {
                let op = '='
                if (don.extension) {
                    don.extension.forEach(function (ext) {
                        if (ext.url == 'http://canshare.co.nz/fhir/StructureDefinition/do-operator') {
                            op = ext.valueCode
                        }
                    })
                }

                return op
            }



            if (! hashExpandedVs) {
                $scope.noVS = true
            }

            //create sorted list of elements for display
            $scope.sortedElements = conceptMap.group[0].element
            $scope.sortedElements.sort(function (a,b) {
                if (a.display > b.display) {
                    return 1
                } else {
                    return  -1
                }
            })

            $scope.selectElement = function (element) {
                $scope.input.cmElement = element
                $scope.selectCmElement($scope.input.cmElement)
            }

            //from the 'other propertirs' tab to find matching targets
            $scope.lookupTargets = function () {

                $scope.matchingVS = []
                if (hashExpandedVs) {
                    let vo = cmTesterSvc.rulesEngine($scope.input.testCode,$scope.input.cmElement,hashExpandedVs)

                    $scope.matchingVS = vo.lstVS
                    $scope.matchingTargets = vo.lstMatchingTargets
                }
            }

            $scope.selectCmElement = function (element) {
                $scope.matchingVS = []
                $scope.matchingTargets = []
                $scope.input.cmElement = element
                analyseElement(element)
                $scope.lookupTargets()

                let propKey = cmTesterSvc.getPropKeyFromCode(element.code)
                whatDependsOnThis(propKey) //set $scope.thisEffects
            }

            //if a property is passed in to the viewer. This function mst be after  $scope.selectCmElement and $scope.lookupTargets
            if (selectedProperty) {
                let concept = cmTesterSvc.getConceptFromProperty(selectedProperty)
                if (concept.code) {
                    let element = cmTesterSvc.getElementByCode(conceptMap,concept.code)
                    if (element) {
                        $scope.input.cmElement = element
                        $scope.selectCmElement($scope.input.cmElement)
                    }

                }
            }




            //find all the external properties that influence this element
            function analyseElement(element) {
                $scope.input.testCode = {}
                $scope.hashProperty = {}       //all the other properties that have an effect on this one. Contains the set of values
                for (const target of element.target || []) {
                    for (const don of target.dependsOn || []) {
                        $scope.hashProperty[don.property] = $scope.hashProperty[don.property] || []
                        if (don.value.indexOf('http') > -1) {
                            //this is an 'in vs' - add the contents of the valueset
                            if (hashExpandedVs && hashExpandedVs[don.value])  {
                                for (const concept of hashExpandedVs[don.value]) {
                                    addConcept($scope.hashProperty[don.property],concept.code,concept.display)
                                }
                            }
                        } else {
                            //this is a single value
                            addConcept($scope.hashProperty[don.property],don.value,don.display)
                        }
                    }
                    $scope.hashPropertyCount = Object.keys($scope.hashProperty).length





                    //Now create a var with the current values (if any)
                    $scope.hashPropertyValue = {}
                    for (let [key,value] of Object.entries($scope.hashProperty)) {
                        if ($scope.data && $scope.data[key]) {
                            $scope.hashPropertyValue[key] = $scope.data[key]
                        }

                        //sort the contents of the hash
                        value.sort(function (a,b) {
                            if (a.display > b.display) {
                                return 1
                            } else {
                                return -1
                            }

                        })


                    }

                }

                function addConcept(ar,code,display) {
                    let ar1 = ar.filter(c => c.code == code)
                    if (ar1.length == 0) {
                        ar.push({code:code,display:display})
                    }
                }
            }

            //locate all elements that are affected bt t
            function whatDependsOnThis(propKey) {
                $scope.thisEffects = {}
                for (const element of $scope.conceptMap.group[0].element || []) {
                    for (const target of element.target || []) {
                        for (const don of target.dependsOn || []) {
                            if (don.property == propKey) {
                               // let el = cmTesterSvc.getElementByCode($scope.conceptMap,code)

                                $scope.thisEffects[element.code] = element
                            }
                        }
                    }
                }
                $scope.thisEffectsCount = Object.keys($scope.thisEffects).length


            }

            $scope.viewVS = function (url) {
                //display the contents of a single VS
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size: 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
                        }, refsetId: function () {
                            return ""
                        }
                    }

                })
            }

            $scope.lookup = function (code,system) {
                system = system || snomed
                let qry = `CodeSystem/$lookup?system=${system}&code=${code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {

                        $uibModal.open({
                            templateUrl: 'modalTemplates/showParameters.html',
                            //backdrop: 'static',
                            //size : 'lg',
                            controller : "showParametersCtrl",
                            resolve: {
                                parameters: function () {
                                    return data.data
                                },
                                title : function () {
                                    return `Concept lookup (${code})`
                                },
                                code: function () {
                                    return code
                                },
                                system : function () {
                                    return system
                                }
                            }
                        })


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(function () {
                    $scope.showWaiting = false
                })
            }



        }
    )