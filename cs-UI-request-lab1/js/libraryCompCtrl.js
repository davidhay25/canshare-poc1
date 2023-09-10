//works with individual compositions and the library
angular.module("pocApp")
    .controller('libraryCompCtrl',
        function ($scope,$http,comp) {
           // $scope.direction = direction
            $scope.comp = comp
            //download the current composition with this name
            let qry = `/model/comp/${comp.name}`
            $http.get(qry).then(
                function (data) {
                    $scope.libraryComp = data.data

                }, function (err) {

                    if (err.status == 404) {
                        //this composition is not on the library
                    } else {
                        alert(angular.toJson(err))
                    }

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
                if (confirm("Are you sure you wish to upload this Composition")) {
                    let qry = `/model/comp/${comp.name}`
                    $http.put(qry,comp).then(
                        function (data) {
                            alert("Composition uploaded to Library")
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }


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