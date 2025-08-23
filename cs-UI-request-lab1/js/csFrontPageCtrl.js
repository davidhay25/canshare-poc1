/*
 The front page for the CanShare suite
 Note that the collections are called palygrounds for historical reasons
*/
angular.module("pocApp")
    .controller('csFrontPageCtrl',
        function ($scope,$http) {


                $http.get('playgroundSummary').then(
                    function (data) {
                            $scope.playgrounds = data.data
                            console.log($scope.playgrounds)

                    }, function (err) {
                            alert(angular.toJson(err.data))
                    }
                )

            $scope.viewQ = function (pg) {


            }

            $scope.selectPG = function (pg) {
                $scope.selectedPG = pg
            }

        })
