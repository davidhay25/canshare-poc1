angular.module("pocApp")
    .controller('setUnitsCtrl',
        function ($scope,ED) {
            $scope.ED = ED
            $scope.input = {}

            $scope.addUnit = function (unit) {
                $scope.ED.units = $scope.ED.units || []
                $scope.ED.units.push(unit)
                delete $scope.input.unit
            }

            $scope.deleteUnit = function (inx) {
                $scope.ED.units.splice(inx,1)
            }

            $scope.save = function (){
                $scope.$close(ED)
            }

        }
    )