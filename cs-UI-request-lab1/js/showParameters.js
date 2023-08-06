angular.module("pocApp")
    .controller('showParametersCtrl',
        function ($scope,parameters,title,system,code,$http) {


            $scope.arHx = []

            $scope.parameters = parameters
            $scope.title = title
            $scope.selectParameter = function (param) {
                $scope.selectedParameter = param
            }

            $scope.selectCode = function (part) {
                console.log(part)
                let code
                part.forEach(function (p) {1
                    if (p.name == 'value') {
                        code1 = p.valueCode
                    }
                })

                if (code1) {
                    //system = system || snomed
                    let qry = `CodeSystem/$lookup?system=${system}&code=${code1}`
                    let encodedQry = encodeURIComponent(qry)
                    $scope.showWaiting = true
                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            $scope.title = code1
                            $scope.parameters = data.data
                        }, function (err) {

                        }
                    )
                }




            }

        }
    )