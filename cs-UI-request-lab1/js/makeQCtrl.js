angular.module("pocApp")
    .controller('makeQCtrl',
        function ($scope) {


            $scope.initQ = function (comp) {
                console.log(comp)

                //create initial tree
                let treeData = []
                let root = {id:"root",text: "root",parent:'#',data:{level:'root'}}
                treeData.push(root)
                comp.sections.forEach(function (sect) {
                    let sectionData = {level:'section',DG:[]}
                    //add all the DG to the section data. todo - need to incorporate all overrides
                    //there is other section level metadata that may be useful as well
                    sect.items.forEach(function (item) {
                        let dg = $scope.hashAllDG[item.type[0]]
                        sectionData.DG.push(dg)
                    })

                    let sectionNode = {id:sect.name,text:sect.name,parent:'root',data:sectionData}
                    treeData.push(sectionNode)
                })
                drawtree(treeData)

            }


            function drawtree(treeData) {
                $('#qtree').jstree('destroy');

                $scope.allDGTree = $('#qtree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    delete $scope.possibleDG
                    if (data.node) {
                        console.log( data.node)
                        $scope.selectedQNode = data.node;

                        switch ($scope.selectedQNode.data.level) {
                            case "section":
                                $scope.possibleDG = $scope.selectedQNode.data.DG
                                break

                        }


                    }

                    $scope.$digest();

                }).bind("loaded.jstree", function (event, data) {
                    $(this).jstree("open_all");
                    $scope.$digest();
                });

            }

        })