angular.module("pocApp")
    .controller('pocCtrl',
        function ($scope,$http) {

            $scope.input = {};

            $scope.setImageUrl = function (url) {
                $scope.slideUrl = url
            }
            $scope.slideUrl = 'images/canshare-1.png'

        }
    )