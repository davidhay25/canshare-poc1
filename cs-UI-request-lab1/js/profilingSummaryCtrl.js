angular.module("pocApp")
    .controller('profilingSummaryCtrl',
        function ($scope,$http) {

            function loadSummary() {
                $http.get('/fsh/summary').then(
                    function (data) {
                        $scope.profileSummary = data.data
                    }
                )
            }
            loadSummary()

            $scope.selectUrl = function (url) {
                $scope.selectedUrl = url
                $scope.selectedUrlUses = $scope.profileSummary[url]
            }

        }
    )