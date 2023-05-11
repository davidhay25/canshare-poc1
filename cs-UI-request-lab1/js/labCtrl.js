angular.module("pocApp")
    .controller('labCtrl',
        function ($scope,$http,commonSvc,labSvc,$location) {

            let protocol = $location.protocol();
            let port = $location.port();

            $scope.host = protocol + "://" + $location.host()
            if (port != 80) {
                $scope.host += ":" + port
            }


            $scope.input = {};
            $scope.answer = {};     //the answers. keyed by linkId.
            $scope.commonSvc = commonSvc

            //$scope.prePopData = {"test":"test"}      //trial...

            //    $scope.bvUrl = $location.protocol() + "://" + $location.host() + ":" + $location.port() +  "/bundleVisualizer.html"

            commonSvc.init().then(
                function(data){
                    $scope.config = data
                })


            $scope.toggleRequestDisplay = function() {
                if ($scope.requestShowing) {
                    $scope.input.leftPane = "hide"
                    $scope.input.rightPane = "col-md-12"
                } else {
                    $scope.input.leftPane = "col-md-4"
                    $scope.input.rightPane = "col-md-8"

                }

                $scope.requestShowing = ! $scope.requestShowing
            }
            $scope.toggleRequestDisplay()

            $scope.submitLabel = function() {
                if ($scope.input.final) {

                    return "Submit final report"
                } else {
                    return "Submit draft report"
                }
            }

            //emitted when a user clicks on the ? icon in the form render
            $scope.$on("itemDetail",function(ev,vo){
                $scope.input.itemDetail = vo
                //console.log(vo)
                //{item: meta:
            })

            //called when there is any change in the form
            $scope.$on('qrCreated',function(event,vo1) {

                delete $scope.input.itemDetail        //delete the item display as soon as typing or clicking starts...

                $scope.createdQR = vo1.QR   //used for the preview tab
                //$scope.formData = vo1.formData
                //$scope.hashItem = vo1.hashItem
              //  console.log(vo1)

                makeReport($scope.createdQR, $scope.selectedRequest, $scope.selectedReportQ)  //sets $scope.reportBundle

            })

            //validate the report bundle
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
                $scope.selectedReportQ = template.Q                     //this is the bound variable for the <renderform> directive
                //let formTemplate = commonSvc.parseQ(template.Q)     //the actual data source for the rendered form
                //console.log(formTemplate)
                //$scope.selectedForm = formTemplate

                //now create the relationship between the item.code and linkId in the Q. This is needed
                //as the Observations that will be generated will use the code from the item...

                $scope.hashLinkIdCodes = labSvc.getCodingForLinkId($scope.selectedReportQ)  //note these are CC


                //This is an array of observations created by the requester. Use the data in these obs
                //to set the initial values on the Q. This only works where the Q.item.code is set as that is the link to obs.code
                if ($scope.selectedRequest.qrobs) {
                    labSvc.setInitialQValuesFromObs(template.Q,$scope.selectedRequest.qrobs)
                }


                commonSvc.populate(template.Q,$scope.selectedRequest.pat,$scope.selectedRequest.qr)


                //console.log($scope.hashLinkIdCodes)


            }

            //this is emitted by the form template - formDisplay.html
            $scope.formUpdatedDEP = function () {

                //a QR is generated so that os can be shown in UI as the report is created. The QR itself
                //is not sent to the server - a DR/Observations is...
                $scope.reportQR = commonSvc.makeQR($scope.selectedReportQ,$scope.answer);

            }


            //when a previous report is selected for display...
            $scope.selectPreviousReportDEP = function(report) {
                $scope.selectedReportObject = report
            }

            //a single request object {pat:, sr:} is selected.
            //retrieve the details for that sr from a lab specific call - ie to the lab server which then queries cansahre thru fhir
            $scope.selectRequest = function(request) {
                if (request && request.sr && request.sr.identifier) {
                    let srIdentifier = request.sr.identifier[0].value
                    //returns an object {pat:, sr:, qr:, dr:, qrobs, obs:}
                    //dr (DiagnosticReport) and obs will be populated if there was an interim report that is being updated.

                    let qry = `/lab/SRDetails?identifier=${srIdentifier}`
                    $http.get(qry).then(
                        function(data) {
                            console.log(data.data)
                            let vo = data.data
                            $scope.selectedRequest = vo



                            $scope.hashAllData = commonSvc.allQRData(vo.qr)
                            console.log($scope.hashAllData)

                            //A link to display the clincial viewer for the patient
                            $scope.pathToClinicalViewer = $scope.host + "/clinicalViewer.html?nhi=" + vo.pat.identifier[0].value

                            //an object containing an array of all the answers is saved in the second attachment and the url of the form
                            try {
                                if (vo.dr && vo.dr.presentedForm && vo.dr.presentedForm.length >= 2) {

                                    let vo1 = angular.fromJson(atob(vo.dr.presentedForm[1].data))

                                    $scope.prePopData = vo1.data  //todo - don't think this is being used

                                    //now locate the template in $scope.templates
                                    for (const template of $scope.templates) {
                                   // $scope.templates.forEach(function (template) {
                                        if (template.Q.url == vo1.url) {

                                            //so we've found the template. If we update the .initial values, then the values
                                            //will be displayed in the form


                                            //vo1.data is a hash of data by linkid from data previously entered and saved in the DR
                                            //ie it will only be populated when a form is being updated
                                            //this approach is really only suitable in this implementation - other will likely store this data separately
                                            if (vo1.data) {
                                                labSvc.setInitialQValuesFromHash(template.Q,vo1.data)
                                            }


                                            $scope.selectedTemplate = template   //set the selected template.
                                            $scope.selectQ(template)        //select the template

                                            break
                                        }

                                    }


                                 //   console.log($scope.prePopData)
                                }
                            } catch(ex) {
                                console.log("Error getting previous values",ex)
                            }



/*
                            //create a pre-pop object from the Observations. Limited for now, just to show how it might work...
                            $scope.prePopData = {}
                            if (request.obs) {
                                request.obs.forEach(function (obs) {

                                })
                            }

*/

                            //$scope.prePopData = {"updated":"updated"}

                            //todo - if observations were returned, we can pre-populate the form...
                        },
                        function(err) {
                            console.log(err.data)
                        }
                    )
                }

            }

            //generate the report bundle from the QR and the currrent reques object ({pat:, sr:, qr:, comp:}
            let makeReport = function(QR,request,reportQ) {
                let status = 'preliminary'
                if ($scope.input.final) {
                    status = 'final'
                }

                //todo add any previous DR / Obs - set their status to 'cancelled'. A smarter implementation could update them...
                //if the status is not final, then don't update the SR

                $scope.reportBundle = labSvc.makeReport(QR, request, reportQ, status)

            }

            //create a set of DR / Obs and send to the CS Server
            $scope.submitReport = function() {

                //assume that there is only a single answer per item - no multiples...

                if (! confirm("Are you sure you wish to submit this report")) {
                    return
                }
                //make the report again (in case the status was changed after the form was created. sets $scope.reportBundle
                makeReport($scope.createdQR, $scope.selectedRequest, $scope.selectedReportQ)

                //This is going to the 'local' server, which will send it in turn to the custom operation
                $http.post("/lab/submitreport",$scope.reportBundle).then(
                    function(data){
                        //alert("Report has been submitted")


                        $scope.submissionOO = data.data



                        $scope.getActiveRequests()
                        console.log(data)


                    }, function(err) {
                        $scope.errorOO = err.data
                        console.log(err)
                       // alert("There was an error: " + angular.toJson(err.data))
                    }
                )

            }




        })