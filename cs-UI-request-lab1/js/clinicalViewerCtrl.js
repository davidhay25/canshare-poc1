angular.module("pocApp")
    .controller('clinicalViewerCtrl',
        function ($scope,$http,commonSvc) {

            $scope.input = {};

/*
            //testing
            //let qry = "ServiceRequest?subject=Patient3"
            let qry = "ServiceRequest"
            let encodedQry = encodeURIComponent(qry)
            $http.get(`/proxy?qry=${encodedQry}`).then(
                function (data) {
                    console.log(data.data)
                    // console.log($scope.expandedVS)
                }
            )

*/


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


            $scope.selectSR = function (SR) {
                //get all the resources associated with a SR based on provenance resources



                let bundle
                let url1 = `ServiceRequest?_id=${SR.id}&_include=ServiceRequest:supportingInfo&_include=ServiceRequest:subject&_include=ServiceRequest:requester`

                let encodedQry = encodeURIComponent(url1)
                $http.get(`/proxy?qry=${encodedQry}`).then(

                //$http.get(url1).then(
                    function (data) {
                        console.log(data)
                        bundle = data.data
                        bundle.entry = bundle.entry || []
                        //get the QR so we can render the form
                        bundle.entry.forEach(function (entry) {
                            if (entry.resource.resourceType == 'QuestionnaireResponse') {
                                $scope.QR = entry.resource
                            }
                        })

                        let url2 = `${$scope.config.SERVERBASE}DiagnosticReport?based-on=ServiceRequest/${SR.id}&_include=DiagnosticReport:result`
                        $http.get(url2).then(
                            function (data) {
                                if (data.data && data.data.entry) {
                                    data.data.entry.forEach(function (entry) {
                                        bundle.entry.push(entry)
                                    })
                                }

                                let url2 = encodeURIComponent(`Provenance?entity=${SR.id}&_include=Provenance:target`)
                                $http.get(`/proxy?qry=${url2}`).then(
                                    function (data) {
                                        console.log(data)
                                        if (data.data && data.data.entry) {
                                            data.data.entry.forEach(function (entry) {
                                                bundle.entry.push(entry)
                                            })
                                        }
                                        $scope.allResourcesForSR = bundle


                                        //and now validate the bundle
                                        let vQry = $scope.config.SERVERBASE + "Bundle/$validate"
                                        $http.post(vQry,bundle).then(
                                            function(data) {
                                                $scope.validationResults = data.data
                                            }, function (err) {
                                                $scope.validationResults = err.data
                                            }

                                        )
                                        //validationResults



                                    }
                                )


                            }
                        )
                    }
                )

                //http://localhost:8080/fhir/ServiceRequest?identifier=2023-03-15T21:39:51.096Z&_include=ServiceRequest:supportingInfo

                //http://localhost:8080/fhir/DiagnosticReport?based-on=ServiceRequest/265&_include=DiagnosticReport:result

                //let url = `${$scope.config.SERVERBASE}Provenance?entity=ServiceRequest/${SR.id}&_include=Provenance:target`
               /* $http.get(url).then(
                    function (data) {
                        console.log(data)
                        $scope.allResourcesForSR = data.data
                    }
                )
                */
               // http://localhost:8080/fhir/Provenance?entity=ServiceRequest/265&_include=Provenance:target

            }


            $scope.selectPatient = function (vo) {
                console.log(vo.patient)
                let patient = vo.patient
                $scope.selectedPatient = vo.patient

                // get all the medications data for the patient.
                //todo ?add a date filter
                getMedications(patient)
                getRegimens(patient)
                //get all the SR for this patient
                commonSvc.getSRForPatient(patient.id).then(
                    function (bundle) {
                        $scope.bundleSR = bundle
                        console.log(bundle)
                    }
                )

            }


            //get all the regimen careplans for a patient
            function getRegimens(patient)  {
                let ar = [`CarePlan?category=${patient.id}&category=regimenCP`]
                $http.post('multiquery',ar).then(
                    function (data) {
                        console.log(data.data)
                        $scope.regimens = data.data
                        console.log(data.data)
                    }, function (err) {
                        console.log(err.data)
                    }
                )

            }

            //get all the data associated with a regimenCP
            function getActNowData(careplan) {
                //first, get the careplans

                let url1 = `CarePlan?category=regimenCP,cycleCP&subject=${patient.id}`


                let ar = []
                ar.push(url1)

                $http.post('multiquery',ar).then(
                    function (data) {
                        console.log(data.data)
                        //$scope.allMeds = data.data
                        console.log(data.data)
                    }, function (err) {
                        console.log(err.data)
                    }
                )


            }

            //get all the medication resources for a patient
            function getMedications(patient) {
                let ar = []
                //ar.push(`MedicationAdministration?subject=${$scope.selectedPatient.id}`)
                //ar.push(`MedicationRequest?subject=${$scope.selectedPatient.id}`)

                //get all the resources for
                ar.push(`MedicationAdministration?subject=${$scope.selectedPatient.id}`)
                ar.push(`MedicationRequest?subject=${$scope.selectedPatient.id}`)

                //ar.push(`MedicationAdministration?subject=Patient3`)
                //ar.push(`MedicationRequest?subject=Patient3`)

                //ar.push(`MedicationAdministration?subject=Patient1`)
                //ar.push(`MedicationRequest?subject=Patient1`)

                $http.post('multiquery',ar).then(
                    function (data) {
                        console.log(data.data)
                        $scope.allMeds = data.data
                        console.log($scope.allMeds)
                    }, function (err) {
                        console.log(err.data)
                    }
                )

            }

        }
    )