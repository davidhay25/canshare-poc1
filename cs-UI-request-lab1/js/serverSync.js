//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('serverSyncCtrl',
        function ($scope,$http,allDG) {


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