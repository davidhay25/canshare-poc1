//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal,$filter,modelsSvc) {

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

                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.name == ed.name) {
                            ed1.options = updatedEd.options  //this is the model ($localstorage)
                            break
                        }
                    }

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
                            found = true
                            break
                        }
                    }

                    if (! found) {
                        let overrideEd = angular.copy(ed)
                        overrideEd.fixedCoding = {code:code}
                        overrideEd.path = path
                        $scope.selectedModel.diff.push(overrideEd)
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

                for (const ed of $scope.selectedModel.diff) {
                    if (ed.path == path) {
                        delete ed.fixedCoding
                        break
                    }
                }

                delete ed.fixedCoding   //for the display
                //rebuild the full element list for the table
                let vo = modelsSvc.getFullListOfElements($scope.selectedModel,$scope.input.types,$scope.input.showFullModel)
                $scope.fullElementList = vo.allElements
            }

            //change the valueset. This actually changes the model - the composition doesn't (it sets an override)
            $scope.changeDGValueSet = function (ed) {
                let vsUrl = prompt("Enter the ValueSet url")
                if (vsUrl) {

                    let p = $filter('lastInPath')(ed.path)
                    for (const ed1 of $scope.selectedModel.diff) {
                        if (ed1.path == p) {
                            ed1.valueSet = vsUrl        //this is the model ($localstorage)
                            ed.valueSet = vsUrl         //this is the display
                            break
                        }
                    }

                }
            }


    })