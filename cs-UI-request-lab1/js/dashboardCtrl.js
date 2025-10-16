angular.module("pocApp")
    .controller('dashboardCtrl',
        function ($scope,$http,dashboardSvc,$location,$uibModal) {


            let protocol = $location.protocol();
            let port = $location.port();

            $scope.host = protocol + "://" + $location.host()
            if (port != 80) {
                $scope.host += ":" + port
            }

            console.log($scope.host)

            $scope.treeReviewQR = {}

            $scope.input = {}

            $scope.formData = {}

            $scope.arQContext = ['report','request','general']

            let getContext = function (Q) {
                //returns the context object that corresponds to the vcanshare type
                let context
                if (Q.useContext) {
                    Q.useContext.forEach(function (uc) {
                        if (uc.code) {


                            if (uc.code.system == 'http://terminology.hl7.org/CodeSystem/usage-context-type' && uc.code.code == "focus") {
                                context = uc
                            }
                        }
                    })
                }
                return context
            }

            $scope.setContext = function (ctxString) {
                //set the Q context (in the cleanQ copy). Not all Q's in the designer will have that set.
                //this is only called if there isn't already a context - ie only when it is missing so we can safely add it without checking for one forst
                //the code and the text are the same ATM
                $scope.cleanQ.useContext = $scope.cleanQ.useContext || []
                let ctx = {code:{system:"http://terminology.hl7.org/CodeSystem/usage-context-type",code:"focus"}}
                ctx.valueCodeableConcept = {coding:[{system:"http://canshare.co.nz/fhir/CodeSystem/questionnaire-type",code:ctxString}],text:ctxString}
                $scope.cleanQ.useContext.push(ctx)
                $scope.contextString = ctxString
            }


            $scope.mqByTypeDEP = function (type) {
                let ar = []
                $scope.lstFsMiniQ.forEach(function (mq) {
                    ar.push(mq.title)
                })
                return ar
            }


            //get all SR in the 'active' status
            $scope.refreshSR = function () {
                dashboardSvc.getActiveSR().then(
                    function (data) {
                        $scope.activeSR = data
                    }
                )
            }
            $scope.refreshSR()

            //select a single SR vo = {sr: patient: qr:
            $scope.selectVoSR = function(vo) {
                $scope.selectedSR = vo.sr
                $scope.selectedQR = vo.qr
                $scope.selectedSRPatient = vo.patient

                if (vo.patient.identifier) {
                    //really should be at least one...
                    //for now just return the first one - todo check for nhi

                    $scope.pathToClinicalViewer = $scope.host + "/clinicalViewer.html?nhi=" + vo.patient.identifier[0].value
                }

            }

            $scope.copyFormToFormsServer = function (Q) {

                let qry = `/dashboard/Questionnaire`
                $http.put(qry,$scope.cleanQ).then(
                    function (data) {
                        alert("The form has been copied onto the POC Forms server, and is available for use")
                    }, function (err) {
                        alert(angular.toJson(err))
                    }
                )

            }


            $scope.contexts = ["All","Request","Report","General"]

            //selecting whether to show only forms already on the forms server
            $scope.checkBoxChange = function () {
                delete $scope.selectedQfromDesigner
                delete $scope.createdQR
            }

            //filter contents of Q list based on whether to show only those in the Forms Server
            $scope.showInList = function (miniQ) {
                let canShow = true
                //if there's a filter and the name doesn't match then don't show, regardless
                if ($scope.input.filter) {
                    if (miniQ.name.toLowerCase().indexOf($scope.input.filter.toLowerCase()) == -1) {
                        return false
                    }
                }

                //so it can be shown according to the filter - is the Forrms Server nly flag set?

                if ($scope.input.fsOnly) {
                    if (miniQ.existsOnFormsServer) {
                        return true
                    } else {
                        return false
                    }
                } else {
                    return true
                }



            }

            $scope.analyseRequestReport = function () {
                //generate the table comparing coded items between specific request & report forms
                //todo - could add ViewVS fom here

                dashboardSvc.analyseRequestReport($scope.input.requests,$scope.input.reports).then(
                    function (data) {
                        $scope.codedAnalysis = data
                        $scope.$digest()    //unclear why this is needed
                    }
                )


            }

            $scope.validateSD = function (Q) {
                $scope.SD = dashboardSvc.makeSD(Q)

                $http.post('validateSD',$scope.SD).then(
                    function (data) {
                        console.log(data)
                        $scope.SDOutcome = data.data
                    },function (err) {
                        $scope.SDOutcome = err.data
                        console.log(err)
                    }
                )
            }

            $scope.saveSD = function (Q) {
                $scope.SD = dashboardSvc.makeSD(Q)
                if ($scope.SD) {
                    let qry = `http://hapi.fhir.org/baseR4/StructureDefinition/${$scope.SD.id}`
                    $http.put(qry,$scope.SD).then(
                        function (data) {
                            alert('saved to '+qry)
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

            }


            $scope.makeSD = function (Q) {
                $scope.SD = dashboardSvc.makeSD(Q)
            }

            $scope.selectMiniQ = function (miniQ) {
                $scope.selectedMiniQ = miniQ
                delete $scope.selectedQfromDesigner
                delete $scope.createdQR
                delete $scope.contextString
                delete $scope.input.QContext

                //retrieve  the Q from the designer / public site
                dashboardSvc.getSingleQFromDesigner(miniQ).then(
                    function (Q) {
                        $scope.selectedQfromDesigner = Q

                        $scope.selectedQfromDesignerTree = angular.copy(Q)

                        //selectedQfromDesigner

                        //get the context of the Q.
                        $scope.contextString = getContext(Q)
                        //remove all the extensions used for hiso
                        let vo = dashboardSvc.cleanQ(Q)
                        $scope.cleanQ = vo.Q  //dashboardSvc.cleanQ(Q)
                        $scope.issuesWithQ = vo.issues
                        $scope.summary = vo.summary

                    }, function (err) {
                        console.log(err)
                    }
                )

            }

            //retrieve a mini version of all Q on the Designer
            //first, get a hash containing key data from the forms server, then get a mini version from the designer
            //idea is that we can say which Q are on both (based on the url)

            //maybe - temp function - just while developing fs manager to avoid needing to
            function loadAllMiniQFromFS() {
                dashboardSvc.getQfromFormsServer().then(
                    function (hash) {
                        //returns a hash of urls that are currently on the forms server.
                        //Now create a list that we can sort
                        $scope.lstFsMiniQ = []

                        $scope.allRequests = []      //all requests
                        $scope.hashMQByType = {}

                        Object.keys(hash).forEach(function (key) {
                            let mq = hash[key]
                            let context = $scope.getContext(mq)
                            let item = {miniQ:mq,context:context,title:mq.title || mq.name}
                            $scope.lstFsMiniQ.push(item)

                            $scope.hashMQByType[context] = $scope.hashMQByType[context] || []
                            $scope.hashMQByType[context].push(item)
                            $scope.allRequests.push(item)

                        })

                        $scope.lstFsMiniQ.sort(function (a,b) {
                            if (a.title > b.title ) {
                                return 1
                            } else { return -1}
                        })
                        $scope.showWaiting = false
                        $scope.formsServerMiniQ = hash
                    })

            }
            loadAllMiniQFromFS()

            $scope.getContext = function (miniQ) {
                //get the context string from a miniQ - used for FormsServer components
                let context = ""
                //retien the use context. assume only 1 with focus
                if (miniQ.useContext) {
                    miniQ.useContext.forEach(function (ctx) {
                        if (ctx.code.code == 'focus') {
                            if (ctx.valueCodeableConcept && ctx.valueCodeableConcept.coding &&  ctx.valueCodeableConcept.coding.length > 0) {
                                context = ctx.valueCodeableConcept.coding[0].code
                            }

                        }

                    })
                }
                return context

            }

            $scope.setQStatus = function (miniQ) {
                //set the status of a miniQ on the forms server

                $uibModal.open({
                    templateUrl: 'modalTemplates/getOption.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: function($scope,title,options,current,description){
                        $scope.input = {}
                        $scope.input.selected = current
                        $scope.title = title
                        $scope.description = description
                        $scope.options = options
                        $scope.select = function () {
                            $scope.$close($scope.input.selected)
                        }
                    },
                    resolve: {
                        title: function () {
                            return "Select status"
                        },
                        description: function () {
                            return "Select the new status. A value of 'Retired' means the form will no longer displayed in the requester, lab or general functions."
                        },
                        current : function () {
                            return miniQ.status
                        },
                        options: function () {
                            let ar = []
                            ar.push({display:'Draft',value:'draft'})
                            ar.push({display:'Active',value:'active'})
                            ar.push({display:'Retired',value:'retired'})


                            return ar
                        }
                    }

                }).result.then(
                    function (newStatus) {

                        console.log(newStatus)

                        if (newStatus !== miniQ.status) {
                            miniQ.status = newStatus
                            dashboardSvc.updateQStatusInFormsServer(miniQ).then(
                                function () {
                                    //the Q has been updated - re-load the list of miniQ
                                    loadAllMiniQFromFS()
                                }, function (err) {
                                    alert(angular.toJson(err))
                                }
                            )
                        }

                    }
                )
            }
            
            $scope.selectQfromFS = async function (miniQ) {
                //get the full Q from the
                // FS

                $scope.selectedMiniQ = miniQ
                $scope.fsFormData = {}
                $scope.fsQR = {}

                $scope.urlToQ = `Questionnaire/${miniQ.id}`

                dashboardSvc.getSingleQFromFormsServer(miniQ).then(function (Q) {
                    $scope.selectedQfromFS = Q
                    $scope.codedElementsInSingleQ = dashboardSvc.getAllCodedElements(Q)
                })

               // let temp = await dashboardSvc.getSingleQFromForsmServer(miniQ)
              //  $scope.selectedQfromFS = temp
                console.log($scope.selectedQfromFS)
            }

            $scope.refreshDesigner = function() {
                $scope.showWaiting = true
                $scope.showLoading = true
                dashboardSvc.getQfromFormsServer().then(        //todo not needed....
                    function (hash){
                        //returns a hash of urls that are currently on the forms server. Now get the Q from the
                        //designer. Pass in the hash so we can mark which are on the forms server
                        console.log(hash)
                        $scope.showWaiting = false

                        $scope.formsServerMiniQ = hash
                        dashboardSvc.getQFromDesigner(hash).then(
                            function (lst) {
                                $scope.allMiniQ = lst
                                $scope.showWaiting = false
                            }
                        ).finally(function () {
                            $scope.showWaiting = false
                            $scope.showLoading = false
                        })



                    })

            }



            function getLogs() {
                let module = 'request'      //todo - support other modules
                $http.get(`telemetry`).then(
                    // $http.get(`/logs/${module}`).then(
                    function (data) {
                        $scope.logs = data.data
                    }, function(err) {
                        console.log(err)
                    }
                )
            }
            getLogs()



        })
