angular.module("pocApp")
    .controller('clinicalViewerCtrl',
        function ($scope,$http,commonSvc,clinicalViewerSvc,$window,$location) {

            $scope.input = {};
            $scope.input.anClinicalSummary = {}
            $scope.commonSvc = commonSvc

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

            let search = $window.location.search;

            let protocol = $location.protocol();
            let port = $location.port();
            $scope.host = protocol + "://" + $location.host()
            if (port != 80) {
                $scope.host += ":" + port
            }
            $scope.pathToHome = $scope.host + "/poc.html"


            if (search) {
                search = search.substring(1)
                search = decodeURIComponent(search)
                let ar = search.split("&")
                for (q of ar) {
                    console.log((q))
                    let ar1 = q.split('=')
                    if (ar1[0] == 'nhi') {
                        console.log('NHI = ' + ar1[1])
                        //If there is an identifier, then find the patient with that identifier & display their data
                        nhi = ar1[1]
                        if (nhi) {
                            clinicalViewerSvc.findPatientByIdentifier(nhi).then(
                                function (patient) {
                                    $scope.patientExternallySpecified = true
                                    $scope.selectPatient({patient:patient})
                                }, function (err) {
                                    console.log(err)
                                }
                            )
                        }
                    }
                }
                //console.log(search)
            }




            //when a QR is created by the renderform directive
            $scope.$on('qrCreated',function(event,vo1) {
                $scope.createdQR = vo1.QR
            })

            //retrieve all the templates that could be used to create a general document
            //currently getting the full Q - todo get miniQ and load real one when selected
            clinicalViewerSvc.getGeneralDocumentTemplates().then(
                function (list) {
                    $scope.templates = list
                }
            )

            $scope.selectTemplate = function (Q) {
                $scope.selectedQ = Q
            }

            //send the document via the UI local server to the custom op
            $scope.submitBundle = function () {
                if (confirm("Are you sure you're ready to save this document")) {
                    let vo = {QR:$scope.createdQR,patient:$scope.selectedPatient,Q:$scope.selectedQ}
                    //make a submission bundle with the patient, QR and a DocRef
                    let bundle = clinicalViewerSvc.makeSubmissionBundle(vo)
                    let url = "/clinical/submitForm"
                    $http.post(url,bundle).then(
                        function (data) {
                            console.log(data)
                            alert("Document has been saved")
                            //reload document list - todo: could just update docRefs - but this does prove a successful save...
                            clinicalViewerSvc.getDocumentsForPatient(vo.patient).then(
                                function (docRefs) {
                                    $scope.docRefs = docRefs
                                   // console.log(docRefs)
                                }, function (err) {
                                    //what to do?
                                }
                            )


                        }, function (err) {
                            alert(angular.toJson(err.data))
                            console.log(err)
                        }
                    )
                }

            }


            //for the selected SR, find the DR (if any). There should only be 1 as it is updated for DR updates
            //then, create an array of versions so that we can display the reports and previous versions
            $scope.getDR = function(){
                //locate the DR (only 1)
                $scope.allResourcesForSR.entry.forEach(function (entry) {
                    let resource = entry.resource
                    if (resource.resourceType == 'DiagnosticReport') {
                        //now, get all the versions of this resource
                        let url = `DiagnosticReport/${resource.id}/_history`
                        let encodedQry = encodeURIComponent(url)
                        $http.get(`/proxy?qry=${encodedQry}`).then(
                            function (data) {
                                console.log(data.data)
                                $scope.DRhistory = data.data    //a bundle containing all the DR versions
                            }, function(err) {

                            })
                    }

                })
            }

            // a specific version of a DR
            $scope.selectDRVersion = function(DR) {
                $scope.selectedDRVersion = DR
                $scope.reportObject = {DR:DR,observations:[]}


                //create the query that will return the Observations references by this version of the DR (If any).
                //this will have all the observation id's
                //we can't use _include as it's not version aware

                if (DR.result && DR.result.length > 0) {  //shouldn't ever be an empty array...
                    let qry = "Observation?_id="
                    DR.result.forEach(function (ref) {
                        let ar = ref.reference.split('/')
                        qry += ar[ar.length-1] + ","
                    })

                    let encodedQry = encodeURIComponent(qry)
                    $http.get(`/proxy?qry=${encodedQry}`).then(
                        function (data) {
                            console.log(data.data)
                            //$scope.DRhistory = data.data    //a bundle containing all the DR versions
                            //generate the report object needed by the reportdisplay directive

                            data.data.entry.forEach(function (entry) {
                                $scope.reportObject.observations.push(entry.resource)
                            })

                        }, function(err) {

                        })

                }






            }

            $scope.selectSR = function (SR) {
                //get all the resources associated with a SR based on provenance resources
                //This is a complex set of queries as we want all associated resources. There are simpler ways of getting specific resources
                //and even these queries cold probably be simplified (eg the Provenance resources could use _revincldue...
                //todo - move to service

                delete $scope.DRhistory
                delete $scope.reportObject
                delete $scope.selectedDRVersion

                $scope.selectedSR = SR


                let bundle
                //supportingInfo is a custom operation
                //First, retrieve the ServiceRequest, QR, subject & requester
                let url1 = `ServiceRequest?_id=${SR.id}&_include=ServiceRequest:supportingInfo&_include=ServiceRequest:subject&_include=ServiceRequest:requester`

                let encodedQry = encodeURIComponent(url1)
                $http.get(`/proxy?qry=${encodedQry}`).then(

                    function (data) {
                        //console.log(data)
                        bundle = data.data
                        bundle.entry = bundle.entry || []
                        //get the QR so we can render the form
                        bundle.entry.forEach(function (entry) {
                            if (entry.resource.resourceType == 'QuestionnaireResponse') {
                                $scope.QR = entry.resource
                            }
                        })
                        //todo - shouldn't this go to the proxy as well?

                        //Now, retrieve the any DR associated with this SR, and the results associated with the DR
                        let url2 = `${$scope.config.SERVERBASE}DiagnosticReport?based-on=ServiceRequest/${SR.id}&_include=DiagnosticReport:result`
                        $http.get(url2).then(
                            function (data) {
                                if (data.data && data.data.entry) {
                                    data.data.entry.forEach(function (entry) {
                                        bundle.entry.push(entry)
                                    })
                                }

                                //Finally retrieve the Proveenance resource/s
                                let url2 = encodeURIComponent(`Provenance?entity=${SR.id}&_include=Provenance:target`)
                                $http.get(`/proxy?qry=${url2}`).then(
                                    function (data) {
                                        //console.log(data)
                                        if (data.data && data.data.entry) {
                                            data.data.entry.forEach(function (entry) {
                                                bundle.entry.push(entry)
                                            })
                                        }

                                        //we're getting duplicated respurces from the queries so only add 1. This is not a version thing...
                                        let hash={}
                                        $scope.allResourcesForSR = {resourceType:"Bundle",type:"collection",entry:[]}
                                        bundle.entry.forEach(function (entry) {
                                            let key = `${entry.resource.resourceType}/${entry.resource.id}`
                                            if (! hash[key]) {
                                                hash[key] = true
                                                $scope.allResourcesForSR.entry.push(entry)
                                            }


                                        })
                                        //find the DR in the bundle and then get all versions of it. Used for displaying the report & versions
                                        $scope.getDR()

                                        //$scope.allResourcesForSR = bundle




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

            $scope.findPatientByIdentifierDEP = function(identifier) {
                clinicalViewerSvc.findPatientByIdentifier(identifier).then(
                    function (patient) {
                        $scope.selectPatient({patient:patient})
                    }, function (err) {
                        console.log(err)
                    }
                )
            }

            $scope.selectPatient = function (vo) {
                let patient = vo.patient
                $scope.selectedPatient = vo.patient

                clinicalViewerSvc.getDocumentsForPatient(vo.patient).then(
                    function (docRefs) {
                        $scope.docRefs = docRefs
                        console.log(docRefs)
                    }, function (err) {
                        //what to do?
                    }
                )

                // get all the medications data for the patient.
                //todo ?add a date filter
                getMedications(patient)

                //get all the Episodes of care
                getEOC(patient)

                //get all the SR for this patient
                commonSvc.getSRForPatient(patient.id).then(
                    function (bundle) {
                        $scope.bundleSR = bundle
                        //console.log(bundle)
                    }
                )

            }

            //select a single document reference
            $scope.selectDR = function (DR) {
                $scope.selectedDR = DR
                //retrieve the document/s associated with this DR
                clinicalViewerSvc.getDRDocuments(DR).then(
                    function (data) {
                        //right now, this will be an array of QR but there should be onlu 1
                        //todo eventually will need to accomodate multiple docs and different types
                        $scope.QRfromDR = data[0]
                    },function (err) {
                        console.log(err)
                    }
                )

            }

            //get all the regimen careplans for a patient
            function getRegimensDEP(patient)  {
                let ar = [`CarePlan?category=${patient.id}&category=regimenCP`]
                $http.post('multiquery',ar).then(
                    function (data) {

                        $scope.regimens = data.data
                        //console.log(data.data)
                    }, function (err) {
                        console.log(err.data)
                    }
                )
            }



            //get all the data associated with a regimenCP
            function getActNowDataDEP(careplan) {
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

            function getEOC(patient) {
                //get the episodes of care for a patient
                delete $scope.eoc
                let ar = []

                ar.push(`EpisodeOfCare?patient=${$scope.selectedPatient.id}`)
                $http.post('multiquery',ar).then(
                    function (data) {
                        console.log(data.data)
                        $scope.eoc = data.data
                        console.log($scope.allMeds)
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