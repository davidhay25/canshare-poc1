//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('serverSyncCtrl',
        function ($scope,$http,allDG) {

            $scope.localDGCount = Object.keys(allDG).length

            let qry = `/model/allDG`
            $http.get(qry).then(
                function (data) {
                    $scope.libraryDG = data.data
                    $scope.libraryDGCount = $scope.libraryDG.length
                    console.log($scope.libraryDG)
                    makeSummary(allDG,$scope.libraryDG)
                }, function (err) {
                    alert(angular.toJson(err.data))
                })

            //create the summary between library DG & local DG
            function makeSummary(allDG,libraryDG) {
                let libraryHash = {}

                libraryDG.forEach(function (dg) {
                    libraryHash[dg.name] = dg
                })

                $scope.summary = []        //the summary array
                Object.keys(allDG).forEach(function (key) {
                    let localDG = allDG[key]
                    let item = {name:key,title:localDG.title,local:localDG}
                    if (libraryHash[key]) {
                        item.library = libraryHash[key]
                        delete libraryHash[key]      //any left in the hash at the end are new on the library


                    } else {
                        //the library  doesn't have this DG
                    }
                    $scope.summary.push(item)
                })

                //Any DG left in the serverHash are new on the server
                Object.keys(libraryHash).forEach(function (key) {
                    let libraryDG = libraryHash[key]
                    let item = {name:key, title:libraryDG.title, library:libraryDG,note:"Library only"}
                    $scope.summary.push(item)
                })



            }

            $scope.refreshFromRepo = function () {
                if (confirm('Are you sure you wish to refresh your local DGs from the Library')) {
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
                if (confirm('Are you sure you wish to update the Library')) {
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

        })