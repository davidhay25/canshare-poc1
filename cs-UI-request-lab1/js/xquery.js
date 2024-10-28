angular.module("pocApp")
    .controller('xqueryCtrl',
        function ($scope,query,$http) {


            $scope.query = query
            $scope.input = {}

            $scope.input.expression = query.expression

            //get the resource type - assume a structure like AllergyIntolerance?patient={{%patient.id}}
            let ar = query.expression.split('?')
            let resourceType = ar[0]

            $scope.input.fhirPath = `%${query.itemName}`

            $scope.input.patientId = 45086382
            //let patientId = 45086382      //todo - pass in as a param

            let server = "https://hapi.fhir.org/baseR4/"

            let replacement = {}        //parameter replacement.
            replacement["{{%patient.id}}"] = $scope.input.patientId


            let replaceParams = function (expression) {
                for (const placeHolder of Object.keys(replacement)) {
                    let repl = replacement[placeHolder]
                    expression = expression.replace(placeHolder,repl)
                }
                return expression
            }

            $scope.selectResource = function (resource) {
                $scope.selectedResource = resource
            }

            //assume an xquery expression
            $scope.execute = function (expression) {
                let repl = replaceParams(expression)
                let qry = `${server}${repl}`
                console.log(qry)
                $http.get(qry).then(
                    function (data) {
                        console.log(data.data)
                        $scope.response = data.data



                    }, function (err) {
                        console.log(err.data)
                    }
                )






            }


            $scope.executeFhirPath = function (fhirPath,resource) {


                fhirPath = fhirPath.replace(`%${query.itemName}`,resourceType)

                    try {
                        let result = fhirpath.evaluate(resource, fhirPath, null, fhirpath_r4_model)
                        console.log(fhirPath,result)
                        $scope.fhirPathResult = result
                        //return result

                    } catch (ex) {
                        alert(angular.toJson(ex))
                        console.log(ex)

                    }


            }

        })