//seversync is actually the main library interface
angular.module("pocApp")
    .controller('libraryCtrl',
        function ($scope,$http,allDG,allComp,$sce) {

            $scope.input = {}
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
                    console.log($scope.libraryDG)
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
                    console.log($scope.libraryComp)
                    makeCompSummary(allComp,$scope.libraryComp)
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
                    console.log("Issue sorting DG - likey a missing title",ex)
                }



            }

            $scope.downloadComp = function(comp) {
                //set the comp property of the vo and exit. The caller (modelsCtrl.js) will update
                $scope.$close({comp:comp})

            }

            $scope.refreshFromRepo = function () {
                if (confirm('Are you sure you wish to refresh your local DGs from the Library')) {
                    let qry = '/model/allDG'
                    $http.get(qry).then(
                        function (data) {
                            //console.log(data)

                            let arDG = data.data

                            //replace each one. Leaves any that aren't in the library
                            arDG.forEach(function (dg) {
                                allDG[dg.name] = dg

                            })

                            alert("Local DataGroups have been updated. Any local ones not in the library are untouched.")
                            $scope.$close(true)

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
                    $http.post(qry,allDG).then(
                        function (data) {
                            console.log(data)
                            alert("All local DataGroups have been uploaded to the Library")
                            $scope.$close()
                        },
                        function (err) {
                            console.log(err)
                        }
                    )
                }
            }

        })