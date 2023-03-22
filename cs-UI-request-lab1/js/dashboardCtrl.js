angular.module("pocApp")
    .controller('dashboardCtrl',
        function ($scope,$http,dashboardSvc) {


            $scope.input = {}
            $scope.commands = []
            $scope.commands.push({display:'Manage forms',key:'forms'})
            $scope.commands.push({display:'Log',key:'log'})

            $scope.input.command = $scope.commands[0]

            $scope.$on('qrCreated',function(event,vo1) {

                $scope.createdQR = vo1.QR
                //$scope.formData = vo1.formData
                //$scope.hashItem = vo1.hashItem
            })

            $scope.checkBoxChange = function () {
                delete $scope.selectedQ
                delete $scope.createdQR
            }

            //filter contents of list based on whether to show only those in the Forms Server
            $scope.showInList = function (miniQ) {
                if ($scope.input.fsOnly) {
                    if (miniQ.existsOnFormsServer) {
                        return true
                    } else {
                        return false
                    }
                } else {
                    return true
                }
            }

            $scope.selectMiniQ = function (miniQ) {
                $scope.selectedMiniQ = miniQ
                delete $scope.selectedQ
                delete $scope.createdQR


                //retrieve  the Q from the designer / public site
                dashboardSvc.getSingleQFromDesigner(miniQ).then(
                    function (Q) {
                        $scope.selectedQ = Q
                    }, function (err) {
                        console.log(err)
                    }
                )

            }

            dashboardSvc.getQfromFormsServer().then(
                function (hash){
                    //returns a hash of urls that are currently on the forms server. Now get the QW from the
                    //designer. Pass in the hash so we can mark which are on the forms server
                    console.log(hash)
                    dashboardSvc.getQFromDesigner(hash).then(
                        function (lst) {
                            $scope.allMiniQ = lst
                        }
                    )
                })


            function getLogs() {
                let module = 'request'      //todo - support other modules
                $http.get(`/logs/${module}`).then(
                    function (data) {
                        $scope.logs = data.data
                    }, function(err) {
                        console.log(err)
                    }
                )
            }
            getLogs()



        })
