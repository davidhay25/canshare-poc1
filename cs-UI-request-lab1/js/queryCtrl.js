angular.module("pocApp")
    .controller('queryCtrl',
        function ($scope,$http,$localStorage,$uibModal,$q) {




            //$scope.serverUrl = "http://hapi.fhir.org/baseR4/"

            $scope.localStorage = $localStorage



            function setServer() {
                if ($localStorage.currentServer) {
                    $scope.selectedServer = $localStorage.currentServer
                    $scope.allServers.forEach(function (svr) {
                        if (svr.url == $scope.selectedServer.url) {
                            $scope.svr = svr
                        }
                    })
                } else {
                    $scope.selectedServer = $scope.allServers[0]
                }
            }

            $http.get('/termServers').then(
                function (data) {
                    $scope.allServers = data.data
                    setServer()
                   // $scope.currentServer = 
                }
            )

            $http.get('/searchLibrary').then(
                function (data) {
                    $scope.library = data.data


                }
            )




            //this function is passed into the modal dialog to support the patient lookup query
            //todo - I should be able to do the same thing for bundle versions...
            function search(qry) {
                let deferred = $q.defer()
                let fullQry = `${$scope.selectedServer.url}${qry}`
                console.log(fullQry)
                let encodedQry = encodeURIComponent(fullQry)
                $scope.showWaiting = true
                $http.get(`proxy?qry=${encodedQry}`).then(
                   // $http.get(`/termQuery?qry=${encodedQry}`).then(   //actually, termQuery is not specific to terminology...
                    function (data) {
                       deferred.resolve(data.data)
                    }, function (err) {
                        console.log(err.data)
                        deferred.reject()
                    }
                )
                return deferred.promise
            }

            $scope.executeFromLibrary = function (item) {
              //  if (confirm(`Please confirm you wish to execute the following libray item: ${item.display}`)) {
                    $uibModal.open({
                        backdrop: 'static',      //means can't close by clicking on the backdrop.
                        keyboard: false,       //same as above.
                        templateUrl: 'modalTemplates/makeLibraryQuery.html',
                        controller: 'makeLibraryQueryCtrl',
                        resolve: {
                            item: function () {
                                return item
                            },
                            serverBase : function () {
                                return $scope.selectedServer.url
                            },
                            library : function () {
                                return  $scope.library
                            },
                            search : function () {
                                return search
                            }
                        }
                    }).result.then(
                        function (qry) {
                            $scope.generalQuery = qry
                            $scope.executeGeneralQuery(qry)
                        })
               // }
            }


            $scope.executeFromHistory = function (qry) {
            //    if (confirm(`Please confirm you wish to execute the following query: ${qry}`)) {
                    $scope.executeGeneralQuery(qry)
                    $scope.generalQuery = qry
            //    }
            }

            $scope.removeHistory = function (inx) {
                $localStorage.genHistory.splice(inx,1)
            }

            $scope.trimDisplay = function(str,length) {
                if (str.length <= length) {
                    return str
                } else {
                    str = str.substring(0,length-3) + "..."
                    return str
                }
            }

            $scope.executeGeneralQuery = function (qry) {
              //  if (confirm(`Please confirm you wisg to execute the following query: ${qry}`)){
                    delete $scope.ooGeneral
                    let fullQry = `${$scope.selectedServer.url}${qry}`

                    let encodedQry = encodeURIComponent(fullQry)
                    $scope.showWaiting = true
                    $http.get(`proxy?qry=${encodedQry}`).then(
                    //$http.get(`/termQuery?qry=${encodedQry}`).then(   //actually, termQuery is not specific to terminology...
                        function (data) {
                            console.log(data.data)

                            $localStorage.genHistory = $localStorage.genHistory || []
                            //save in the local history (no dups)
                            let addToHx = true
                            let ar = $localStorage.genHistory.filter(item => item == qry)
                            if (ar.length == 0) {
                                if ($localStorage.genHistory.length > 20) {
                                    $localStorage.genHistory.splice(9,1)
                                }
                                $localStorage.genHistory.splice(0,0,qry)
                            }




                            $scope.generalBundle = data.data    //a bundle containing all the DR versions
                        }, function (err) {
                            $scope.ooGeneral = err.data
                        }).then(function () {
                            $scope.showWaiting = false
                        }
                    )
             //   }

            }

            $scope.selectServer = function (svr) {
               // $scope.selectedServer = svr
                $localStorage.currentServer = $scope.selectedServer
            }
            
            $scope.vsTypes = []
            $scope.vsTypes.push({display:'clinical T',code:'ct'})
            $scope.vsTypes.push({display:'clinical N',code:'cn'})

            $scope.vsTumourTypes = []
            $scope.vsTumourTypes.push({display:'Breast cancer',code:'breast-cancer'})
            $scope.vsTumourTypes.push({display:'Bowel cancer',code:'bowel-cancer'})

            $scope.selectVS = function (vs) {
                $scope.selectedVS = vs
                delete $scope.vsExpanded
                delete $scope.ooExpand
            }

            //$scope.localStorage = $localStorage

            $scope.expandVS = function (vs,filter) {
                delete $scope.ooExpand
                let qry = `${$scope.selectedServer.url}ValueSet/${vs.id}/$expand`
                if (filter) {
                    qry += `?filter=${filter}`
                }
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`/termQuery?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data.data)
                        $scope.vsExpanded = data.data    //a bundle containing all the DR versions
                    }, function (err) {
                        $scope.ooExpand = err.data
                    }).then(function () {
                        $scope.showWaiting = false
                    }
                )
            }

            $scope.getLastPartOfUrl = function (url) {
                if (url) {
                    let ar = url.split('/')
                    return ar[ar.length-1]
                }

            }

            $scope.findVS = function (type,tumourType,custom) {
                delete $scope.selectedVS
                delete $scope.oo
                delete $scope.vsBundle

                let qry = `${$scope.selectedServer.url}/ValueSet?`
                if (custom) {
                    qry += custom + "&"

                    //add the custom query to the local storage
                    $scope.localStorage.vsQuery = $scope.localStorage.vsQuery || []
                    if ($scope.localStorage.vsQuery.indexOf(custom) == -1) {
                        $scope.localStorage.vsQuery.push(custom)
                    }

                } else {
                    if (type) {
                        qry += `context=${type.code}&`
                    }

                    if (tumourType) {
                        qry += `context=${tumourType.code}&`
                    }
                }


                qry = qry.slice(0,-1)

                $scope.query = qry

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`/termQuery?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data.data)
                        $scope.vsBundle = data.data    //a bundle containing all the DR versions
                    }, function(err) {
                        $scope.oo = err.data
                    }).then(function(){
                    $scope.showWaiting = false
                })

            }


        }
    )