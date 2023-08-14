angular.module("pocApp")
    .controller('showParametersCtrl',
        function ($scope,parameters,title,system,code,$http) {


            function getDisplay(params) {
                for (const param of params.parameter) {
                    if (param.name == 'display') {
                        return param.valueString
                        break
                    }
                }


            }

            $scope.arHx = [{code:code,display:getDisplay(parameters),params:parameters}]

            $scope.parameters = parameters
            $scope.title = title
            $scope.selectParameter = function (param) {
                $scope.selectedParameter = param
            }

            //select a different code
            $scope.selectCode = function (part) {
                //console.log(part)
                let code1
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

                            $scope.arHx.push({code:code1,display:getDisplay(data.data),params:data.data})

                        }, function (err) {

                        }
                    )
                }




            }

        }
    )