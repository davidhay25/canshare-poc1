angular.module("pocApp")
    .controller('playgroundsCtrl',
        function ($scope,$http,userMode,playground,utilsSvc,$localForage,currentDirty,user) {

            $scope.input = {}

            $scope.user = user

            if (userMode == 'library') {
                if (! confirm("Make sure you have saved any updates before switching to Playground mode! Do you wish to continue?")){
                        return
                }
            }

            $scope.currentDirty = currentDirty


            //Lock a from so no-one else can update
            $scope.lock = function (row) {
                let vo = {email:user.email,id:row.id}

                $http.post(`/playground/lock`,vo).then(
                    function (data) {
                        alert("This form can now only be updated by you!")
                        row.lockedTo = user.email   //just to update the UI
                    }, function (err) {
                        alert(angular.toJson(err.data) )
                    })

            }

            //unlock to allow others to update
            $scope.unlock = function (row) {
                let vo = {id:row.id}

                $http.post(`/playground/unlock`,vo).then(
                    function (data) {
                        alert("This form can now be updated by anyone")
                        delete row.lockedTo  //just to update the UI
                    }, function (err) {
                        alert(angular.toJson(err.data) )
                    })

            }


            function makeLocalStoreSummary() {
                $scope.localStore = []

                $localForage.iterate(function(value, key, iterationNumber) {


                    let item = {id:value.id,name:value.name,description:value.description,updated:value.updated}
                    item.version = value.version
                    if (value.dataGroups) {
                        item.dgCount = Object.keys(value.dataGroups).length
                    }
                    if (value.compositions) {
                        item.compCount = Object.keys(value.compositions).length
                    }

                    $scope.localStore.push(item)



                }).then(function(data) {
                    // data is the key of the value > 10
                    try {
                        $scope.localStore.sort(function (a,b) {
                            if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }

                        })
                    } catch (e) {
                        console.error(e)
                    }

                });

            }
            makeLocalStoreSummary()



            //Models repository playgrounds
            $http.get('playgroundSummary').then(
                function (data) {
                        $scope.playgrounds = data.data

                }, function (err) {
                        alert(angular.toJson(err.data))
                }
            )

            $scope.load = function (playground,source) {
                let msg = "This action will replace the current form. Are you sure you wish to load a new one?"
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
                                if (! data) {
                                    alert("The form wasn't in the local store!")
                                }
                                $scope.$close(data)
                            }, function (err) {
                                alert(angular.toJson(err))
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
            }

            $scope.delete = function (playground,source) {
                if (confirm(`Are you sure you wish to delete the ${playground.name} form?`)) {
                    if (source == 'local') {
                        let key = `pg-${playground.id}`
                        $localForage.removeItem(key).then(
                            function (data) {
                                alert("The form has been removed from the localstore.")
                                makeLocalStoreSummary()
                            }
                        )
                    }
                }
            }

            $scope.createNew = function () {

                //create new just creates the playground locally (with a UUID)
                //the name no longer needs to be unique
                let pg = {name:$scope.input.name,description:$scope.input.description}
                pg.id = utilsSvc.getUUID()
                pg.dataGroups = {}
                pg.compositions = {}

                alert("The form has been created in the working model. It won't be created in the Local store until you update it.")
                $scope.$close(pg)


            }
        }
)