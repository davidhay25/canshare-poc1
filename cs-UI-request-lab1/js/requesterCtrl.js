angular.module("pocApp")
    .controller('requesterCtrl',
        function ($scope,$http,commonSvc,graphSvc,questionnaireSvc,renderFormsSvc) {

            $scope.input = {};
            $scope.commonSvc = commonSvc
            $scope.answer = {}      //will have the form data
            $scope.input.showHelp = false

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

            //create the author resource. The identifier (HPI) is required
            $scope.author = {resourceType:"Practitioner", name:[{text:"Sally Surgeon"}]}
            $scope.author.id = commonSvc.createUUID()
            $scope.author.identifier = [{system:"http://canshare.co.nz/ns",value:"ABC1234"}]

            //the options for the fhir display
            $scope.fhirDisplayOptions = []
            $scope.fhirDisplayOptions.push({code:'extract',display:'Test extraction'})
            //$scope.fhirDisplayOptions.push({code:'validate',display:'Validate bundle'})
            $scope.fhirDisplayOptions.push({code:'text',display:'Request text'})


            $scope.fhirDisplayOptions.push({code:'bundle',display:'Submission bundle'})
            $scope.fhirDisplayOptions.push({code:'Q',display:'Questionnaire'})
            //$scope.fhirDisplayOptions.push({code:'patient',display:'Patient'})
            $scope.fhirDisplayOptions.push({code:'QR',display:'QuestionnaireResponse'})
            //$scope.fhirDisplayOptions.push({code:'SR',display:'ServiceRequest'})



            $scope.input.selectedFhirDisplayOption = 'extract'

            //when a form is being created, the QR representing that form is generated immediately. However, as
            //this is in a directive, the scopes are complicated to to simplify things the QR is emitted by the
            //directive so that it can be captured and ultimately sent to the server. This process happens
            //as soon as any change in the form is made (using ng-change) - so it gets called a lot!

            $scope.$on('qrCreated',function(event,vo1){

                $scope.createdQR = vo1.QR
                $scope.formData = vo1.formData
                $scope.hashItem = vo1.hashItem


/* don't create these views. Leave the code in until I'm sure...
                //create the text treeview of the QR
                let qrTextTreeData = questionnaireSvc.buildResourceTree(data)
                console.log(qrTextTreeData)

                //redraw the qrTextTree. This may have too much overhead - may need to have refresh or 'onopen' in the tree tab...
                drawQrTextTree(qrTextTreeData)
*/
                //now create the jstree - May remove this
                let vo = questionnaireSvc.makeTreeFromQr($scope.createdQR,$scope.selectedQ)
                console.log(vo)
                drawQrTree(vo.treeData)

                //now the QR summary
                $scope.QRSummary = questionnaireSvc.makeQrSummary($scope.createdQR,$scope.selectedQ)
                console.log($scope.QRSummary)

                //add the author to the QR. (it also gets added to the SR)
                $scope.createdQR.author = {reference:`urn:uuid:${$scope.author.id}`}
                makeBundle()
                //console.log(data)
            })


            //call the 'test extraction' endpoint to return the extracted resources
            $scope.testExtraction = function () {
                let bundle = makeBundle()
                delete $scope.testExtractionResult
                $http.post("/requester/extract",bundle).then(
                    function (data) {
                        let vo = data.data

                        $scope.testExtractionResult = vo.bundle
                        $scope.testExtractionOO = vo.oo

                        let vo1 = commonSvc.summarizeValidation(vo.oo,vo.bundle)
                        $scope.extractionValidationObject = vo1.resources
                        $scope.extractionValidationErrorCount = vo1.totalErrors
                        createGraph($scope.testExtractionResult)

                        console.log(vo)
                    }, function (err) {
                        $scope.testExtractionResult = err.data
                        console.log(err.data)
                    }
                )
            }

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

            $scope.expandVS = function (url,filterText) {

                renderFormsSvc.expandVS(url,filterText).then(
                    function (vs) {
                        $scope.expandedVS = vs
                    }, function (err) {
                        console.log(err)
                    }
                )


            }

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

                $scope.selectedQ = template.Q
                let formTemplate = commonSvc.parseQ(template.Q)     //the actual data source for the rendered form
                console.log(formTemplate)
                $scope.selectedForm = formTemplate


                //generate the tree view of the Questionnaire
                let vo = questionnaireSvc.makeTreeFromQ($scope.selectedQ)

                //show sections
                vo.treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })

                drawTree(vo.treeData)       //for drawing the tree


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



            //call the validate endpoint on the local server (that serves this site)
            $scope.validateQR = function(resource) {
                delete $scope.QRValidationResult

                let url = "/requester/validate"
                $http.post(url,resource).then(
                    function(data){
                        $scope.QRValidationResult = data.data

                    }
                )
            }

            $scope.submitRequest = function () {
                if (confirm("Are you sure you wish to send this request?")) {
                    delete $scope.QRValidationResult
                    //perform validation of the QR
                    let validateUrl = "/requester/validate"
                    $http.post(validateUrl,$scope.createdQR).then(
                        function(data){
                            let QRValidationResult = data.data
                            if (QRValidationResult && QRValidationResult.issue) {
                                let cntErrors = 0
                                QRValidationResult.issue.forEach(function (iss) {
                                    if (iss.severity == 'error') {
                                        cntErrors ++
                                    }
                                })
                                if (cntErrors > 0) {
                                    $scope.QRValidationResult = data.data
                                    alert(`There were ${cntErrors} error/s. Details in the technical function tab, under QR.`)
                                    return
                                }
                            }
                            sendBundle()

                        }
                    )

                    function sendBundle() {
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

            }


            //create the transaction bundle containing Patient, QR & SR. todo Others (like Practitoioner, Organization) to be added
            function makeBundle() {

                //first, add the references to the QR (at this point it only has direct data like items & Q url
                let QR = $scope.createdQR       //this is
                if (!QR) {
                    alert ("You need to enter some data in the form")
                }
                QR.subject = {reference : `urn:uuid:${$scope.selectedPatient.id}`}
                //QR identifier is single
                QR.identifier = {system:'http://canshare.co.nz/NamingSystem/pathIdentifier',value: new Date().toISOString()}

                let SR = makeSR()   //create the service request. it will have a reference to the QR & author
                $scope.createdSR = SR   //just for the display
                let bundle = {"resourceType":"Bundle",type:'transaction',entry:[]}
                bundle.identifier = {system:"http://canshare.co.nz/identifier/bundle",value:new Date().toISOString()}

                addEntry(bundle,$scope.selectedPatient)     //this will have the NHI as the identifer
                addEntry(bundle,QR)           //thus
                addEntry(bundle,SR)
                addEntry(bundle,$scope.author)
                $scope.bundle = bundle
                //console.log(JSON.stringify(bundle))
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

                //The identifier can be single (QR) or multiple (most others)
                //If there is no identifier, the conditional update will still be there, but the resource will be rejected by the
                //custom operation. todo should we not sent at all?
                let identifierString = "unknown"
                if (resource.identifier) {
                    if (Array.isArray(resource.identifier)){
                        identifierString = `${resource.identifier[0].system}|${resource.identifier[0].value}`
                    } else {
                        identifierString = `${resource.identifier.system}|${resource.identifier.value}`
                    }
                }


                entry.request.url = `${resource.resourceType}?identifier=${identifierString}`
                bundle.entry.push(entry)
            }


            //create the ServiceRequest
            function makeSR() {
                let sr = {resourceType:"ServiceRequest",id:commonSvc.createUUID(),status:"active",intent:"order"}
                sr.authoredOn = new Date().toISOString()
                sr.code = {text:"Histology request"}
                sr.category = [{text:"CS order"}]
                sr.author = {reference:`urn:uuid:${$scope.author.id}`}
                sr.subject = {reference:`urn:uuid:${$scope.selectedPatient.id}`}
                sr.identifier = [{system:"http://canshare.co.nz/identifier",value: new Date().toISOString()}]
                sr.supportingInfo = [{reference:"urn:uuid:"+$scope.createdQR.id}]
                return sr
            }


            function createGraph(bundle) {
                let arResources = []
                bundle.entry.forEach(function (entry) {
                    arResources.push(entry.resource)
                })
                let vo = graphSvc.makeGraph({arResources: arResources})  //actually entries...

                let container = document.getElementById('graph');
                let graphOptions = {
                    physics: {
                        enabled: true,
                        barnesHut: {
                            gravitationalConstant: -10000,
                        }
                    }
                };
                $scope.chart = new vis.Network(container, vo.graphData, graphOptions);

                //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                $scope.chart.on("stabilizationIterationsDone", function () {

                    $scope.chart.setOptions( { physics: false } );
                });

                $scope.chart.on("click", function (obj) {
                    delete $scope.selectedResourceFromGraph
                    let nodeId = obj.nodes[0];  //get the first node
                    let node = vo.graphData.nodes.get(nodeId);

                    if (node.data && node.data.resource) {
                        $scope.selectedResourceFromGraph = node.data.resource;
                        $scope.$digest()
                    }



                })

            }

            let drawQrTree = function(treeData) {
                $('#qrTree').jstree('destroy');

                let x = $('#qrTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //when an item is selected...

                    if (data.node) {
                        $scope.selectedQRTreeNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })

            }

            //draw the textual version of the QR tree
            let drawQrTextTree= function(treeData){
                treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })

                $('#qrTextTree').jstree('destroy');

                let x = $('#qrTextTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //Not actually using this event ATM

                    if (data.node) {
                        $scope.selectedQRTextTreeNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })

            }
            //draw the Q tree
            let drawTree = function(treeData){
                //console.log(treeData)
                treeData.forEach(function (item) {
                    item.state.opened = true
                    if (item.parent == 'root') {
                        item.state.opened = false;
                    }
                })

                $('#designTree').jstree('destroy');

                let x = $('#designTree').jstree(
                    {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedTreeNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                })


            }




        })