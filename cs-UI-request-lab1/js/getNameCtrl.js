angular.module("pocApp")
    .controller('getNameCtrl',
        function ($scope) {
            $scope.input = {}

            $scope.setName = function (title) {
               // $scope.input.name = title.replace(/\s/g, '') //remove any spaces
            }

            $scope.save = function () {
                let vo = {title:$scope.input.title,description:$scope.input.description}
                vo.name = $scope.input.name.replace(/\s/g, '')
                $scope.$close(vo)
            }

        }
    )