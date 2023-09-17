angular.module("pocApp")
    .controller('changeTypeCtrl',
        function ($scope,ed,hashAllDG,modelsSvc) {
            $scope.ed = ed
            $scope.input = {}
            let currentType = ed.type[0]

            $scope.fhirTypes = modelsSvc.fhirDataTypes()

            if (hashAllDG[currentType]) {
                //this is a DG - find the subtypes / supertypes

                //find all child nodes
                $scope.hashChildren = {}

                let addedOne = true
                while (addedOne) {
                    addedOne = false
                    Object.keys(hashAllDG).forEach(function (key) {
                        let dg = hashAllDG[key]
                        if (dg.parent) {
                            //is this a child
                            if (! $scope.hashChildren[dg.name]) {    //ignore any children we've already found
                                if (dg.parent == currentType || $scope.hashChildren[dg.parent]) {
                                    $scope.hashChildren[dg.name] = dg
                                    addedOne = true
                                }
                            }
                        }

                    })
                }
                console.log($scope.hashChildren)
            }

            $scope.selectDG = function (dg) {
                $scope.selectedDG = dg

                let allTypes = angular.copy(hashAllDG)
                for (const fhirDT of $scope.fhirTypes) {
                    allTypes[fhirDT] = fhirDT
                }



                //todo allTypes is a combination of hashAllDG & FHIR DT - could be refactored
                let vo = modelsSvc.getFullListOfElements(dg,allTypes,hashAllDG)
                $scope.cdFullElementList = modelsSvc.makeOrderedFullList(vo.allElements)
                let treeData = modelsSvc.makeTreeFromElementList($scope.cdFullElementList)
                makeDGTree(treeData)
            }

            function makeDGTree(treeData) {
                $('#cdtTree').jstree('destroy');

                let x = $('#cdtTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;

                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes



                    //console.log($("#dgTree").jstree(true).get_json('#', { 'flat': true }))
                    //console.log($("#dgTree").jstree(true).get_json('#'))

                    $scope.$digest();
                });

            }



        })