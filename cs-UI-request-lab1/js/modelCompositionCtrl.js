angular.module("pocApp")
    .controller('modelCompositionCtrl',
        function ($scope) {

            $scope.addDGtoSection = function (section,DG) {
                console.log(DG)
                console.log(section)
                //sectionItem is {name: title: type: mult:}
                let sectionItem = {}
                sectionItem.name = DG.name;
                sectionItem.title = DG.title;
                sectionItem.type = [DG.name]
                sectionItem.mult = "0..1"
                $scope.selectedModel.sections.forEach(function (sect) {
                    console.log(sect)
                    if (sect.name == section.name) {
                        sect.items.push(sectionItem)
                    }
                })
                $scope.selectComposition($scope.selectedModel)  //in parent
            }

            $scope.removeDGfromSection = function(item) {
                console.log(item)
            }

            $scope.addSection = function (comp,title) {
                let name = title.replace(/\s/g, '');
                let section = {kind:'section',name:name,title:title,items:[]}
                comp.sections = comp.sections || []
                comp.sections.push(section)
                $scope.selectComposition($scope.selectedModel)  //in parent
            }

        }
    )

