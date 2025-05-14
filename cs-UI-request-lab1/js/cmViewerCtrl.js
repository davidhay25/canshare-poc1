angular.module("pocApp")
    .controller('cmViewerCtrl',
        function ($scope,updateVSSvc,conceptMap,$uibModal,cmSvc,hashExpandedVs,selectedProperty) {
            $scope.input = {}

            $scope.conceptMap = conceptMap
            $scope.updateVSSvc = updateVSSvc

            if (! hashExpandedVs) {
                $scope.noVS = true
            }


            //from the 'other propertirs' tab to find matching targets
            $scope.lookupTargets = function () {

                $scope.matchingVS = []
                if (hashExpandedVs) {
                    let vo = cmSvc.rulesEngine($scope.input.testCode,$scope.input.cmElement,hashExpandedVs)

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
            }

            //if a property is passed in to the viewer. This function mst be after  $scope.selectCmElement and $scope.lookupTargets
            if (selectedProperty) {
                let concept = cmSvc.getConceptFromProperty(selectedProperty)
                if (concept.code) {
                    let element = cmSvc.getElementByCode(conceptMap,concept.code)
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
                }

                function addConcept(ar,code,display) {
                    let ar1 = ar.filter(c => c.code == code)
                    if (ar1.length == 0) {
                        ar.push({code:code,display:display})
                    }
                }

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


        }
    )