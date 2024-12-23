angular.module("pocApp")
    .controller('playgroundsCtrl',
        function ($scope,$http,userMode,playground) {

            $scope.input = {}
            //$scope.playground = playground

            if (userMode == 'library') {
                if (! confirm("Make sure you have saved any updated before switching to Playground mode! Do you wish to continue?")){
                        return
                }

            }

            $http.get('playgroundSummary').then(
                function (data) {
                        $scope.playgrounds = data.data
                }, function (err) {
                        alert(angular.toJson(err.data))
                }
            )

            $scope.load = function (playground) {
                let msg = "This action will replace the current model. Are you sure you wish to load a new one?"
                if (confirm(msg)) {
                    $http.get(`/playground/${playground.name}`).then(
                        function (data) {
                            $scope.$close(data.data)
                        }, function (err) {
                            alert(angular.toJson(err.data) )
                        })
                }


            }

            $scope.copy = function (playgroundSummary) {
                $http.get(`/playground/${playgroundSummary.name}`).then(
                    function (data) {
                        let playground = data.data      //the playground being copied

                        let name = prompt("What name do you want to use for the copy (it needs to be unique)")
                        if (name) {
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
                        }
                    }, function (err) {
                        alert("Error getting original playground")

                    })



            }

            $scope.createNew = function () {
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
                    

                
                //return new wold - note than may be a clone of another. Caller updates browser cache    
                    
            }
        }
)