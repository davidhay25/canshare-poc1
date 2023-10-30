angular.module("pocApp")
    .controller('compSectionsCtrl',
        function ($scope,$http,$q,$timeout,modelDGSvc,modelsSvc,modelCompSvc) {

            $scope.local = {}   //so as not to mask the input from the parent

            function clear() {
                delete $scope.selectedSection
                delete $scope.selectedItem
            }

            //============== Enable when functions ==========

            //get the possible sections where a source can be found. It cannot be the same as the section to hide/show
            //called when a section is selected
            $scope.getEwSections = function (selectedSection) {
                $scope.local.ewSections =  []
                $scope.selectedComposition.sections.forEach(function (section) {
                    if (section.name !== selectedSection.name) {
                        $scope.local.ewSections.push(section)
                    }
                })
            }

            //use building the conditional. The available sections
            $scope.getDGsForSection = function (section) {
                $scope.local.ewDGs = []         //datagroups in section
                $scope.local.ewEDs = []            //EDs in selected DG
                $scope.local.ewValues = []          //actual values for the selected DG
                if (section.items) {
                    section.items.forEach(function (item) {
                        let dg = $scope.hashAllDG[item.type[0]]
                        $scope.local.ewDGs.push(dg)
                    })
                }

            }

            //use building the conditional. The available coded elements in the given dg
            $scope.getCodedElementsForDG = function(dg) {
                $scope.local.ewEDs = []
                $scope.local.ewValues = []          //actual values for the selected DG




                if (dg) {//get the expanded / inflated DG
                    let vo = modelsSvc.getFullListOfElements(dg,$scope.input.types,$scope.hashAllDG)
                    console.log(vo)

                    vo.allElements.forEach(function (item) {
                        if (item.ed.type && item.ed.type[0] == 'CodeableConcept') {
                            $scope.local.ewEDs.push(item.ed)
                        }

                    })
                }
            }

            //return the possible values (options for now - VS to follow - like DG conditionals
            $scope.getValuesForED = function (ed) {
                $scope.local.ewValues = []          //actual values for the selected DG
                modelDGSvc.expandEdValues(ed).then(
                    function(lstCoding) {
                        console.log(lstCoding)
                        $scope.local.ewValues = lstCoding
                    },
                    function(err){
                        console.log(err)
                    }
                )

            }

            //add the EW to the list of EW's
            //todo some smarts
            $scope.addEW = function (section,dg,ed,value) {

                let ew = {targetSection:$scope.selectedSection.name, sourceSection:section.name,dg:dg.name,ed:ed.path,value:value}
                console.log(ew)

                $scope.selectedComposition.enableWhen = $scope.selectedSection.enableWhen || []
                $scope.selectedComposition.enableWhen.push(ew)
            }

            //-------------


            $scope.moveSectionUp = function(inx) {
                if (inx > 0) {
                    let sectToMove = $scope.selectedComposition.sections[inx]
                    let sect = $scope.selectedComposition.sections.splice(inx,1)[0]
                    $scope.selectedComposition.sections.splice(inx-1,0,sect)
                    $scope.selectComposition($scope.selectedComposition)  //in modelCtrl
                }

            }

            $scope.moveSectionDown = function(inx) {
                if (inx < $scope.selectedComposition.sections.length -1) {
                    let sectToMove = $scope.selectedComposition.sections[inx]
                    let sect = $scope.selectedComposition.sections.splice(inx,1)[0]
                    $scope.selectedComposition.sections.splice(inx+1,0,sect)
                    $scope.selectComposition($scope.selectedComposition)  //in modelCtrl
                }
            }
            
            $scope.removeSection = function (inx) {
                //$scope.selectedComposition.sections = $scope.selectedComposition.sections || []
                let sect = $scope.selectedComposition.sections[inx]
                if (sect.items.length > 0) {
                    alert("You must remove the DGs first.")
                    return
                }
                $scope.selectedComposition.sections.splice(inx,1)
                $scope.selectComposition($scope.selectedComposition)  //in modelCtrl
            }



            $scope.showDG = function (type) {

                $scope.termSelectDG({DGName:type})
                //$scope.termSelectDG({DGName:$scope.selectedItem.type[0]})
            }

            $scope.moveDGDown = function(inx) {
                if (inx < $scope.selectedSection.items.length -1) {
                    //let itemToMove = $scope.selectedSection.items[inx]
                    let item = $scope.selectedSection.items.splice(inx,1)[0]
                    $scope.selectedSection.items.splice(inx+1,0,item)
                    $scope.selectComposition($scope.selectedComposition)  //in modelCtrl
                }
            }

            $scope.moveDGUp = function(inx) {
                if (inx >0) {
                    //let itemToMove = $scope.selectedSection.items[inx]

                    let dg = $scope.selectedSection.items.splice(inx,1)[0]
                    $scope.selectedSection.items.splice(inx-1,0,dg)
                    $scope.selectComposition($scope.selectedComposition)  //in modelCtrl

                   // let item = $scope.selectedSection.items.splice(inx,1)[0]
                   // $scope.selectedSection.items.splice(inx+1,0,item)
                }
            }


            $scope.removeDG = function (inx) {
                $scope.selectedSection.items.splice(inx,1)
                $scope.selectComposition($scope.selectedComposition)  //in modelCtrl
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
                delete $scope.filteredElementList
                $scope.selectedSection = section

                //get the list of sections that can be part of 'enableWhen' conditionals
                $scope.getEwSections($scope.selectedSection)


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
                let lst = modelsSvc.makeOrderedFullList(vo.allElements)

                $scope.filteredElementList = modelCompSvc.filterList(lst,true)



            }

            $scope.addSection = function (name,title) {
                title = title || name
                $scope.selectedComposition.sections = $scope.selectedComposition.sections || []
                $scope.selectedComposition.sections.push({kind:'section',name:name,title:title,mult:'0..1',items:[]})
                delete $scope.local.sectionName
                delete $scope.local.sectionTitle
                $scope.selectComposition($scope.selectedComposition)  //in modelCtrl

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
                    $scope.selectComposition($scope.selectedComposition)  //in modelCtrl
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
                            let lst = modelsSvc.makeOrderedFullList(vo.allElements)

                            //and filter the list, removing 0..0 as well as the first element which is the DG root
                            $scope.fullElementListPossible = modelCompSvc.filterList(lst,true)


                        }
                        $scope.$digest()

                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);

                    if ($scope.selectedComposition) {
                        $(this).jstree("open_node",$scope.selectedComposition.name);
                        $(this).jstree("select_node",$scope.selectedComposition.name);
                    }


                    $scope.$digest();
                });
            }



        })