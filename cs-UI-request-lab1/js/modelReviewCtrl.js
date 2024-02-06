angular.module("pocApp")
    .controller('modelReviewCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelCompSvc,$timeout,$uibModal,makeQSvc,utilsSvc) {

            $scope.input = {}

            //todo - **** will need to be a query against the library


            $http.get('/model/allDG').then(
                function (data) {
                    console.log(data.data)
                    $scope.hashAllDG = {}
                    data.data.forEach(function (dg) {
                        $scope.hashAllDG[dg.name] = dg

                    })

                }
            )

            $http.get('/model/allCompositions').then(
                function (data) {
                    console.log(data.data)
                    $scope.hashAllCompositions = {}
                    data.data.forEach(function (comp) {
                        $scope.hashAllCompositions[comp.name] = comp

                    })
                }
            )


            //$scope.hashAllCompositions = $localStorage.world.compositions
            //$scope.hashAllDG = $localStorage.world.dataGroups

            $scope.version = utilsSvc.getVersion()

            //todo - currently generating $scope.input.types as a byproduct of validation. move to service
            let vo1 = modelsSvc.validateModel($localStorage.world)
            $scope.input.types = vo1.types      //a hash keyed by name



            //when a QR is created by the renderform directive -
            $scope.$on('elementSelected',function(event,vo) {
                // selectedCompositionNode.data.ed

                let linkId = vo.cell.item.linkId
                $scope.currentLinkId = linkId

                $scope.commentsThisPath = $scope.commentsThisComp[linkId]

                console.log(linkId)

                //this is just making up a node to match the tree
                $scope.selectedCompositionNode = {data:{}}
                if ($scope.hashCompElements[linkId]) {
                    $scope.selectedCompositionNode.data.ed = $scope.hashCompElements[linkId].ed
                }




                console.log(vo)
            })




            //add a comment to the current comp
            $scope.addComment = function (note) {
                //let path = $scope.selectedCompositionNode.data.ed.path

                path = $scope.currentLinkId


                let compName = $scope.selectedComp.name


                let comment = {path:path,compName:compName, comment:note}   //will need to add path when saving to db
                comment.id = 'id-'+ new Date().getTime()
                comment.author = $scope.input.author


                let url = "review"
                $http.post(url,comment).then(
                    function (data) {
                        //alert('Comment has been saved')
                        //console.log(data)
                        $scope.setCommentsThisComp(function(){
                            $scope.commentsThisPath = $scope.commentsThisComp[path]
                        })



                    }, function (err) {
                        alert (angular.toJson(err))
                    }
                )


               // temp[path].push(comment)

                //$localStorage.world.comments[compName].push(comment)
                delete $scope.input.comment




            }

            $scope.expandCompTree = function () {
                $('#compositionTree').jstree('open_all');
            }

            //passes in a single review to update
            $scope.addDisposition = function(comment) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/disposition.html',
                    backdrop: 'static',
                    controller: function ($scope, comment) {
                        $scope.input = {}
                        $scope.comment = comment
                        csDisposition = "http://canshare.com/fhir/CodeSystem/disposition-code"

                        $scope.input = {}

                        $scope.input.dispositionOptions = []
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'accept',
                            'display': "Change fully accepted"
                        })
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'mod',
                            'display': "Change partially accepted"
                        })
                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'decline',
                            'display': "Change not accepted"
                        })

                        $scope.input.dispositionOptions.push({
                            system: csDisposition,
                            code: 'noted',
                            'display': "Noted"})

                        $scope.saveDisposition = function() {
                            comment.disposition = $scope.input.disposition
                            comment.dispositionNote = $scope.input.dispositionNote
                            $scope.$close(comment)
                        }
                    },
                    resolve: {
                        comment: function () {
                            return angular.copy(comment)
                        }
                    }

                }).result.then(function (c) {
                    //c is an updated comment

                    let compName = $scope.selectedComp.name

                    let qry = `review/${compName}`
                    $http.put(qry,c).then(
                        function (data) {
                            console.log(data)

                            $scope.setCommentsThisComp()


                            comment = c         //so the change will
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )

/*

                    let hashCommentsForPath = $localStorage.world.comments[compName]

                    //todo - not saving. move to db.

                    Object.keys(hashCommentsForPath).forEach(function (key) {
                        if (key == c.path) {

                            hashCommentsForPath[key].forEach(function(com){
                                if (com.id == c.id) {
                                    com.disposition = c.disposition
                                    com.dispositionNote = c.dispositionNote

                                }
                            })

                        }
                    })

                    */




                    //comment.disposition = c.disposition
                })
            }


            $scope.viewVS = function (item,refsetId) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return item
                        }, refsetId : function () {
                            return refsetId
                        }
                    }

                })
            }


            //get all the comments
            $scope.setCommentsThisComp = function(vo) {
                let compName = $scope.selectedComp.name
                delete $scope.allComments
                $scope.commentsThisComp = {}

                let url = `review/${compName}`
                $http.get(url).then(
                    function (data) {
                        console.log(data)
                        //what gets returned is an array of comments for this composition (based on name)
                        //the array may be empty
                        //convert it to a hash keyed on path with the contents as an array of comments

                        $scope.allComments = data.data
                        if (data.data && data.data.length > 0) {

                            data.data.forEach(function (comment) {
                                let path = comment.path
                                $scope.commentsThisComp[path] = $scope.commentsThisComp[path] || []
                                $scope.commentsThisComp[path].push(comment)
                            })
                        }

                        console.log($scope.commentsThisComp)

                        //now construct a summary of comments by section
                        $scope.commentsBySection = {}
                        $scope.allComments.forEach(function (comment) {
                            let ar = comment.path.split('.')
                            let section = ar[1]     //section is always the 2nd element
                            let control = ar[ar.length-1]   //the name of the element. May be an issue if there is a duplaicted name - like status

                            $scope.commentsBySection[section] = $scope.commentsBySection[section] || []
                            let item = {control:control,comment:comment}
                            item.shortPath = ar.slice(3).join('.')
                            $scope.commentsBySection[section].push(item)
                        })

                        //now sort by control name
                        Object.keys($scope.commentsBySection).forEach(function (key) {
                            let obj = $scope.commentsBySection[key]
                            obj.sort(function (a,b) {
                                if (a.control > b.control) {
                                    return 1
                                } else {
                                    return -1
                                }
                            })
                        })

                        if (vo) {
                            vo()
                        }

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )


                //$scope.commentsThisComp =  $localStorage.world.comments[compName] || {}
            }

            $scope.selectComposition = function (comp) {
                delete $scope.selectedComp
                //delete

                delete  $scope.fullQ
                delete  $scope.Qlog

                if (! comp) {
                    return
                }
                $scope.selectedComp = comp
                console.log(comp)


                let vo = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG)
                $scope.allCompElements = vo.allElements
                $scope.hashCompElements = vo.hashAllElements


                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                $scope.treeData = treeData      //used in the Q builder

                console.log(treeData)
                makeCompTree(treeData,rootNodeId)

                $scope.setCommentsThisComp()


            }


            function makeCompTree(treeData,rootNodeId) {
                $('#compositionTree').jstree('destroy');

                $scope.compTree = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
                        $scope.commentsThisPath = $scope.commentsThisComp[$scope.selectedCompositionNode.data.ed.path]


                        $scope.currentLinkId = $scope.selectedCompositionNode.data.ed.path


                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);

                    let treeObject = $(this).jstree(true).get_json('#', { 'flat': false })


                    let strategy = null
                    asyncCall(treeObject,$scope.selectedComp,
                        strategy)


                    //$scope.$digest();
                });

            }
            async function asyncCall(treeObject,comp,strategy) {
                console.log('calling');
                console.time('q')


                //$scope.fullQ = await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)

                let voQ = await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)

                //$scope.fullQ = await makeQSvc.makeQFromTree(treeObject,comp,strategy)
                $scope.fullQ = voQ.Q //await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)
                $scope.Qlog = voQ.log   //the log of activity that occurred as the Q was created
                //this is a version structured for tabs.
                //$scope.fullQTab = voQ.Q //await makeQSvc.makeQFromTreeTab(treeObject,comp,strategy)
                $scope.$digest();

            }

            /*
            //todo - temp, for debugging
            $timeout(function(){
                $scope.selectComposition($scope.hashAllCompositions['PathRequest'])
               // makeAllCommentsSummary()
            },500)

*/

        })