angular.module("pocApp")
    .controller('pocCtrl',
        function ($scope,$http,utilsSvc) {

            $scope.input = {};
            $scope.version = utilsSvc.getVersion()

            $scope.setImageUrl = function (url) {
                $scope.slideUrl = url
            }
            $scope.slideUrl = 'images/canshare-2.png'

        }
    )