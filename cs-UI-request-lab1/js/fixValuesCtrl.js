angular.module("pocApp")
    .controller('fixValuesCtrl',
        function ($scope,type) {
            $scope.type = type

            $scope.input = {}
            $scope.input.system = "http://snomed.info/sct"

            $scope.save = function () {
                let v
                switch (type) {
                    case "coding" :
                        v = {system:$scope.input.system,code:$scope.input.code}
                        if ($scope.input.display) {
                            v.display = $scope.input.display
                        }
                        break
                }
                $scope.$close(v)

            }

        }
    )