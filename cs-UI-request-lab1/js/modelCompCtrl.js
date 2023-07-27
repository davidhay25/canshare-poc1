//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelCompositionCtrl',
        function ($scope,$uibModal,$timeout) {


            $scope.compositionKind = ['request','report','general']
           // $scope.tumourStream = ['breast','gyne','lung','gi']

            $scope.selectCompTreePath = function (path) {


                $timeout(function () {

                    //let fullPath = `${item.hiddenDGName}.${item.path}`

                    $("#compositionTree").jstree("select_node",  path);
                    $("#compositionTree").jstree("open_node",  path);

                    $scope.input.compTabActive = $scope.compUi.tree //make sure the tree is selected

                },500)


            }

            $scope.editOptionsList = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: 'optionsCtrl',


                    resolve: {
                        ed: function () {
                            return ed
                        },
                        readOnly : function () {
                            return false
                        }
                    }

                }).result.then(function (updatedEd) {
                    //$scope.selectedCompositionNode.data.ed.options = updatedEd.options
                    //return

                    $scope.selectedModel.override = $scope.selectedModel.override || {}
                    $scope.selectedModel.override[ed.path] = updatedEd
                    $scope.selectComposition($scope.selectedModel)  //in parent
                    $scope.selectCompTreePath(ed.path)

                })
            }

            $scope.getRowColour = function (ed) {
                let colour
                switch (ed.kind) {
                    case 'section' :
                        colour = "#eee"
                        break

                }
                return colour
            }

            $scope.addZElement = function (parentEd,types) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addZElement.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller : function ($scope,hashTypes) {
                        $scope.input = {}

                        $scope.input.types = Object.keys(hashTypes)
                        $scope.input.types.sort()
                        $scope.input.mults = ['0..1','1..1','0..*','1..*']
                        $scope.input.mult = $scope.input.mults[0]

                        $scope.save = function () {
                            $scope.$close($scope.input)
                        }
                    },

                    resolve: {
                        hashTypes: function () {
                            return $scope.input.types
                        }
                    }

                }).result.then(function (vo) {
                    let ed = {kind:'element'}   //todo could be a dg
                    ed.name = vo.name
                    ed.title = vo.title
                    ed.mult = vo.mult
                    ed.description = vo.description
                    ed.valueSet = vo.valueSet
                    ed.type = [vo.type]
                    ed.path = `${parentEd.path}.${vo.name}`
                    ed.zElement = true
                    $scope.selectedModel.override = $scope.selectedModel.override || {}
                    $scope.selectedModel.override[ed.path] = ed
                    //delete $scope.selectedCompositionNode
                    $scope.selectComposition($scope.selectedModel)  //in parent
                    $scope.selectCompTreePath(ed.path)

                })
            }
        
            $scope.getOverridesCount = function () {
                if ($scope.selectedModel && $scope.selectedModel.override) {
                    return Object.keys($scope.selectedModel.override).length
                }

            }
        
            $scope.revertOverride = function (path) {
                delete $scope.selectedModel.override[path]
                $scope.selectComposition($scope.selectedModel)  //in parent
                $scope.selectCompTreePath(path)
            }

            $scope.changeValueSet = function (ed) {
                let vsUrl = prompt("Enter the ValueSet url")
                if (vsUrl) {
                    let newEd = angular.copy(ed)
                    let oldVS = ed.valueSet

                    newEd.valueSet = vsUrl
                    newEd.oldValueSet = oldVS
                    $scope.selectedModel.override = $scope.selectedModel.override || {}
                    $scope.selectedModel.override[newEd.path] = newEd
                    //delete $scope.selectedCompositionNode
                    $scope.selectComposition($scope.selectedModel)  //in parent
                    $scope.selectCompTreePath(ed.path)
                }
            }

            $scope.removeElement = function (ed) {

                let newEd = angular.copy(ed)
                newEd.mult = "0..0"
                $scope.selectedModel.override = $scope.selectedModel.override || {}
                $scope.selectedModel.override[newEd.path] = newEd
                //delete $scope.selectedCompositionNode
                $scope.selectComposition($scope.selectedModel)  //in parent

                //display the section
                let ar = ed.path.split('.')
                ar.pop()
                let sectionPath = ar.join('.')
                $scope.selectCompTreePath(sectionPath)
            }

            $scope.addDGtoSection = function (section,DG,name,title) {

                if (name) {
                    name = name.replace(/\s/g,'')
                }

                let sectionItem = {}
                sectionItem.name = name || DG.name;
                sectionItem.title = title || DG.title;
                sectionItem.type = [DG.name]
                sectionItem.mult = "0..1"
                $scope.selectedModel.sections.forEach(function (sect) {
                    //console.log(sect)
                    if (sect.name == section.name) {
                        sect.items.push(sectionItem)
                    }
                })
                delete $scope.selectedCompositionNode
                $scope.selectComposition($scope.selectedModel)  //in parent

                delete $scope.input.newCompName
                delete $scope.input.newCompTitle
                delete $scope.input.newCompType

                $scope.selectCompTreePath(`${section.path}.${sectionItem.name}`)
            }



            $scope.addSection = function (comp,title) {
                let name = title.replace(/\s/g, '');
                let section = {kind:'section',name:name,title:title,items:[]}
                comp.sections = comp.sections || []
                comp.sections.push(section)
                delete $scope.input.newSectionTitle
                $scope.selectComposition($scope.selectedModel)  //in parent
                let id = `${comp.name}.${name}`
                $scope.selectCompTreePath(id)
            }

        }
    )

