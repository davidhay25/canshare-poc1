//seversync is actually the main library interface
angular.module("pocApp")
    .controller('libraryCtrl',
        function ($scope,$http,allDG,allComp,$sce,allQObject,user,librarySvc) {

            $scope.input = {}
            $scope.user = user
            //$scope.input.mainTabActive = 1

            $scope.localDGCount = Object.keys(allDG).length

            let trusted = {}; //https://stackoverflow.com/questions/33297444/uib-popover-html-wont-accept-my-html-string
            $scope.getPopoverHtmlDEP = function(obj) {
                //works, but I don't want to use it here. Leaving so I know how to do it later on
                //let content = "<bold>Test</bold>"
                let content = `<pre>${angular.toJson(obj,true)}</pre>`
                return trusted[content] || (trusted[content] = $sce.trustAsHtml(content));
            }

            //get all the DG
            let qry = `/model/allDG`
            $http.get(qry).then(
                function (data) {
                    $scope.libraryDG = data.data
                    $scope.libraryDGCount = $scope.libraryDG.length
                    //console.log($scope.libraryDG)
                    makeDGSummary(allDG,$scope.libraryDG)
                }, function (err) {
                    alert(angular.toJson(err.data))
                })

            //get all the compositions
            let qryComp = `/model/allCompositions`
            $http.get(qryComp).then(
                function (data) {
                    $scope.libraryComp = data.data
                    $scope.libraryCompCount = $scope.libraryComp.length
                    //console.log($scope.libraryComp)
                    makeCompSummary(allComp,$scope.libraryComp)
                }, function (err) {
                    alert(angular.toJson(err.data))
                })




            //get all the QO
            let qryQO = `/model/allQObject`
            $http.get(qryQO).then(
                function (data) {
                    $scope.libraryQO = data.data
                    $scope.libraryQOCount = $scope.libraryQO.length
                    //console.log($scope.libraryComp)
                   // makeCompSummary(allComp,$scope.libraryComp)
                }, function (err) {
                    alert(angular.toJson(err.data))
                })


            function makeCompSummary(allComp,libraryComp) {
                let libraryHash = {}

                libraryComp.forEach(function (comp) {
                    libraryHash[comp.name] = comp
                })

                $scope.summaryComp = []        //the summary array

                Object.keys(allComp).forEach(function (key) {
                    let localComp = allComp[key]
                    let item = {name:key,title:localComp.title,local:localComp}
                    if (libraryHash[key]) {
                        item.library = libraryHash[key]
                        delete libraryHash[key]      //any left in the hash at the end are new on the library
                    } else {
                        item.note = "Not in Library"
                    }
                    $scope.summaryComp.push(item)
                })

                //Any DG left in the serverHash are new on the server
                Object.keys(libraryHash).forEach(function (key) {
                    let libraryComp = libraryHash[key]
                    let item = {name:key, title:libraryComp.title, library:libraryComp,note:"Library only"}
                    $scope.summaryComp.push(item)
                })

            }



            //create the summary between library DG & local DG
            function makeDGSummary(allDG,libraryDG) {
                let libraryHash = {}

                libraryDG.forEach(function (dg) {
                    libraryHash[dg.name] = dg
                })

                $scope.summary = []        //the summary array
                Object.keys(allDG).forEach(function (key) {
                    let localDG = allDG[key]
                    let item = {name:key,title:localDG.title,local:localDG}
                    if (libraryHash[key]) {
                        item.library = libraryHash[key]
                        //item.checkedOut =
                        delete libraryHash[key]      //any left in the hash at the end are new on the library

                    } else {
                        item.note = "Not in Library"
                        //the library  doesn't have this DG
                    }
                    $scope.summary.push(item)
                })

                //Any DG left in the serverHash are new on the server
                Object.keys(libraryHash).forEach(function (key) {
                    let libraryDG = libraryHash[key]
                    let item = {name:key, title:libraryDG.title, library:libraryDG,note:"Library only"}
                    $scope.summary.push(item)
                })

                try {
                    $scope.summary.sort(function (a,b) {
                        if (a.title.toLowerCase() > b.title.toLowerCase()) {
                            return 1
                        } else {
                            return -1
                        }
                    })
                } catch (ex) {
                    console.log("Issue sorting DG - likley a missing title",ex)
                }



            }

            $scope.downloadComp = function(comp) {
                //set the comp property of the vo and exit. The caller (modelsCtrl.js) will update
                $scope.$close({comp:comp})

            }

            $scope.downloadDG = function(dg) {
                //set the comp property of the vo and exit. The caller (modelsCtrl.js) will update
                $scope.$close({dg:dg})

            }

            //delete a library item
            $scope.deleteDG = function (dg) {
                if (confirm("Are you sure you wish to remove this from the library. It will mark it as inactive")) {

                    let url = `/model/DG/${dg.name}/delete`
                    let config = {headers:{'x-user-email': user.email}}

                    $http.put(url,dg,config).then(
                        function (data) {
                            alert("Resource has marked as inactive in the Library")
                        },
                        function (err) {
                            alert(angular.toJson(err))
                        }
                    )

                }
            }


            $scope.refreshFromRepo = function () {
                if (confirm('Are you sure you wish to refresh your local DGs from the Library')) {
                    let qry = '/model/allDG'
                    $http.get(qry).then(
                        function (data) {
                            //console.log(data)

                            let arDG = data.data
                            $scope.syncOutcomeDownloadSummary = {details:[],changed:0}

                            //replace each one. Leaves any that aren't in the library
                            arDG.forEach(function (dg) {
                                if (dg.kind == 'dg') {      //shouldn't need to check, but there's rubbish in the library ATM
                                    let existingDG = allDG[dg.name]
                                    if (existingDG) {
                                        if (angular.toJson(dg) !== angular.toJson(existingDG)) {
                                            //the DG exists on the local systemn and is different
                                            //is the existing one checked out by the current user
                                            if (user && existingDG.checkedOut == user.email) {
                                                //this is checked out to the current user. Don't download
                                                $scope.syncOutcomeDownloadSummary.details.push({msg : `${dg.name} not updated as it is checked out to the current user`})
                                            } else {
                                                //either no user, or the DG is not checked out to them
                                                allDG[dg.name] = dg
                                                $scope.syncOutcomeDownloadSummary.details.push({msg : `${dg.name} updated`})
                                            }
                                        }
                                    } else {
                                        //this is a new DG
                                        allDG[dg.name] = dg
                                        $scope.syncOutcomeDownloadSummary.details.push({msg : `${dg.name} added`})
                                    }
                                }

                            })

                        },
                        function (err) {
                            console.log(err)
                        }
                    )
                }

            }

            //update all the DG on the server...
            $scope.updateRepo = function () {
                if (confirm('Are you sure you wish to update the Library')) {
                    let qry = "/model/DG"

                    let vo = {hashAllDG:allDG}
                    vo.user = user

                    $http.post(qry,vo).then(
                        function (data) {
                            console.log(data)
                            $scope.syncOutcomeUpload = data.data

                            //create a summary object
                            $scope.syncOutcomeUploadSummary = {details:[],changed:0}
                            $scope.syncOutcomeUploadSummary.total = $scope.syncOutcomeUpload.length

                            $scope.syncOutcomeUpload.forEach(function (item) {
                                if (item.saved) {
                                    $scope.syncOutcomeUploadSummary.details.push(item)
                                    $scope.syncOutcomeUploadSummary.changed ++
                                }
                            })


                            //alert("All local DataGroups have been uploaded to the Library")
                            //$scope.$close()
                        },
                        function (err) {
                            console.log(err)
                        }
                    )
                }
            }

            $scope.checkin = function (model) {

                if (model.checkedOut == user.email) {
                    if ( confirm("Are you sure you want to check this in to the Library")) {
                        librarySvc.checkIn (model,user,function(){
                            makeDGSummary(allDG,$scope.libraryDG)
                        })

                    }
                } else {
                    alert("Sorry, only the user who has checked out the resource can check it back in")
                }



            }

        })