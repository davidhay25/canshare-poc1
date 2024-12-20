angular.module("pocApp")
    .controller('eRequestCtrl',
        function ($scope,$localStorage,$http) {

            $scope.input = {}

            let serverBase = "https://fhir.hl7.org.au/ereq/fhir/DEFAULT/"

            $http.get(`${serverBase}metadata`).then(
                function (data) {
                    $scope.metadata = data.data
                    console.log(data.data)
                }, function (err) {
                    alert(angular.toJson(err.data))
                }
            )

            function getAllSR() {
                let qry = `${serverBase}ServiceRequest?_sort=requisition&_count=200`
                $http.get(qry).then(
                    function (data) {

                        $scope.serviceRequest = data.data.entry.filter(entry => entry)


                       // $scope.serviceRequest = data.data.entry
                        console.log($scope.serviceRequest)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }

                )
            }
            getAllSR()

            function clear() {
                delete $scope.oo
                delete $scope.selectedselectedHistoryItemNoContained
                delete $scope.selectedHistoryItem
                delete $scope.selectedHistoryItemContained
            }

            $scope.generateSummary = function (str) {
                let QR = JSON.parse(str)
                $scope.input.qrSummar = QutilitiesSvc.makeQRSummary(QR)
            }

            //paste in a Q
            $scope.pasteBundle = function (str) {
                delete $scope.bundle
                try {
                    $scope.bundle = JSON.parse(str)



                } catch {
                    alert("This is not a valid Json string")
                    return
                }

                $http.post(`${serverBase}Bundle/$validate`,$scope.bundle).then(
                    function (data) {
                        $scope.newBundleOO = data.data
                        console.log(data.data)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }


            $scope.validate = function (resource) {

                $http.post(`${serverBase}${resource.resourceType}/$validate`,resource).then(
                    function (data) {
                        $scope.oo = data.data
                        console.log(data.data)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }


            $scope.selectHistoryItem = function (hx) {
                clear()


                if (hx) {
                    //history is empty for a delete operation
                    $scope.selectedHistoryItem = hx
                    let clone = angular.copy(hx)
                    $scope.selectedHistoryItemContained = hx.contained
                    delete clone.contained
                    $scope.selectedselectedHistoryItemNoContained = clone
                }


            }

            $scope.selectSR = function (SR) {
                delete $scope.history
                delete $scope.selectedSR
                delete $scope.contained
                delete $scope.selectedSRNoContained

                $scope.selectedSR = SR

                let clone = angular.copy(SR)
                $scope.contained = SR.contained
                delete clone.contained
                $scope.selectedSRNoContained = clone

                let qry = `${serverBase}ServiceRequest/${SR.id}/_history`

                $http.get(qry).then(
                    function (data) {

                        $scope.history = data.data

                        $scope.history.entry.forEach(function(entry) {
                            console.log(entry.resource)
                        })

                        $scope.input.mainTabActive = 1
                        // $scope.serviceRequest = data.data.entry
                        console.log($scope.history)
                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }

                )


            }

        }
    )