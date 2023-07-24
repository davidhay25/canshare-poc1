//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal,$filter,modelTermSvc) {


            $scope.editDGOptionsList = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'optionsCtrl',

                    resolve: {
                        ed: function () {
                            return ed
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

                    //make the term summary

                    //$rootScope.termSummary = modelTermSvc.makeDGSummary($scope.hashAllDG).list





                }
            }


    })