angular.module("pocApp")
    .controller('selectEDCtrl',
        function ($scope,DG,$http) {

            $scope.linkedDGName = DG.linkedDG

            $scope.input = {selected:{}};


            $http.get(`/frozen/${$scope.linkedDGName}`).then(
                function (data) {
                    $scope.linkedDG = data.data
                }, function (err) {
                    alert (angular.toJson(err.data))
                }
            )

            $scope.select = function () {
                let selected = []
                for (let ed of $scope.linkedDG.diff) {
                    let path = ed.path
                    if ($scope.input.selected[path]) {
                        selected.push(ed)
                    }
                }
                console.log(selected)

                $scope.$close(selected)
            }

        }
    )