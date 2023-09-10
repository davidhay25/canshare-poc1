
angular.module("pocApp")
    .controller('libraryDGCtrl',
        function ($scope,$http,DG) {
           // $scope.direction = direction
            $scope.DG = DG
            //download the current DG
            let qry = `/model/DG/${DG.name}`
            $http.get(qry).then(
                function (data) {
                    $scope.serverDG = data.data

                    $scope.summaryDiff = summarizeDG(DG,$scope.serverDG)


                    function summarizeDG(local,server) {
                        let summary = {}
                        summary.rows = [local.diff.length,server.diff.length]

                        //create a hash of the server version to compare
                        let serverHash = {}
                        server.diff.forEach(function (ed) {
                            serverHash[ed.path] = ed
                        })

                        //go through each ed in the source. compare type, mult
                        $scope.messages = []
                        let localHash = {}  //track the paths that the local has checked.
                        local.diff.forEach(function (ed) {
                            let path = ed.path
                            if (serverHash[path]) {
                                let serverED = serverHash[path]
                                console.log(path,ed.mult,serverED.mult)
                                if (ed.mult !== serverED.mult) {
                                    $scope.messages.push(`Cardinality different in ${path}`)
                                }

                                if (ed.title !== serverED.title) {
                                    $scope.messages.push(`Title different in ${path}`)
                                }

                                if (ed.description !== serverED.description) {
                                    $scope.messages.push(`Description different in ${path}`)
                                }


                            } else {
                                //this ed is ont on the server - it's a new one.
                                $scope.messages.push(`Local has a new element: ${path}`)
                            }
                        })


                        return summary
                    }

                }, function (err) {
                    alert(angular.toJson(err.data))
                }
            )

            $scope.download = function() {
                //need to update the DG in the allDG hash.


                /*
                for (const ed1 of $scope.selectedModel.diff) {
                    ctr ++
                    if (ed1.path == pathToDelete) {
                        inx = ctr
                        break
                    }
                }

                if (inx > -1) {
                    //set the mult to 0..0
                    $scope.selectedModel.diff[inx].mult = '0..0'
                }
*/
                }

            $scope.upload = function () {
                let qry = `/model/DG/${DG.name}`
                $http.put(qry,DG).then(
                    function (data) {
                        alert("DG uploaded to Library")
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }

            $scope.download = function () {

            }



/*
            $scope.refreshFromRepo = function () {
                if (confirm('Are you sure you wish to refresh your local DGs from the Repository')) {
                    let qry = '/model/allDG'
                    $http.get(qry).then(
                        function (data) {
                            console.log(data)

                            let arDG = data.data

                            //replace each one.
                            arDG.forEach(function (dg) {
                                allDG[dg.name] = dg

                            })

                            $scope.$close(true)




                        },
                        function (err) {
                            console.log(err)
                        }
                    )
                }

            }

            //update all the DG on the server...
            $scope.updateRepo = function () {
                if (confirm('Are you sure you wish to update the Repository')) {
                        let qry = "/model/DG"
                    $http.post(qry,allDG).then(
                        function (data) {
                            console.log(data)
                        },
                        function (err) {
                            console.log(err)
                        }
                    )
                }
            }
*/
        })