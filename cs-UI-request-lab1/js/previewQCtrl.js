angular.module("pocApp")
    .controller('previewQCtrl',
        function ($scope,Q,makeQSvc,$timeout,$http,$localStorage) {




            //https://hackweek.fhirpath-lab.com/Questionnaire?id={url to Q}

            $scope.input = {}
            $scope.Q = Q
            $scope.QR = {}

            //todo Just for the ak demo -
            ///scope.pathToQ = `https://fhir.forms-lab.com/Questionnaire/${$scope.Q.id}`


            //$scope.serverbase = "http://hapi.fhir.org/baseR4/"  //used for validation
            $scope.serverbase = "https://fhir.forms-lab.com/"


            let vo = makeQSvc.makeTreeFromQ(Q)
            let treeData = vo.treeData

            let pocFormsServer = {name:"POC Server",url:'/dashboard/Questionnaire'}
            $localStorage.formsManagers = $localStorage.formsManagers || [pocFormsServer]


            $scope.formsManagers = $localStorage.formsManagers

            $scope.addFm = function () {
                let fm = {name:$scope.input.fmName,url:$scope.input.fmUrl}
                $localStorage.formsManagers.push(fm)
                delete $scope.input.fmName
                delete $scope.input.fmUrl
            }

            $scope.deleteFm = function (inx) {
                $localStorage.formsManagers.splice(inx,1)
            }

            $scope.copyToClipboard = function () {

                let txt = angular.toJson($scope.Q)

                $scope.localCopyToClipboard(txt)

/*
                navigator.clipboard.writeText(txt).then(
                    () => {
                        alert('Q text copied to clipboard');
                    },
                    () => {
                        alert('Error: Q text not copied to clipboard');
                    },
                )
                */

            }

            $scope.publishToFm = function (inx) {
                let fm = $localStorage.formsManagers[inx]
                let qry = `${fm.url}` ///${$scope.Q.id}`
                msg = `Please confirm query: ${qry}`
                if (confirm(msg)) {
                    $http.put(qry,$scope.Q).then(
                        function (data) {
                            alert("The form has been copied onto the designated Forms server, and is available for use")
                        }, function (err) {
                            alert(angular.toJson(err))
                        }
                    )
                }
               // alert(url)

              //  return


               // let qry = `/dashboard/Questionnaire`


            }




            $scope.saveToServer = function () {
                //saves the Q to the hapi server so that we can invoke the fhirpath lab
                //Once the POC is ssl then we can save there instead
                if (confirm("This will save the Q to the public HAPI server so it can be accessed by the Questionnaire renderer.")) {

                    let qry = `https://fhir.forms-lab.com/Questionnaire/${$scope.Q.id}`

                    //let qry = `https://hapi.fhir.org/baseR4/Questionnaire/${$scope.Q.id}`


                    $http.put(qry,$scope.Q).then(
                        function (data) {
                            alert("Resource saved.")
                            $scope.pathToQ = qry
                        },
                        function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }

                
            }







            let hapiServer = "http://hapi.fhir.org/baseR4/"  //used for validation
            let brianServer = "https://fhir.forms-lab.com/"

            $scope.validate = function () {
                
            }
            

            $scope.issues = vo.issues
            $scope.lstElements = vo.lstElements

            //console.log(treeData)

            $timeout(function () {
                makeQTree(treeData)
            },500)

            $scope.allEW = makeQSvc.getAllEW(Q)

            $scope.showIssue = function (iss) {
                if ($scope.input.errorOnly) {
                    return iss.severity == 'error' ? true : false

                  //  if (iss.severity == 'error') {

                  //  }
                } else {
                    return true
                }

            }


            let validate = function (Q,server) {
                delete $scope.oo
                $scope.errorCount = 0
                $scope.warningCount = 0
                $scope.validating = true
                let url = `${server}Questionnaire/$validate`
                $http.post(url,Q).then(
                    function (data) {
                        $scope.validating = false
                        $scope.oo = data.data
                        //console.log(data.data)
                        $scope.oo.issue.forEach(function (iss) {
                            if (iss.severity == 'error') {
                                $scope.errorCount ++
                            } else {
                                $scope.warningCount ++
                            }
                        })

                    },function (err) {
                        $scope.validating = false
                        $scope.oo = err.data
                        //console.log(err.data)
                    }
                )
            }

            //validate on load
            validate($scope.Q,$scope.serverbase)

            $scope.showED = function (definition) {
                //for now the definition is the path to the ED. This may change (specifically it should be a url)


            }



            console.log(makeQSvc.makeTreeFromQ(Q))

            $scope.downloadQLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(Q,true)],{type:"application/json"}))
            $scope.downloadQLinkJsonName = `Q-${Q.name}.json`

            console.log(Q)

            function checkTreeData(lstTreeData) {
                lstAlerts = []
                hashId = {}
                lstTreeData.forEach(function (item) {
                    if (hashId[item.id]) {

                    }
                })

                return lstAlerts

            }

            function makeQTree(treeData) {
                $('#qTree').jstree('destroy');

                let x = $('#qTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                        // the node selection event...

                        if (data.node) {
                            $scope.selectedNode = angular.copy(data.node)
                            delete $scope.selectedNode.data.item
                        }

                        $scope.$digest();       //as the event occurred outside of angular...

                    }
                ).bind("loaded.jstree", function (event, data) {
                    //let id = treeData[0].id
                    $(this).jstree("open_node",'root');
                    //$(this).jstree("open_all");  //open all nodes


                    $scope.$digest();
                });

            }

            $scope.localCopyToClipboard = function(text) {
                let textArea = document.createElement("textarea");
                textArea.value = text;

                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    let successful = document.execCommand('copy');
                    let msg = successful ? 'successful' : 'unsuccessful';
                    console.log('Fallback: Copying text command was ' + msg);
                } catch (err) {
                    alert('Fallback: Oops, unable to copy', err);
                }

                document.body.removeChild(textArea);
            }

        }
    )