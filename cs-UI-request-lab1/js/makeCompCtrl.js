angular.module("pocApp")
    .controller('makeCompCtrl',
        function ($scope,$http,$q,$timeout,modelDGSvc,modelsSvc) {

            $scope.local = {}   //so as not to mask the input from the parent

            function clear() {
                delete $scope.selectedSection
                delete $scope.selectedItem
            }


            $scope.removeDG = function (inx) {
                $scope.selectedSection.items.splice(inx,1)

            }

            $scope.setup = function () {
                let vo1 = modelDGSvc.makeTreeViewOfDG($scope.hashAllDG)
                $timeout(function () {
                    showDGTree(vo1.treeData)
                },500)

            }
            $scope.setup()

            $scope.selectSection = function (section) {
                clear()
                delete $scope.fullElementListPossible
                delete $scope.selectedNewDG
                $scope.selectedSection = section

            }

            //select a section item
            $scope.selectItem = function (item) {
                //clear()
                delete $scope.fullElementListPossible
                delete $scope.selectedNewDG
                $scope.selectedItem = item
                let type = item.type[0]
                let dg = $scope.hashAllDG[type]         //from parent scope

                let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)
                $scope.fullElementList = modelsSvc.makeOrderedFullList(vo.allElements)



            }

            $scope.addSection = function (name,title) {
                title = title || name
                $scope.selectedModel.sections = $scope.selectedModel.sections || []
                $scope.selectedModel.sections.push({kind:'section',name:name,title:title,mult:'0..1',items:[]})
                delete $scope.local.sectionName
                delete $scope.local.sectionTitle

            }

            $scope.addSectionItem = function (dg) {
                if ($scope.selectedSection) {
                    $scope.selectedSection.items = $scope.selectedSection.items || []
                    let item = {name:dg.name,title:dg.name,mult:'0..1'}
                    item.type = [dg.name]
                    $scope.selectedSection.items.push(item)
                }

                delete $scope.fullElementListPossible
                delete $scope.selectedNewDG

            }

            function showDGTree(treeData) {
                $('#dgSelectTree').jstree('destroy');

                $scope.allDGTree = $('#dgSelectTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        let dg = data.node.data.dg

                        //use the dg out of $scope.hashAllDG - not the copy in the tree data
                        if (dg && $scope.hashAllDG[dg.name]) {
                            $scope.selectedNewDG = dg

                            //get the ful elementList for this DG. Will be displayed below the section items

                            let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)
                            //sort the elements list to better display slicing
                            $scope.fullElementListPossible = modelsSvc.makeOrderedFullList(vo.allElements)

                        }
                        $scope.$digest()

                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);

                    if ($scope.selectedModel) {
                        $(this).jstree("open_node",$scope.selectedModel.name);
                        $(this).jstree("select_node",$scope.selectedModel.name);
                    }


                    $scope.$digest();
                });
            }



        })