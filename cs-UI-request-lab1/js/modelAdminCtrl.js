angular.module("pocApp")
    .controller('modelAdminCtrl',
        function ($scope,$http,$uibModal,$localStorage,$q) {

            let dgFilter
            let emailFilter
            $scope.input = {}

            $scope.restoreDG = function () {
                alert("Not yet enabled")
            }

            $scope.world = $localStorage.world


            let obj = angular.copy($scope.world)

            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(obj,true) ],{type:"application/json"}))
            $scope.downloadLinkJsonName = `world.json`




            function getTrace(count) {
                count = count || 200
                let qry = `/trace?count=${count}`
                $http.get(qry).then(
                    function (data) {
                        $scope.traceHistory = data.data

                        $scope.hashDG = {}
                        $scope.hashUser = {}
                        for (const item of $scope.traceHistory) {
                            if (item.model && item.model.kind == 'dg') {
                                $scope.hashDG[item.model.name] = item.model.name
                            }
                            if (item.userEmail) {
                                $scope.hashUser[item.userEmail] = item.userEmail
                            }

                        }
                        $scope.lstType = [""]
                        for (const name of Object.keys($scope.hashDG)) {
                            $scope.lstType.push(name)
                        }

                        $scope.lstType.sort(function(a,b){
                            if (a.toLowerCase() > b.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                    }, function (err) {
                        console.log(err)
                    }
                )
            }
            getTrace()

            $scope.setFilter = function (dgName) {
                dgFilter = dgName
            }
            $scope.setEmailFilter = function (email) {
                emailFilter = email
            }

            $scope.canShow = function (item) {

                if ($scope.input.hideSelect && item.action == 'select') {
                    return false
                }

                //let canShow = true

                if (dgFilter) {
                    if (item.model && item.model.name !== dgFilter) {
                        return false
                    }
                }

                if (emailFilter) {
                    if (item.userEmail && item.userEmail !== emailFilter) {
                        return false
                    }
                }

                return true
            }

            $scope.selectTraceItem = function (item) {
                $scope.selectedTraceItem = item
            }



            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {
                // console.log('auth state change')
                if (user) {
                    $scope.user = {email:user.email,displayName : user.displayName}
                    $scope.$digest()
                } else {
                    delete $scope.user

                    //$scope.loadAllQ()
                    $scope.$digest()
                }



            });

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl'
                })
            };

            $scope.logout=function(){
                firebase.auth().signOut().then(function() {
                    delete $scope.user;
                    alert('You have been logged out')


                }, function(error) {
                    alert('Sorry, there was an error logging out - please try again')
                });

            };



        }
    )