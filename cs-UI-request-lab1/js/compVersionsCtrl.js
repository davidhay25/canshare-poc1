angular.module("pocApp")
    .controller('compVersionsCtrl',
        function ($scope,$http,modelCompSvc,utilsSvc,makeQSvc,vsSvc) {


            $scope.loadVersions = function () {
                let qry = `/comp/version/${$scope.selectedComposition.name}`
                $http.get(qry).then(
                    function (data) {
                        console.log(data.data)
                        $scope.compVersions = data.data
                        if ($scope.compVersions.length == 0) {
                            alert("there are no previous versions saved")
                        }
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }

            $scope.createVersion = function () {
                //create a new version of the current comp

                let comment = prompt("Enter version comment. Leave blank to cancel.")

                if (comment){

                    let comp = angular.copy($scope.selectedComposition)
                    comp.versionComment = comment

                    //the verion in  the comp is what the next version will be saved as - it is updated afte saving
                    comp.version = comp.version || 1        //if it's never been versioned


                    let voComp = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)

                    //we save both the complete list of elements (snapshot) and Q in the version
                    //this is to guarantee that the two match - and generating the Q requires access to all DGs
                    //there are downsides - the size is almost doubled, and we can't use a different Q generating
                    //algorithm on the Q at a later date.
                    //note that allElements has a child 'ed' - we remove that in the snapshot

                    comp.snapshot = []
                    voComp.allElements.forEach(function (item) {
                        let ed = item.ed
                        let path = ed.path
                        comp.snapshot.push(item.ed)
                    })


                    //rebuild the Q so it is current
                    vsSvc.getAllVS($scope.allCompElements, function () {
                        let vo1 = makeQSvc.makeHierarchicalQFromComp(comp,$scope.hashAllDG)
                        comp.Q = vo1.Q
                        comp.errorLog = vo1.errorLog

                        console.log(comp.Q)

                        console.log(utilsSvc.getSizeOfObject(comp)/1024)
                        console.log(utilsSvc.getSizeOfObject(comp.Q)/1024)

                        let qry = "/comp/version"

                        //return //temp

                        $http.post(qry,comp).then(
                            function (data) {
                                console.log(data.data)
                                alert(`Saved as version ${data.data.version}`)
                                //increment the version flag for the current version
                                $scope.selectedComposition.version = comp.version + 1
                            }, function (err) {
                                alert(angular.toJson(err.data))
                            }
                        )
                    })


                }

            }

        }
    )