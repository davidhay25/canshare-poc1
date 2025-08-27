/*
 The front page for the CanShare suite
 Note that the collections are called palygrounds for historical reasons
*/
angular.module("pocApp")
    .controller('csFrontPageCtrl',
        function ($scope,$http,playgroundsSvc,$uibModal,$filter) {

            $scope.input = {}
            $scope.input.versions = {}

                $http.get('playgroundSummary?publishedOnly=true').then(
                    function (data) {
                        $scope.playgrounds = data.data
                        console.log($scope.playgrounds)

                    }, function (err) {
                            alert(angular.toJson(err.data))
                    }
                )

            $scope.viewQ = function (pg) {


            }

            $scope.selectPG = function (pg) {

                $scope.selectedPG = pg
                $scope.input.versions = {}


                    playgroundsSvc.getVersions(pg.id).then(
                        function (data) {
                            $scope.versions = data
                            console.log($scope.versions)
                            $scope.input.versions[pg.id] = data

                            $scope.ddVersions = [{version:'current',display:"Current"}]
                            for (v of data) {
                                let date = $filter('date')(v.publishedDate)
                                $scope.ddVersions.push({version:v.publishedVersion,display:`${v.publishedVersion} ${date}`})
                            }

                            $scope.input.ddSelectedVersion = $scope.ddVersions[0]


                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )

            }

            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

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


        })
