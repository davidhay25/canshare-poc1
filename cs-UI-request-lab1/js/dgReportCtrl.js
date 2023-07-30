angular.module("pocApp")
    .controller('dgReportCtrl',
        function ($scope) {

            $scope.selectChangedElement = function (el) {
                console.log(el)
            }

            $scope.selectNew = function() {

            }
        }
    )