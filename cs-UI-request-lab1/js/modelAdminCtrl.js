angular.module("pocApp")
    .controller('modelAdminCtrl',
        function ($scope,$http,$uibModal,$localStorage,$q,snapshotSvc,$filter,modelDGSvc) {

            let dgFilter
            let emailFilter
            $scope.input = {}


            $scope.showCondForDG = function(ew) {
                if ($scope.input.dgname) {
                    let name = $scope.input.dgname
                    if (ew.name == name) {
                        return true
                    }

                    //console.log($scope.input.dgname)
                   // if (ew.)
                } else {
                    return true
                }
            }

            $scope.fixErrors = function () {
                analyse(true)
                analyse()
            }


            $scope.applyIdFix = function () {
                Object.keys($scope.world.dataGroups).forEach(function (key) {
                    let dg = $scope.world.dataGroups[key]
                    modelDGSvc.updateDGId(dg)
                })

            }

            function lookForDups(path,fix) {
                let ar = path.split('.')
                let l = ar.length
                let msg = ""

                if (l > 3) {
                    let a =  ar[l-1]
                    let b = ar[l-2]

                    if (a==b) {
                        if (fix) {
                            ar.splice(-1)

                            item.source = ar.join('.')
                        } else {
                            msg = 'dup at end (1)'
                        }


                    }
                }

                if (l > 5) {
                    let a = ar[l-2] + ar[l-1]
                    let b = ar[l-4] + ar[l-3]
                    if (a==b) {
                        if (fix) {
                            //


                            ar.splice(-2)
                            item.source = ar.join('.')
                        } else {
                            msg = 'dup at end (2)'
                        }

                    }
                }


                if (l > 7) {
                    let a = ar[l-3] + ar[l-2] + ar[l-1]
                    let b = ar[l-6] + ar[l-5] + ar[l-4]
                    if (a==b) {
                        if (fix) {
                            ar.splice(-3)
                            item.source = ar.join('.')
                        } else {
                            msg = 'dup at end (3)'
                        }

                    }
                }

                return msg
            }


            function analyseDiff() {
                $scope.arDiffReport = []
                Object.keys($scope.world.dataGroups).forEach(function (key) {
                    let dg = $scope.world.dataGroups[key]
                    if (dg.diff) {
                        dg.diff.forEach(function (ed) {
                            if (ed.enableWhen) {

                                ed.enableWhen.forEach(function (ew) {
                                   // let item = {name: dg.name}
                                   // item.source = ew.source
                                    let msg = lookForDups(ew.source)
                                    if (msg) {
                                        //there was a duplication found
                                        let lne = {name:dg.name,source:ew.source,msg:msg}
                                        $scope.arDiffReport.push(lne)
                                    }

                                })
                            }

                        })

                    }

                })
            }

            function analyse(fix) {
                $scope.allEW = []
                $scope.dgWithEw = []

                //create the hashes
                let hash = {}
                let hashSourceId = {}

                Object.keys($scope.world.dataGroups).forEach(function (key) {
                    let dg = $scope.world.dataGroups[key]
                    let allElements = snapshotSvc.getFullListOfElements(dg.name)


                    allElements.forEach(function (item) {
                        hash[item.ed.path] = item.ed
                        hashSourceId[item.ed.id] = item.ed
                    })

                })


                Object.keys($scope.world.dataGroups).forEach(function (key) {
                    let dg = $scope.world.dataGroups[key]

                    //perform the ew analysis on the expanded DG
                    let allElements = snapshotSvc.getFullListOfElements(dg.name)

                 /*
                    allElements.forEach(function (item) {
                        hash[item.ed.path] = item.ed
                        hashSourceId[item.ed.id] = item.ed
                    })
                    */


                    allElements.forEach(function (item) {
                        let ed = item.ed
                        if (ed.enableWhen) {
                            let dgName = dg.name
                            if ($scope.dgWithEw.filter(n => n == dg.name).length == 0) {
                                $scope.dgWithEw.push(dg.name)
                            }

                            ed.enableWhen.forEach(function (ew) {
                                let item = {name: dg.name} //the dg where the ew is located
                                item.target = ed.path   //the path of the target (where the ew is located)
                                item.source = ew.source //the controlling ed path
                                item.sourceId = ew.sourceId  //the controlling element id
                                item.operator = ew.operator
                                item.value = ew.value
                                item.issues = []
                                let ar = ew.source.split('.')

                                if (item.source == ed.path) {
                                    item.issues.push("source is the ed path")
                                }

                                let sourceEd = hash[item.source]
                                if (! sourceEd) {
                                    let msg = lookForDups(ew.source)
                                    if (msg) {
                                        item.issues.push(`path search: ${msg}`)
                                    } else {
                                        item.issues.push('path search: Unknown issue')
                                    }
                                }

                                let sourceEd1 = hashSourceId[item.sourceId]
                                if (! sourceEd1) {

                                    item.issues.push('id search: ed not found')
                                }



                                $scope.allEW.push(item)
                            })

                        }
                    })


                })

                $scope.allEW.sort(function (a,b) {
                    if (a.name.toLowerCase() > b.name.toLowerCase()) {
                        return 1
                    } else {
                        return -1
                    }
                })

                $scope.dgWithEw.sort(function (a,b) {
                    if (a.toLowerCase() > b.toLowerCase()) {
                        return 1
                    } else {
                        return -1
                    }
                })

            }

            $scope.hashAllDG = {}
            function loadWorld() {
                //the localstorage objects
                $scope.world = $localStorage.world
                $scope.arDG = []
                Object.keys($scope.world.dataGroups).forEach(function (key) {
                    let dg = $scope.world.dataGroups[key]
                    $scope.arDG.push(dg)
                    $scope.hashAllDG[key] = dg
                })

                snapshotSvc.makeSnapshots($scope.hashAllDG)

                analyse()
                analyseDiff()

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


            let obj = {comp:$scope.world.compositions,dg:$scope.world.dataGroups}
            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(obj,true) ],{type:"application/json"}))
            $scope.downloadLinkJsonName = `world.json`

            $scope.selectDG = function (dg) {
                $scope.selectedDG = dg
                $scope.allElements = snapshotSvc.getFullListOfElements(dg.name)
                $scope.hashOfId = {}
                for (const item of $scope.allElements) {
                    $scope.hashOfId[item.ed.id] = item.ed
                }
            }

            $scope.isIdPresent = function (id) {
                if ($scope.hashOfId[id]) {
                    return true
                }
            }

            $scope.deleteDG = function () {
                alert('disabled')
                return
                if (confirm("Are you sure you wish to remove this DG from local storage? (Any version on the Library is untouched")){
                    delete $localStorage.world.dataGroups[$scope.selectedDG.name]
                    delete $scope.selectedDG
                    loadWorld()
                }
            }

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
            //getTrace()

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