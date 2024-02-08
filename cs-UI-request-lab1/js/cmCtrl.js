angular.module("pocApp")
    .controller('cmCtrl',
        function ($scope,$http,$q,querySvc,cmSvc,$uibModal) {

            let snomed = "http://snomed.info/sct"
            $scope.local = {cmOptions : {},cm:{property:{}}}
            $scope.cmProperties = {}

            //$scope.input.showHelp = true

            $scope.showTarget = function (target) {
                if ($scope.selectedTarget && target.code == $scope.selectedTarget.code) {
                    delete $scope.selectedTarget
                } else {
                    $scope.selectedTarget = target
                }

            }

            //load the CM
            $scope.selectCMItem({cm:{url:"http://canshare.co.nz/fhir/ConceptMap/canshare-scripted-dec"}})


            $scope.editRule = function (target) {

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

            $scope.deleteRule = function () {

            }

            $scope.addRule = function () {

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
                    }, function (err) {

                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )
            }

            function expandV(url) {
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
                $scope.cmProperties['cancer-service'] = {concept: {code:"299801000210106"},next:'cancer-stream',options:[]}
                $scope.cmProperties['cancer-stream'] = {concept:{code:"299811000210108",display:"Cancer Stream",system:snomed}, options : []}
                $scope.cmProperties['cancer-substream'] = {concept: {code:"299821000210103"},options:[]}
                $scope.cmProperties['cancer-type'] = {concept: {code:"299831000210101"},options:[]}
                $scope.cmProperties['primary-site'] = {concept: {code:"399687005"},options:[]}
                $scope.cmProperties['primary-site-laterality'] = {concept: {code:"297561000210100"},options:[]}
                $scope.cmProperties['histologic-type-primary'] = {concept: {code:"512001000004108"},options:[]}

                $scope.cmProperties['patient-sex'] = {concept: {code:"184100006"},options:[]}


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

            //get all the concepts for a single property
            $scope.getOptionsOneProperty = function() {
                //console.log($scope.local.cm.property)
                delete $scope.lstMatchingConcepts
                delete $scope.cmExpandedVS      //so it's not in the display area
                //call the rules engine to determine the possible concepts. The engine needs:
                //  the list of user selected values for all properties so far  - local.cm.property
                //  the property that needs the list - input.cmProperty & $scope.selectedElement
                let vo = cmSvc.getOptionsOneProperty($scope.input.cmProperty,$scope.local.cm.property,$scope.selectedElement)

                $scope.matchingVS = vo.lstVS
                $scope.matchedRules = vo.lstMatches

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


            $scope.resetUIData = function () {
                delete $scope.cmExpandedVS
                delete $scope.matchingVS
                setup()
                delete $scope.selectedElement
                $scope.local.cm.property = {}
            }

            //construct a list of all the potential targets for a given property
            $scope.makeListOfTargets = function (key) {
                if (! key) {return}
                delete $scope.selectedElement
                delete $scope.selectedTarget
                delete $scope.cmExpandedVS
                let concept = $scope.cmProperties[key].concept
                $scope.hashProperties = {} //a hash of all properties in all dependsOn and all their possible values

                for (const element of $scope.fullSelectedCM.group[0].element) {
                    if (element.code == concept.code) {
                        $scope.selectedElement = element

                        //now create the list of all properties referenced in all the dependsOn elements..
                        if (element.target) {

                            element.target.forEach(function (target) {
                                if (target.dependsOn) {
                                    target.dependsOn.forEach(function(don) {
                                        let property = don.property
                                        let v = don.value //the value is actually a code
                                        $scope.hashProperties[property] = $scope.hashProperties[property] || []

                                        //as the contents of the hash is an array, we need to look through the arrey
                                        //to determine if this value has been alreadt added
                                        let canAdd = true
                                        for (const item of $scope.hashProperties[property]) {
                                            if (item.code == v) {
                                                canAdd = false
                                                break
                                            }
                                        }

                                        if (canAdd) {
                                            $scope.hashProperties[property].push({code:v,display:don.display})
                                        }
/*
                                        if ($scope.hashProperties[property].indexOf(v) == -1) {
                                            $scope.hashProperties[property].push({code:v,display:don.display})
                                        }
*/

                                    })
                                }

                            })


                        }





                        console.log(element)
                        console.log($scope.hashProperties)
                        break
                    }
                }
            }

            //called when a property option in the UI changes
            $scope.cmLookup = function (prop,v,propKey) {
                console.log(prop,v,propKey)
                return;

                //just set the next one
                let nextProperty = $scope.cmProperties[prop.next]

                //

                let params = makeHashParams()   //a hash of all data thus far ?todo only the preceeding ones

                //find the cm element that corresponds to the option being populated - it has the potential targets


                //parameters:
                //  property - the property name for which concepts are sought - eg cancer-stream
                //  hashInput - a hash keyed by property name that has all the properties where the user has selected a value
                //  element -  has all the possible targets for that property (each property has one element in the CM)


                //let vo = cmSvc.getOptionsOneProperty($scope.input.cmProperty,$scope.local.cm.property,$scope.selectedElement)

                let vo = cmSvc.getOptionsOneProperty(nextProperty,params,$scope.selectedElement)
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

            //generate the translate query from the canshare lookup tab
            function makeTranslateQuery(conceptWeWant,cmUrl)  {

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

            function performTranslate(parameters) {
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

        })