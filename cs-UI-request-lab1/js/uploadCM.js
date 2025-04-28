angular.module("pocApp")
    .controller('uploadCmCtrl',
        function ($scope,$http) {



            $scope.cmUpload = {}

            $scope.parseUCM = function () {

                try {
                    $scope.cmUpload = angular.fromJson($scope.input.cmJson)

/*
                    $scope.cmUpload.id = $scope.cmToUpload.id
                    $scope.cmUpload.url = $scope.cmToUpload.url
                    $scope.cmUpload.title = $scope.cmToUpload.title
                    $scope.cmUpload.description = $scope.cmToUpload.description

                    if (! cmUpload.syndicate) {
                        $scope.cmUpload
                    }

                    //note that only a single identiifer is allowed in R4
                    let identifier = {system:"http://canshare.co.nz/fhir/NamingSystem/conceptmaps",value:$scope.cmToUpload.id}
                    $scope.cmUpload.identifier = identifier
*/


                } catch (ex) {
                    alert("Not valid Json")
                }

            }

            $scope.makeCM = function () {


            }


            $scope.uploadUCM = function () {
                alert("Upload here")
            }
        }
    )