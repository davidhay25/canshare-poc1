angular.module("pocApp")
    .controller('fixValuesCtrl',
        function ($scope,type,$http,kind,current) {
            //'type' is the datatype
            //'kind' is 'fixed' or 'default'
            //'current' is the current value (of type 'type') - if any
            $scope.type = type
            $scope.kind = kind

            $scope.input = {}
            $scope.input.system = "http://snomed.info/sct"
            if (current) {
                //there is a current value that is being edited
                switch (type) {
                    case 'coding' :
                        $scope.input.code = current.code
                        $scope.input.display = current.display
                        $scope.input.fsn = current.fsn
                        break
                }
            }

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