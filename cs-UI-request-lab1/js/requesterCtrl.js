angular.module("pocApp")
    .controller('requesterCtrl',
        function ($scope,$http,commonSvc) {

            $scope.input = {};
            $scope.commonSvc = commonSvc
            $scope.answer = {}      //will have the form data

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


            //when a form is being created, the QR representing that form is generated immediately. However, as
            //this is in a directlve, the scopes are complicated to to simplify things the QR is emitted by the
            //directive so that it can be captured and ultimately sent to the server. This process happens
            //as soon as any change in the form is made (using ng-change)
            $scope.$on('qrCreated',function(event,data){
                $scope.createdQR = data
                makeBundle()
                //console.log(data)
            })


            //load the list of possible report templates (questionnaires)
            $http.get("/requester/templates").then(
                function(data) {
                    //returns a bundle in data.data
                    //copy into a simpler structure for ease of handling
                    $scope.templates = []
                    data.data.entry.forEach(function (entry) {
                        $scope.templates.push({display:entry.resource.title,Q:entry.resource})
                    })

                    $scope.selectedTemplate = $scope.templates[0]
                    $scope.selectQ($scope.selectedTemplate)
                }, function(err) {
                    console.log(err)
                }
            )

            //this is emitted by the form template - formDisplay.html
            $scope.formUpdatedDEP = function () {

                $scope.QR = commonSvc.makeQR($scope.selectedQ,$scope.answer);
                $scope.QR.subject = {reference:`urn:uuid:${$scope.selectedPatient.id}`}
                $scope.QR.identifier = [{system:"http://canshare.co.nz/identifier",value: new Date().toISOString()}]

                //todo this is only needed for the text display. Should it change?
                $scope.selectedQR = $scope.QR
                $scope.SR = makeSR()

                console.log($scope.QR)
                makeBundle()

            }



            //When a patient is selected, get the previous SR's
            $scope.selectPatient = function (vo) {
                let patient = vo.patient
                //There really should be an NHI. Will remove this eventually.
                if (! patient.identifier) {
                    patient.identifier = [{system:"http://canshare.co.nz/identifier/bundle",value:new Date().toISOString()}]
                }


                $scope.selectedPatient = patient

                //even though we know the patient id, we'll still use a conditional update as new patients won't have an id...
                $scope.selectedPatient.id = commonSvc.createUUID()

                let identifierQuery = `${patient.identifier[0].system}|${patient.identifier[0].value}`

                //load ServiceRequests via the server proxy

                let qry = encodeURIComponent(`ServiceRequest?subject.identifier=${identifierQuery}`)
                $http.get(`/proxy?qry=${qry}`).then(
                    function (data) {
                        $scope.allSRonePatient = data.data
                        console.log($scope.allSRonePatient)
                    }
                )



            }

            //a historical SR is selected. Get all the details and display it.
            $scope.selectHistoricalSR = function(SR){
                $scope.selectedSR = SR

                commonSvc.retrieveSRandDetails(SR).then(
                    function(vo) {
                        console.log(vo)
                        $scope.selectedQR = vo.QR           //the QR associated with this SR

                        //$scope.selectedDRobject = vo.DRobject  //temp

                        $scope.selectedReportObject = vo.DRobject       //the DR and associated observations associated with this R (if any)
                    }
                )

            }

            //select the request form
            $scope.selectQ = function(template) {

                //clear any previous form


                $scope.selectedQ = template.Q
                let formTemplate = commonSvc.parseQ(template.Q)     //the actual data source for the rendered form
                console.log(formTemplate)
                $scope.selectedForm = formTemplate

                /* not sure this is needed nere
                //now create the relationship between the item.code and linkId in the Q. This is needed
                //as the Observations that will be generated will use the code from the item...
                //This code is simle, and assumes that the Q has 2 level structure of Sections / items. It will need to be
                //revised if that changes...

                $scope.hashLinkIdCodes = {}
                $scope.selectedQ.item.forEach(function (sectionItem) {
                    sectionItem.item.forEach(function (item) {
                        $scope.hashLinkIdCodes[item.linkId] = item.code         //note this is a Coding dt

                    })
                })
                */
            }

            $scope.submitRequest = function () {
                if (confirm("Are you sure you wish to send this request?")) {
                    delete $scope.submitStatus
                    let bundle = makeBundle()   //create the transaction bundle
                    delete $scope.oo
                    let url = "/requester/makerequest"

                    $http.post(url,bundle).then(
                        function(data){
                            //console.log(data)
                            $scope.submitStatus = "pass"
                            $scope.oo = data.data    //temp

                            // - need to keep this to see the message after submission delete $scope.selectedPatient
                            delete $scope.selectedSR
                            delete $scope.selectedQR
                            delete $scope.selectedReportObject

                            $scope.answer = {}



                        }, function(err) {
                            //the response should be a OO explaining the error
                            $scope.submitStatus = "fail"
                            $scope.oo = err.data
                            console.log(err)
                        }
                    )
                }

            }


            //create the transaction bundle containing Patient, QR & SR. todo Others (like Practitoioner, Organization) to be added
            function makeBundle() {

                //first, add the references to the QR (at this point it only has direct data like items & Q url
                let QR = $scope.createdQR       //this is
                QR.subject = {reference : `urn:uuid:${$scope.selectedPatient.id}`}
                QR.identifier = [{system:'http://canshare.co.nz/NamingSystem/pathIdentifier',value: new Date().toISOString()}]

                let SR = makeSR()   //create the service request. it will have a reference to the QR
                $scope.createdSR = SR   //just for the display
                let bundle = {"resourceType":"Bundle",type:'transaction',entry:[]}
                bundle.identifier = {system:"http://canshare.co.nz/identifier/bundle",value:new Date().toISOString()}

                addEntry(bundle,$scope.selectedPatient)     //this will have the NHI as the identifer
                addEntry(bundle,QR)           //thus
                addEntry(bundle,SR)
                $scope.bundle = bundle
                return bundle
            }

            //add the resource as an entry to the bundle. Assume id is a UUID. Always conditional update.
            function addEntry(bundle,resource) {

                if (! resource.identifier) {
                    alert("The " + resource.resourceType + " resource has no identifier")
                    return
                }

                let entry = {fullUrl:`urn:uuid:${resource.id}`,resource:resource,request:{}}
                entry.request.method = "PUT"
                let identifierString = `${resource.identifier[0].system}|${resource.identifier[0].value}`
                entry.request.url = `${resource.resourceType}?identifier=${identifierString}`
                bundle.entry.push(entry)
            }


            //create the ServiceRequest
            function makeSR() {
                let sr = {resourceType:"ServiceRequest",id:commonSvc.createUUID(),status:"active",intent:"order"}
                sr.authoredOn = new Date().toISOString()
                sr.code = {text:"Histology request"}
                sr.category = [{text:"CS order"}]
                sr.subject = {reference:`urn:uuid:${$scope.selectedPatient.id}`}
                sr.identifier = [{system:"http://canshare.co.nz/identifier",value: new Date().toISOString()}]
                sr.supportingInfo = [{reference:"urn:uuid:"+$scope.createdQR.id}]
                return sr
            }

        })