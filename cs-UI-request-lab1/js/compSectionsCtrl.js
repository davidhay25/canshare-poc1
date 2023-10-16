angular.module("pocApp")
    .controller('compSectionsCtrl',
        function ($scope,$http,$q,$timeout,modelDGSvc,modelsSvc) {

            $scope.local = {}   //so as not to mask the input from the parent

            function clear() {
                delete $scope.selectedSection
                delete $scope.selectedItem
            }



            $scope.moveSectionUp = function(inx) {
                if (inx > 0) {
                    let sectToMove = $scope.selectedModel.sections[inx]
                    let sect = $scope.selectedModel.sections.splice(inx,1)[0]
                    $scope.selectedModel.sections.splice(inx-1,0,sect)
                    $scope.selectComposition($scope.selectedModel)  //in modelCtrl
                }

            }

            $scope.moveSectionDown = function(inx) {
                if (inx < $scope.selectedModel.sections.length -1) {
                    let sectToMove = $scope.selectedModel.sections[inx]
                    let sect = $scope.selectedModel.sections.splice(inx,1)[0]
                    $scope.selectedModel.sections.splice(inx+1,0,sect)
                    $scope.selectComposition($scope.selectedModel)  //in modelCtrl
                }
            }
            
            $scope.removeSection = function (inx) {
                //$scope.selectedModel.sections = $scope.selectedModel.sections || []
                let sect = $scope.selectedModel.sections[inx]
                if (sect.items.length > 0) {
                    alert("You must remove the DGs first.")
                    return
                }
                $scope.selectedModel.sections.splice(inx,1)
                $scope.selectComposition($scope.selectedModel)  //in modelCtrl
            }



            $scope.showDG = function () {
                $scope.termSelectDG({DGName:$scope.selectedItem.type[0]})
            }

            $scope.moveDGDown = function(inx) {
                if (inx < $scope.selectedSection.items.length -1) {
                    //let itemToMove = $scope.selectedSection.items[inx]
                    let item = $scope.selectedSection.items.splice(inx,1)[0]
                    $scope.selectedSection.items.splice(inx+1,0,item)
                    $scope.selectComposition($scope.selectedModel)  //in modelCtrl
                }
            }

            $scope.moveDGUp = function(inx) {
                if (inx >0) {
                    //let itemToMove = $scope.selectedSection.items[inx]

                    let dg = $scope.selectedSection.items.splice(inx,1)[0]
                    $scope.selectedSection.items.splice(inx-1,0,dg)
                    $scope.selectComposition($scope.selectedModel)  //in modelCtrl

                   // let item = $scope.selectedSection.items.splice(inx,1)[0]
                   // $scope.selectedSection.items.splice(inx+1,0,item)
                }
            }


            $scope.removeDG = function (inx) {
                $scope.selectedSection.items.splice(inx,1)
                $scope.selectComposition($scope.selectedModel)  //in modelCtrl
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
                delete $scope.fullElementList
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
                $scope.selectComposition($scope.selectedModel)  //in modelCtrl

            }

            $scope.addSectionItem = function (dg) {
                if ($scope.selectedSection) {
                    $scope.selectedSection.items = $scope.selectedSection.items || []

                    //the name must be unique
                    let name = dg.name


                    let ctr = 0
                    //count the number of times (if any) that this path appears
                    $scope.selectedSection.items.forEach(function (item) {
                        console.log(item)
                        if (item.name.startsWith(name)) {
                            ctr++
                        }
                    })

                    if (ctr > 0) {
                        name = name + ctr
                    }

                    let item = {name:name,title:dg.name,mult:'0..1'}
                    item.type = [dg.name]


                    $scope.selectedSection.items.push(item)
                    $scope.selectComposition($scope.selectedModel)  //in modelCtrl
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