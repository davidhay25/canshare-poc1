angular.module("pocApp")
    .controller('clinicalViewerCtrl',
        function ($scope,$http,commonSvc) {

            $scope.input = {};

            //load the config. We need this for the fullUrl in the request bundle and server interactions
            commonSvc.init().then(
                function(data){
                    $scope.config = data
                    commonSvc.getAllPatients().then(
                        function (patients) {
                            $scope.allPatients = patients
                        }
                    )
                })

            

        }
    )