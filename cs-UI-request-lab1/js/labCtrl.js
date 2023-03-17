angular.module("pocApp")
    .controller('labCtrl',
        function ($scope,$http,commonSvc,labSvc) {

            $scope.input = {};
            $scope.answer = {};     //the answers. keyed by linkId.
            $scope.commonSvc = commonSvc


            commonSvc.init().then(
                function(data){
                    $scope.config = data


                })

            //called when there is any change in the form
            $scope.$on('qrCreated',function(event,vo1) {

                $scope.createdQR = vo1.QR   //used for the preview tab
                //$scope.formData = vo1.formData
                //$scope.hashItem = vo1.hashItem
                console.log(vo1)

                makeReport(vo1.QR, $scope.selectedRequest, $scope.selectedReportQ)  //sets $scope.reportBundle

            })

            $scope.validate = function() {
                $http.post('/lab/validate',$scope.reportBundle).then(
                    function(data) {
                        let oo = data.data
                        let vo1 = commonSvc.summarizeValidation(oo,$scope.reportBundle)
                        $scope.labValidationObject = vo1.resources
                        $scope.labValidationErrorCount = vo1.totalErrors
                        $scope.labValidationUnknownIssues = vo1.unknownIssues

                    }
                )
            }

                //load the list of possible report templates (questionnaires)
            //returns bundle of Q
            $http.get("/lab/templates").then(
                function(data) {
                    //returns a bundle in data.data
                    //copy into a simpler structure for ease of handling
                    $scope.templates = []
                    data.data.entry.forEach(function (entry) {
                        $scope.templates.push({display:entry.resource.title,Q:entry.resource})
                    })

                }, function(err) {
                    console.log(err)
                }
            )

            //this goes to the local supporting server which queries the FHIR server
            //in practice the lab will query based on identifier rather than a request like this one
            //but will still use the custom operation
            $scope.getActiveRequests = function() {
                let url = `/lab/activeSR`
                $http.get(url).then(
                    function(data) {
                        //returns an array of custom objects - {pat: , sr:}
                        $scope.activeRequests = data.data   // {SR:{}, QR: Pat: others:[]

                    }, function (err) {
                        console.log(err)
                    }
                )
            }

            //retrieve all the active SRs
            $scope.getActiveRequests()

            //select the report template. This is used to generate the UI and report.
            //Note that unlike the requester, a QR is not submitted to the server - it's a DR / Observations combo. Of course
            //if a commercial Q based forms app were to be used, then a QR would be generated. The lab would then need
            //to create the DR/Obs from the QR.
            $scope.selectQ = function(template) {
                $scope.selectedReportQ = template.Q
                //let formTemplate = commonSvc.parseQ(template.Q)     //the actual data source for the rendered form
                //console.log(formTemplate)
                //$scope.selectedForm = formTemplate

                //now create the relationship between the item.code and linkId in the Q. This is needed
                //as the Observations that will be generated will use the code from the item...

                $scope.hashLinkIdCodes = labSvc.getCodingForLinkId($scope.selectedReportQ)



                console.log($scope.hashLinkIdCodes)


            }

            //this is emitted by the form template - formDisplay.html
            $scope.formUpdated = function () {

                //a QR is generated so that os can be shown in UI as the report is created. The QR itself
                //is not sent to the server - a DR/Observations is...
                $scope.reportQR = commonSvc.makeQR($scope.selectedReportQ,$scope.answer);

            }


            //when a previous report is selected for display...
            $scope.selectPreviousReport = function(report) {
                $scope.selectedReportObject = report
            }

            //a single request object {pat:, sr:} is selected.
            //retrieve the details for that sr

            $scope.selectRequest = function(request) {
                if (request && request.sr && request.sr.identifier) {
                    let srIdentifier = request.sr.identifier[0].value
                    //returns an object {sr:, qr:}
                    let qry = `/lab/SRDetails?identifier=${srIdentifier}`
                    $http.get(qry).then(
                        function(data) {
                            console.log(data.data)
                            let vo = data.data
                            $scope.selectedRequest = vo
                        },
                        function(err) {
                            console.log(err.data)
                        }
                    )
                }

            }

            //generate the report bundle from the QR and the currrent reques object ({pat:, sr:, qr:}
            let makeReport = function(QR,request,reportQ) {
                $scope.reportBundle = labSvc.makeReport(QR, request,reportQ)
                console.log($scope.reportBundle)
            }

            //create a set of DR / Obs and send to the CS Server
            $scope.submitReport = function() {
                //assume that the Patient resource (from the CS server). For now, we won't include the Patient resource - could potentially add the identifier to the reference as well, not sure why...
                //in the bundle, but will include a reference and NHI from all the resources
                //assume that there is only a single answer per item - no multiples...

                if (! confirm("Are you sure you wish to submit this report")) {
                    return
                }

                //All


                //finally, we can send the report to the CS Server

                $http.post("/lab/submitreport",$scope.reportBundle).then(
                    function(data){
                        //alert("Report has been submitted")

                        $scope.submissionOO = data.data

                        $scope.getActiveRequests()
                        console.log(data)


                    }, function(err) {
                        console.log(err)
                        alert("There was an error: " + angular.toJson(err.data))
                    }
                )

            }




        })