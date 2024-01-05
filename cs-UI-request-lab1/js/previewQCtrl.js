angular.module("pocApp")
    .controller('previewQCtrl',
        function ($scope,Q,makeQSvc,$timeout,$http) {

            $scope.input = {}
            $scope.Q = Q
            $scope.QR = {}

            let vo = makeQSvc.makeTreeFromQ(Q)
            let treeData = vo.treeData

            $scope.serverbase = "http://hapi.fhir.org/baseR4/"

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


            $scope.validate = function () {
                delete $scope.oo
                $scope.errorCount = 0
                let url = `${$scope.serverbase}Questionnaire/$validate`
                $http.post(url,Q).then(
                    function (data) {
                        $scope.oo = data.data
                        //console.log(data.data)
                        $scope.oo.issue.forEach(function (iss) {
                            if (iss.severity == 'error') {
                                $scope.errorCount ++
                            }
                        })

                    },function (err) {
                        $scope.oo = err.data
                        //console.log(err.data)
                    }
                )
            }

            //validate on load
            $scope.validate()

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
                            $scope.selectedNode = data.node;
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

        }
    )