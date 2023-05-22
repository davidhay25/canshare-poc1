angular.module("pocApp")
    .controller('showParametersCtrl',
        function ($scope,parameters,title) {

            $scope.parameters = parameters
            $scope.title = title
            $scope.selectParameter = function (param) {
                $scope.selectedParameter = param
            }

        }
    )