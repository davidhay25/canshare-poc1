angular.module("pocApp")
    .controller('fixValuesCtrl',
        function ($scope,type,$http) {
            $scope.type = type

            $scope.input = {}
            $scope.input.system = "http://snomed.info/sct"

           // $scope.input.code = "1229901006"

/*

            {
                "name": "designation",
                "part": [
                {
                    "name": "language",
                    "valueCode": "en"
                },
                {
                    "name": "use",
                    "valueCoding": {
                        "system": "http://snomed.info/sct",
                        "code": "900000000000003001",
                        "display": "Fully specified name"
                    }
                },
                {
                    "name": "value",
                    "valueString": "American Joint Committee on Cancer cM1a(0) (qualifier value)"
                }
            ]
            }

            */

            //lookup from the TS
            $scope.lookupFSN = function () {

                let qry = `CodeSystem/$lookup?system=${$scope.input.system}&code=${$scope.input.code}`



                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data)
                        let parameters = data.data



                        for (const param of parameters.parameter) {

                            if (param.name == 'display') {
                                $scope.input.display = param.valueString
                            }

                            if (param.part) {
                                let parsedPart = {}

                                param.part.forEach(function (part) {
                                    parsedPart[part.name] = part.valueCoding || part.valueString
                                })

                                console.log(parsedPart)
                               // if (parsedPart.name == 'use' && parsedPart.valueCoding) {
                                    if (parsedPart.use && parsedPart.use.code == '900000000000003001') {
                                        //this is the FSN
                                        if (parsedPart['value']) {
                                            $scope.input.fsn = parsedPart['value']
                                        }

                                    }
                             //   }

                            }
                        }

                        //find the FSN. I really don't like parameters!




                    },function (err) {
                        alert("This Concept was not found on the National Terminology Server")
                        console.log(err)
                    }
                )


                   // let concept = {system:$scope.input.system,code:$scope.input.code}

            }

            $scope.save = function () {
                let v
                switch (type) {
                    case "coding" :
                        v = {system:$scope.input.system,code:$scope.input.code}
                        if ($scope.input.display) {
                            v.display = $scope.input.display
                        }
                        break
                }
                $scope.$close(v)

            }

        }
    )