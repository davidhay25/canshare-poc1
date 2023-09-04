angular.module("pocApp")
    .controller('modelReviewCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelsDemoSvc,modelCompSvc,$timeout) {

            $scope.input = {}

            if (! $localStorage.world) {
                    $localStorage.world = modelsDemoSvc.getDemo()
            }

            //todo while developing, store commemts in browser cache. Move to db later
            $localStorage.world.comments = $localStorage.world.comments || {}

            console.log($localStorage.world.comments)

            $scope.hashAllCompositions = $localStorage.world.compositions



            let vo1 = modelsSvc.validateModel($localStorage.world)
            $scope.errors = vo1.errors
            $scope.input.types = vo1.types      //a hash keyed by name


            function makeAllCommentsSummary(){
                $scope.allComments = []
                let compName = $scope.selectedComp.name
                let temp = $localStorage.world.comments[compName]       //hash keyed by path
                Object.keys(temp).forEach(function (key) {
                    let arComments = temp[key]
                    arComments.forEach(function (note) {
                        let comment = {comment:note.comment,path:key}
                        $scope.allComments.push(comment)
                    })
                })

               // $scope.allComments = temp

            }

            //add a comment to the current comp
            $scope.addComment = function (note) {
                let path = $scope.selectedCompositionNode.data.ed.path
                let compName = $scope.selectedComp.name
                $localStorage.world.comments[compName] = $localStorage.world.comments[compName] || {}
                let temp = $localStorage.world.comments[compName]
                temp[path] = temp[path] || []


                let comment = {comment:note}   //will need to add path when saving to db
                temp[path].push(comment)
                //$localStorage.world.comments[compName].push(comment)

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


            }


            function makeCompTree(treeData,rootNodeId) {
                $('#compositionTree').jstree('destroy');

                $scope.compTree = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
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
                makeAllCommentsSummary()
            },500)



        })