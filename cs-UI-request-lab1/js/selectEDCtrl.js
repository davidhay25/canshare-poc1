angular.module("pocApp")
    .controller('selectEDCtrl',
        function ($scope,DG,$http,modelsSvc,insertNode,$filter) {

            $scope.linkedDGName = DG.linkedDG

            //create a list of all current children of the node where these items are to be inserted.
            //Don't insert anything with the same name
            let currentChildren = []
            let currentPath = $filter('dropFirstInPath')(insertNode.data.ed.path)  //this is the full path with the DG name as a prefix, so drop the DF name

            for (let ed of DG.diff) {
                let path = ed.path  //no DG prefix
                if (path.startsWith(currentPath + '.') ) {
                    console.log(path)
                    let newPath = path.replace(currentPath + '.',"")
                    console.log(newPath)
                    let ar = newPath.split('.')
                    currentChildren.push(ar[0])
                }

            }

            console.log(currentChildren)


            $scope.input = {selected:{}};


            $http.get(`/frozen/${$scope.linkedDGName}`).then(
                function (data) {
                    $scope.linkedDG = data.data

                    let ar = []
                    for (const ed of $scope.linkedDG.diff) {
                        ar.push({ed:ed})
                    }

                    let treeData = modelsSvc.makeTreeFromElementList(ar)

                    drawDGTree(treeData)


                }, function (err) {
                    alert (angular.toJson(err.data))
                }
            )

            $scope.select = function () {


                let arSelected = []

                //set the path to the last segment, checking for dups
                let hashPath = {}
                let dups = []
                if ($scope.selectedED) {
                    for (const ed of $scope.selectedED) {
                        if (ed.type) {  //'real' eds have a type
                            let ar = ed.path.split('.')
                            let newPath = ar[ar.length-1]
                            if (hashPath[newPath]) {
                                dups.push(ed)
                            } else {
                                ed.path = newPath
                                hashPath[newPath] = ed
                            }
                        }

                    }
                }

                // ??? todo - what to do with dups - ?rename ?reject


                for (const key of Object.keys(hashPath)) {
                    arSelected.push(hashPath[key])

                }

                $scope.$close(arSelected)
            }

            function drawDGTree(treeData) {
                //enable drag / drop for re-ordering


                $('#selectTree').jstree('destroy');

                let x = $('#selectTree').jstree(
                    {'core':
                            {'multiple': true,
                                'animation' : 0,
                                'data': treeData,
                                'themes': {name: 'proton', responsive: true}},
                        'check_callback' : true,
                        plugins:['checkbox']

                    }


                ).on('select_node.jstree', function (e, data) {

                    makeSelectedList()
                    $scope.edForJsonDisplay = data.node.data.ed

                    $scope.$digest();       //as the event occurred outside of angular...

                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    //$(this).jstree("open_node",id);
                    $(this).jstree("open_all");  //open all nodes

                    $scope.$digest()
                }).on('deselect_node.jstree', function (e, data) {
                    makeSelectedList()
                    delete $scope.edForJsonDisplay


                    $scope.$digest();       //as the event occurred outside of angular...


                })




            }

            function makeSelectedList() {
                $scope.issues = []
                let selectedIds = $('#selectTree').jstree('get_selected');
                $scope.selectedED = []


                selectedIds.forEach(function (id) {
                    let node = $('#selectTree').jstree('get_node', id)
                    let ed = node.data.ed

                    //if the last element of the path is in the 'current' list then don't add...
                    let segment = $filter('lastInPath')(ed.path)
                    let canAdd = true
                    if (currentChildren.indexOf(segment) > -1) {
                        $scope.issues.push(`${ed.path} already in DG`)
                        canAdd = false
                    }

                    if (! ed.type) {
                        $scope.issues.push(`${ed.path} has no type`)
                        canAdd = false
                    }

                    if (ed.type && ed.type[0] == 'Group') {
                        $scope.issues.push(`${ed.path} is a group and isn't added`)
                        canAdd = false
                    }


                    if (canAdd) {
                        $scope.selectedED.push(ed)
                    }






                });

                checkForIssues($scope.selectedED)
                //console.log($scope.selectedED)
            }

            function checkForIssues(lst,clean) {

                for (let ed of lst) {
                    if (ed.enableWhen) {
                        let iss = `${ed.path} has conditionals (EnableWhen) set.`
                        $scope.issues.push(iss)
                        if (clean) {
                            addIssue(ed,iss)
                            delete ed.enableWhen
                        }
                    }
                    //conditional vs
                }

                function addIssue(ed,iss) {
                    ed.issues = ed.issues || []
                    ed.issues.push(iss)
                }

            }

        }
    )