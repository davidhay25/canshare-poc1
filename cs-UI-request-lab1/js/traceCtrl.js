angular.module("pocApp")
    .controller('traceCtrl',
        function ($scope,traceSvc,hashAllDG,currentDG,user,modelsSvc) {
            $scope.input = {}
            $scope.traceHistory = traceSvc.getActions()
            $scope.traceSize = traceSvc.getTraceSize()

            let hashRestorations = {}   //DGs that have been restored

            $scope.AllDGsize = parseInt(modelsSvc.getSizeOfObject(hashAllDG)/(1024))
            $scope.AllDGsizeCount = Object.keys(hashAllDG).length

            $scope.user = user
            $scope.currentDG = currentDG
            let dgFilter

            //create list of models

            $scope.hashDG = {}
            for (const item of $scope.traceHistory) {
                if (item.model && item.model.kind == 'dg') {
                    $scope.hashDG[item.model.name] = item.model.name
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

            console.log($scope.lstType)

            if (currentDG) {
                $scope.input.selectedDGName = currentDG.name
                dgFilter = currentDG.name
            }

            $scope.restoreDG = function (dg) {
                //have checked that DG is checked out to the current user
                if (confirm("Are you sure you wish to restore this version, replacing the current one")) {
                    hashAllDG[dg.name] = dg

                    //need to make sure that the checkedOut status remains the same after restoration.
                    dg.checkedOut = currentDG.checkedOut
                    traceSvc.addAction({action:'restore',model:dg,description:"Restore previous version"})
                    $scope.traceHistory = traceSvc.getActions()

                    hashRestorations[dg.name] = true
                }
            }

            $scope.setFilter = function (dgName) {
                dgFilter = dgName
            }

            $scope.canShow = function (item) {

                if ($scope.input.hideSelect && item.action == 'select') {
                    return false
                }

                if (dgFilter) {
                    if (item.model && item.model.name == dgFilter) {
                        return true
                    }

                } else {
                    return true
                }

            }

            $scope.clearTrace = function () {
                if (confirm("Are you sure you wish to clear the Trace?")){
                    traceSvc.resetTrace()
                    $scope.traceHistory = traceSvc.getActions()
                    $scope.traceSize = traceSvc.getTraceSize()
                }
            }



            $scope.selectTraceItem = function (item) {
                $scope.selectedTraceItem = item
            }

            $scope.close = function () {
                $scope.$close(hashRestorations)
            }

        })