angular.module("pocApp")
    .controller('showParametersCtrl',
        function ($scope,parameters) {

            $scope.parameters = parameters

            $scope.selectParameter = function (param) {
                $scope.selectedParameter = param
            }

        }
    )