angular.module("pocApp")
    .controller('viewVSCtrl',
        function ($scope,url,$http,$uibModal) {
            $scope.url = url
            $scope.input = {}

            let snomed = "http://snomed.info/sct"

            $scope.languages = []       //languages that can be used for the expansion
            $scope.languages.push({display:"Default",code:""})      //todo find nz expansion
            $scope.languages.push({display:"CanShare",code:"en-x-sctlang-23162100-0210105"})

            //if the url does not start with 'http' then assume it is a canshae url and convert
            if (url.substring(0,4) !== 'http') {
                $scope.url = `https://nzhts.digital.health.nz/fhir/ValueSet/${url}`

            }



            $scope.expandVSInTS = function (url) {
                delete $scope.expandedVS
                let qry = `ValueSet/$expand?url=${url}&_summary=false`

                if ($scope.input.selectedLanguage && $scope.input.selectedLanguage.code) {
                    qry += `&displayLanguage=${$scope.input.selectedLanguage.code} `
                }

                if ($scope.input.filter) {
                    qry += `&filter=${$scope.input.filter}`
                }

                $scope.expandQry = qry
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.expandedVS = data.data
                    }, function (err) {
                        alert(`There was no ValueSet with the url:${url}`)
                    }
                ).finally(
                    function () {
                        $scope.showWaiting = false
                    }
                )

            }

            //$scope.expandVSInTS(url)

            $scope.lookup = function (code) {


                let qry = `CodeSystem/$lookup?system=${snomed}&code=${code}`


                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(

                    //$http.get(url).then(
                    function (data) {
                        //console.log(data.data)
                        //alert(data.data)
                        $scope.showWaiting = false
                        $uibModal.open({
                            templateUrl: 'modalTemplates/showParameters.html',
                            //backdrop: 'static',
                            //size : 'lg',
                            controller : "showParametersCtrl",
                            controllerDEP: function($scope,parameters){
                                $scope.parameters = parameters
                            },
                            resolve: {
                                parameters: function () {
                                    return data.data
                                },
                                title : function () {
                                    return `Concept lookup (${code})`
                                }
                            }

                        })


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }




        }
    )