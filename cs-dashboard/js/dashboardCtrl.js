angular.module("pocApp")
    .controller('dashBoardCtrl',
        function ($scope,$http) {

            $scope.input = {};

            function getLogs() {
                $http.get("/logs").then(
                    function (data) {
                        $scope.logs = data.data
                    }, function(err) {
                        console.log(err)
                    }
                )
            }
            getLogs()

            $scope.selectLog = function(log) {
                $scope.selectedLog = log
            }

            $scope.doit = function(qry) {
                delete $scope.qryResult

                let url = "/doit/"+encodeURIComponent(qry)

                $http.get(url).then(
                    function(data) {
                        $scope.qryResult = data
                    },
                    function(data) {
                        $scope.qryResult = data
                    }
                )
            }

        }
    )