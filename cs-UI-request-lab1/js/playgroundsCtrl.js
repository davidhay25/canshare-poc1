angular.module("pocApp")
    .controller('playgroundsCtrl',
        function ($scope,$http,userMode,playground,utilsSvc,$localForage) {

            $scope.input = {}
            //$scope.playground = playground

            if (userMode == 'library') {
                if (! confirm("Make sure you have saved any updated before switching to Playground mode! Do you wish to continue?")){
                        return
                }

            }

            $scope.localStore = []
            $localForage.iterate(function(value, key, iterationNumber) {


                let item = {id:value.id,name:value.name,description:value.description,updated:value.updated}
                if (value.dataGroups) {
                    item.dgCount = Object.keys(value.dataGroups).length
                }

                $scope.localStore.push(item)

                console.log(key,value)

            }).then(function(data) {
                // data is the key of the value > 10
            });

           // $scope.

            $http.get('playgroundSummary').then(
                function (data) {
                        $scope.playgrounds = data.data
                }, function (err) {
                        alert(angular.toJson(err.data))
                }
            )

            $scope.load = function (playground,source) {
                let msg = "This action will replace the current model. Are you sure you wish to load a new one?"
                if (confirm(msg)) {
                    if (source == 'repo') {
                        //from the library repository
                        $http.get(`/playground/${playground.id}`).then(
                            function (data) {
                                $scope.$close(data.data)
                            }, function (err) {
                                alert(angular.toJson(err.data) )
                            })
                    } else {
                        //from the local store
                        let key = `pg-${playground.id}`
                        $localForage.getItem(key).then(
                            function (data) {
                                $scope.$close(data)
                            }
                        )
                    }

                }
            }

            $scope.copy = function (playgroundSummary,source) {
                let name = prompt("What name do you want to use for the copy")
                if (name) {
                    if (source == 'repo') {
                        $http.get(`/playground/${playgroundSummary.id}`).then(
                            function (data) {
                                let playground = data.data      //the playground being copied
                                playground.name = name
                                playground.id = utilsSvc.getUUID()
                                $scope.$close(playground)

                            }
                        )
                    } else {
                        //from the local store
                        let key = `pg-${playground.id}`
                        $localForage.getItem(key).then(
                            function (playground) {
                                playground.name = name
                                playground.id = utilsSvc.getUUID()
                                $scope.$close(playground)
                            }
                        )
                    }
                }

                return

                $http.get(`/playground/${playgroundSummary.id}`).then(
                    function (data) {
                        let playground = data.data      //the playground being copied

                        let name = prompt("What name do you want to use for the copy")
                        if (name) {

                            playground.name = name
                            playground.id = utilsSvc.getUUID()
                            $scope.$close(playground)

                            /*
                            $http.put(`/playground/${name}`,playground).then(
                                function (data) {
                                    alert("The playground has been copied.")
                                    $scope.$close(playground)
                                }, function (err) {
                                    alert("Error saving copy" + angular.toJson(err.data))
                                }
                            )
                            */



                            /*
                            $http.get(`/playground/${name}`).then(
                                function (data) {
                                    alert("Sorry, this name has been used before.")
                                },function (err) {
                                    if (err.status == 404) {
                                        playground.name = name
                                        $http.put(`/playground/${name}`,playground).then(
                                            function (data) {
                                                alert("The playground has been copied.")
                                                $scope.$close(playground)
                                            }, function (err) {
                                                alert("Error saving copy" + angular.toJson(err.data))
                                            }
                                        )
                                    } else {
                                        alert("Error accessing library")
                                    }
                                }
                            )
                            */
                        }
                    }, function (err) {
                        alert("Error getting original playground")

                    })



            }

            $scope.createNew = function () {

                //create new just creates the playground locally (with a UUID)
                //the name no longer needs to be unique
                let world = {name:$scope.input.name,description:$scope.input.description}
                world.id = utilsSvc.getUUID()
                world.dataGroups = {}
                world.compositions = {}

                alert("The playground has been created.")
                $scope.$close(world)



/*

                //check that name doesn't exist already
                let name = $scope.input.name
                $http.get(`/playground/${name}`).then(
                    function (data) {
                            
                    },function (err) {
                            if (err.status == '404') {

                                let world = {name:name,description:$scope.input.description}
                                world.dataGroups = {}
                                world.compositions = {}

                                $http.put(`/playground/${name}`,world).then(
                                    function (data) {
                                        alert("The playground has been created.")
                                        $scope.$close(world)
                                    }, function (err) {
                                        alert(angular.toJson(err.data))
                                    }
                                )

                            } else {
                                    alert("This name has already been used - try another")
                            }

                    }
                )

                */
                    

                
                //return new wold - note than may be a clone of another. Caller updates browser cache    
                    
            }
        }
)