angular.module("pocApp")
    .controller('modelReviewCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelsDemoSvc,modelCompSvc,$timeout,$uibModal) {

            $scope.input = {}

            if (! $localStorage.world) {
                    $localStorage.world = modelsDemoSvc.getDemo()
                console.log("Re-creating world")
            }

            //todo while developing, store commemts in browser cache. Move to db later
            $localStorage.world.comments = $localStorage.world.comments || {}

            //console.log($localStorage.world.comments)

            $scope.hashAllCompositions = $localStorage.world.compositions



            let vo1 = modelsSvc.validateModel($localStorage.world)
            $scope.errors = vo1.errors
            $scope.input.types = vo1.types      //a hash keyed by name


            function makeAllCommentsSummary(){
                $scope.allComments = []
                let compName = $scope.selectedComp.name
                let temp = $localStorage.world.comments[compName]       //hash keyed by path
                if (temp) {
                    Object.keys(temp).forEach(function (key) {
                        let arComments = temp[key]
                        arComments.forEach(function (note) {
                            let comment = {id:note.id,comment:note.comment,path:key,disposition : note.disposition,
                                dispositionNote: note.dispositionNote,author:note.author}
                            $scope.allComments.push(comment)
                        })
                    })
                }


            }

            //add a comment to the current comp
            $scope.addComment = function (note) {
                let path = $scope.selectedCompositionNode.data.ed.path
                let compName = $scope.selectedComp.name
                $localStorage.world.comments[compName] = $localStorage.world.comments[compName] || {}
                let temp = $localStorage.world.comments[compName]
                temp[path] = temp[path] || []

                let comment = {comment:note}   //will need to add path when saving to db
                comment.id = 'id-'+ new Date().getTime()
                comment.author = $scope.input.author
                temp[path].push(comment)

                //$localStorage.world.comments[compName].push(comment)
                delete $scope.input.comment

                makeAllCommentsSummary()
                setCommentsThisComp()
                //alert("Comment added")

                $scope.commentsThisPath = $scope.commentsThisComp[path]

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
                        csDisposition = "http://clinfhir.com/fhir/CodeSystem/disposition-code"

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
                            return comment
                        }
                    }

                }).result.then(function (c) {
                    //c is an updated comment

                    let compName = $scope.selectedComp.name
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


            function setCommentsThisComp() {
                let compName = $scope.selectedComp.name
                $scope.commentsThisComp =  $localStorage.world.comments[compName] || {}
            }

            $scope.selectComposition = function (comp) {
                $scope.selectedComp = comp
                console.log(comp)


                let vo = modelCompSvc.makeFullList(comp,$scope.input.types)
                $scope.allCompElements = vo.allElements
                $scope.hashCompElements = vo.hashAllElements


                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                $scope.treeData = treeData      //used in the Q builder

                console.log(treeData)
                makeCompTree(treeData,rootNodeId)

                setCommentsThisComp()
                makeAllCommentsSummary()

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


                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    $scope.$digest();
                });

            }


            //todo - temp, for debugging
            $timeout(function(){
                $scope.selectComposition($scope.hashAllCompositions['PathRequest'])
               // makeAllCommentsSummary()
            },500)



        })