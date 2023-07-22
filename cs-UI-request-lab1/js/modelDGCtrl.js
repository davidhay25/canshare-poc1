//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelDGCtrl',
        function ($scope,$uibModal) {


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
                    //$scope.selectedCompositionNode.data.ed.options = updatedEd.options
                    //return

                    $scope.selectedNode.data.ed.options = updatedEd.options
                    //$scope.selectedModel.options = updatedEd.options
                    //ed.options = updatedEd.options


                })
            }

            //change the valueset. This actually changes the model - the composition doesn't (it sets an override)
            $scope.changeDGValueSet = function (ed) {
                let vsUrl = prompt("Enter the ValueSet url")
                if (vsUrl) {
                   // let newEd = angular.copy(ed)
                    ed.valueSet = vsUrl


                }
            }


    })