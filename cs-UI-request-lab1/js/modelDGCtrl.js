//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal,$filter,modelsSvc,modelDGSvc) {

            //locate the model where this item was defined
            $scope.getSourceModelName = function (ed) {
                if (ed) {
                    for (const element of $scope.fullElementList) {
                        if (element.ed.path == ed.path) {
                            return element.sourceModelName
                            break
                        }
                    }
                }
            }


            //set the possiblu units for a Quantity DT
            $scope.setUnits = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/setUnits.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'setUnitsCtrl',

                    resolve: {
                        ED: function () {
                            return ed
                        }
                    }

                }).result.then(function (ed) {
                    //copy the units to the current item
                    //need to update the .diff in the selected model
                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.units = ed.units
                            //ed.valueSet = vsUrl
                            break
                        }
                    }
                })
            }

            $scope.editDGOptionsList = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'optionsCtrl',

                    resolve: {
                        ed: function () {
                            return ed
                        },
                        readOnly : function () {
                            return false
                        }
                    }

                }).result.then(function (updatedEd) {
                    //need to update the .diff in the selected model

                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.options = updatedEd.options
                            //ed.valueSet = vsUrl
                            break
                        }
                    }

                    //todo - why twice ???
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.name == ed.name) {
                            ed1.options = updatedEd.options  //this is the model ($localstorage)
                            break
                        }
                    }

                    modelDGSvc.updateChanges($scope.selectedModel,
                        {edPath:p,
                            msg:`Update options list`},
                        $scope)


                })
            }

            //set the fixed value for a CC - creates / update override element
            //todo may be able to use this code for comp as well
            $scope.setFixedValue = function(ed) {
                let code = prompt(`What is the SNOMED code for ${ed.path}`)
                if (code) {
                    let ar = ed.path.split('.')  //need to remove the first part of the path
                    ar.splice(0,1)
                    let path = ar.join('.')

                    //remove the fixedCode from any existing element with this path
                    let found = false
                    for (const ed of $scope.selectedModel.diff) {
                        if (ed.path == path) {
                            ed.fixedCoding = {code:code}

                            modelDGSvc.updateChanges($scope.selectedModel,
                                {edPath:ed.path,
                                    msg:`Set fixed coding to ${angular.toJson(ed.fixedCoding)}`},
                                $scope)

                            //$scope.selectedModel.changes = $scope.selectedModel.changes || []
                            //$scope.selectedModel.changes.push({edPath:ed.path, msg:`Set fixed coding to ${ed.fixedCoding}`})

                            found = true
                            break
                        }
                    }

                    if (! found) {
                        let overrideEd = angular.copy(ed)

                        overrideEd.fixedCoding = {code:code}
                        overrideEd.path = path
                        $scope.selectedModel.diff.push(overrideEd)

                        modelDGSvc.updateChanges($scope.selectedModel,
                            {edPath:ed.path,
                                msg:`Set fixed coding to ${angular.toJson(overrideEd.fixedCoding)}`},
                            $scope)


                        //$scope.selectedModel.changes = $scope.selectedModel.changes || []
                        //$scope.selectedModel.changes.push({edPath:ed.path, msg:`Set fixed coding to ${overrideEd.fixedCoding}`})

                    }

                    ed.fixedCoding = {code:code}        //for the display

                    //rebuild the full element list for the table
                    let vo = modelsSvc.getFullListOfElements($scope.selectedModel,$scope.input.types,$scope.input.showFullModel)
                    $scope.fullElementList = vo.allElements
                }
            }

            //remove the fixed element, but leave the (likely override) in place
            //as there may have been other parts in that element that were overriden - like multiplicity
            $scope.clearFixedValue = function(ed) {
                let ar = ed.path.split('.')  //need to remove the first part of the path
                ar.splice(0,1)
                let path = ar.join('.')

                let found
                for (const ed1 of $scope.selectedModel.diff) {
                    if (ed1.path == path) {
                        found = true

                        modelDGSvc.updateChanges($scope.selectedModel,
                            {edPath:ed1.path, msg:`clear fixed coding`},$scope)

                        //$scope.selectedModel.changes = $scope.selectedModel.changes || []
                        //$scope.selectedModel.changes.push({edPath:ed1.path, msg:`clear fixed coding`})

                        delete ed.fixedCoding   //for the display
                        delete ed1.fixedCoding

                        break
                    }
                }

                //this should no longer be triggerred as routine is only called when can be cleared
                if (! found) {
                    let sourceModeName = $scope.getSourceModelName(ed)
                    alert(`Fixed values can only be removed on the DG where it was set (${sourceModeName})`)
                }


                //rebuild the full element list for the table
                let vo = modelsSvc.getFullListOfElements($scope.selectedModel,$scope.input.types,$scope.input.showFullModel)
                $scope.fullElementList = vo.allElements

                //$scope.$parent.dgUpdates = modelDGSvc.makeUpdateList($scope.hashAllDG, $scope.xref )

            }

            //change the valueset. This actually changes the model - the composition doesn't (it sets an override)
            $scope.changeDGValueSetDEP = function (ed) {
                let vsUrl = prompt("Enter the ValueSet url")
                if (vsUrl) {

                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.valueSet = vsUrl        //this is the model ($localstorage)
                            ed.valueSet = vsUrl         //this is the display


                            modelDGSvc.updateChanges($scope.selectedModel,
                                {edPath:ed.path,
                                    msg:`Set ValueSet to ${vsUrl}`},
                                $scope)

                            break
                        }
                    }

                }
            }


    })