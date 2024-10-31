


angular.module("pocApp")
    .controller('formViewerCtrl',
        function ($scope,$http,$uibModal,$localStorage,$q,makeQuestionnaireSvc,snapshotSvc,modelCompSvc) {


            $scope.input = {}

            $scope.input.autoClipboard = true

            $scope.leftPanel = 'col-md-3'
            $scope.rightPanel = 'col-md-9'

            $scope.csiroUrl = "https://smartforms.csiro.au/playground"

            function loadWorld() {
                //the localstorage objects
                $scope.world = $localStorage.world
                $scope.hashAllDG = $localStorage.world.dataGroups
                $scope.hashAllComp = $localStorage.world.compositions

                snapshotSvc.makeSnapshots($scope.hashAllDG)

                $scope.arDG = []
                Object.keys($scope.world.dataGroups).forEach(function (key) {
                    $scope.arDG.push($scope.world.dataGroups[key])
                })

                try {
                    $scope.arDG.sort(function (a,b) {
                        if (a.name.toLowerCase() > b.name.toLowerCase()) {
                            return 1
                        } else {
                            return -1
                        }
                    })
                } catch(ex) {
                    alert(ex.message)
                }

            }
            loadWorld()

/*
            let obj = {comp:$scope.world.compositions,dg:$scope.world.dataGroups}

            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(obj,true) ],{type:"application/json"}))
            $scope.downloadLinkJsonName = `world.json`
*/

            $scope.selectComp = function (comp) {
                $scope.selectedModel = comp

                //snapshotSvc holds the snapshots..
                modelCompSvc.setSnapshotSvc(snapshotSvc)

                let tmp = angular.copy($scope.hashAllDG)
                let vo = modelCompSvc.makeFullList(comp,tmp,$scope.hashAllDG)
                $scope.allCompElements = vo.allElements     //list of all elements. used by the Table and Q generation (at least)

                $scope.Q =  makeQuestionnaireSvc.makeHierarchicalQFromComp($scope.allCompElements,$scope.hashAllDG)
                if ($scope.input.autoClipboard) {
                    localCopyToClipboard(angular.toJson($scope.Q.Q,2))
                }

            }



            $scope.selectDG = function (dg) {
                $scope.selectedModel = dg
                $scope.fullElementList = snapshotSvc.getFullListOfElements(dg.name,dg)// vo.allElements

                makeQuestionnaireSvc.makeHierarchicalQFromDG(dg,$scope.fullElementList,$scope.hashAllDG,function (Q) {
                    $scope.Q = Q
                    if ($scope.input.autoClipboard) {
                        localCopyToClipboard(angular.toJson($scope.Q,true))
                    }
                })

/*
                $scope.Q = makeQuestionnaireSvc.makeHierarchicalQFromDG($scope.fullElementList,$scope.hashAllDG)
                if ($scope.input.autoClipboard) {
                    localCopyToClipboard(angular.toJson($scope.Q.Q,2))
                }
                */
            }

            $scope.toggleLeftPanel = function(){
                if ($scope.leftPanel == 'col-md-3') {
                    $scope.leftPanel = 'hidden'
                    $scope.rightPanel = 'col-md-12'
                } else {
                    $scope.leftPanel = 'col-md-3'
                    $scope.rightPanel = 'col-md-9'
                }
            }

            let localCopyToClipboard = function(text) {
                let textArea = document.createElement("textarea");
                textArea.value = text;

                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    let successful = document.execCommand('copy');
                    let msg = successful ? 'successful' : 'unsuccessful';
                    console.log('Fallback: Copying text command was ' + msg);
                } catch (err) {
                    alert('Fallback: Oops, unable to copy', err);
                }

                document.body.removeChild(textArea);
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