angular.module("pocApp")
    .controller('dashboardCtrl',
        function ($scope,$http,dashboardSvc) {


            $scope.input = {}
            $scope.commands = []
            $scope.commands.push({display:'Update forms from Designer',key:'forms'})
            $scope.commands.push({display:'Manage Forms Server',key:'formserver'})
            $scope.commands.push({display:'Log',key:'log'})

            $scope.input.command = $scope.commands[0]

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



            //when the form is updated. Used by the display form tab
            $scope.$on('qrCreated',function(event,vo1) {
                $scope.createdQR = vo1.QR
            })

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

            $scope.checkBoxChange = function () {
                delete $scope.selectedQfromDesigner
                delete $scope.createdQR
            }

            //filter contents of Q list based on whether to show only those in the Forms Server
            $scope.showInList = function (miniQ) {
                let canShow = true
                //if there's a filter and the name doesn't match then don't show, regardless
                if ($scope.filter) {
                    if (miniQ.name.toLowerCase().indexOf($scope.filter.toLowerCase()) == -1) {
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

                        //get the context of the Q.
                        $scope.contextString = getContext(Q)
                        //remove all the extensions used for hiso
                        $scope.cleanQ = dashboardSvc.cleanQ(Q)

                    }, function (err) {
                        console.log(err)
                    }
                )

            }

            //retrieve a mini version of all Q on the Designer
            //first, get a hash containing key data from the forms server, then get a mini version from the designer
            //idea is that we can say which Q are on both (based on the url)
            $scope.showWaiting = true
            dashboardSvc.getQfromFormsServer().then(
                function (hash){
                    //returns a hash of urls that are currently on the forms server. Now get the Q from the
                    //designer. Pass in the hash so we can mark which are on the forms server
                    console.log(hash)
                    dashboardSvc.getQFromDesigner(hash).then(
                        function (lst) {
                            $scope.allMiniQ = lst
                            $scope.showWaiting = false
                        }
                    )
                })


            function getLogs() {
                let module = 'request'      //todo - support other modules
                $http.get(`/logs/${module}`).then(
                    function (data) {
                        $scope.logs = data.data
                    }, function(err) {
                        console.log(err)
                    }
                )
            }
            getLogs()



        })
