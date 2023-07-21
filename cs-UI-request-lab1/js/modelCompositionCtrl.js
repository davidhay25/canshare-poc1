angular.module("pocApp")
    .controller('modelCompositionCtrl',
        function ($scope,$uibModal) {


            $scope.editOptionsList = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editOptionsList.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller : function ($scope,ed) {
                        $scope.input = {}
                        $scope.ed = ed

                        $scope.parseList = function (txt) {
                            $scope.ed.options = []
                            console.log(txt)
                            let lines = txt.split('\n')
                            lines.forEach(function (lne) {
                                let option = {}
                                option.pt = lne
                                $scope.ed.options.push(option)

                            })
                            //console.log(ar)
                        }


                        $scope.parseSnomed = function (txt) {
                            $scope.ed.options = []
                            console.log(txt)
                            let lines = txt.split('\n')
                            lines.forEach(function (lne) {
                                let ar = lne.split('\t')
                                console.log(ar)
                                let option = {}
                                option.code = ar[0]
                                option.pt = ar[1]
                                $scope.ed.options.push(option)

                            })
                            //console.log(ar)
                        }


                        $scope.save = function () {
                            $scope.$close($scope.ed)
                        }
                    },

                    resolve: {
                        ed: function () {
                            return ed
                        }
                    }

                }).result.then(function (updatedEd) {
                    //$scope.selectedCompositionNode.data.ed.options = updatedEd.options
                    //return

                    $scope.selectedModel.override = $scope.selectedModel.override || {}
                    $scope.selectedModel.override[ed.path] = updatedEd
                    $scope.selectComposition($scope.selectedModel)  //in parent

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
            }

            $scope.changeValueSet = function (ed) {
                let vsUrl = prompt("Enter the ValueSet url")
                if (vsUrl) {
                    let newEd = angular.copy(ed)
                    newEd.valueSet = vsUrl
                    $scope.selectedModel.override = $scope.selectedModel.override || {}
                    $scope.selectedModel.override[newEd.path] = newEd
                    //delete $scope.selectedCompositionNode
                    $scope.selectComposition($scope.selectedModel)  //in parent
                }
            }

            $scope.removeElement = function (ed) {

                let newEd = angular.copy(ed)
                newEd.mult = "0..0"
                $scope.selectedModel.override = $scope.selectedModel.override || {}
                $scope.selectedModel.override[newEd.path] = newEd
                //delete $scope.selectedCompositionNode
                $scope.selectComposition($scope.selectedModel)  //in parent

            }

            $scope.addDGtoSection = function (section,DG,name) {

                let sectionItem = {}
                sectionItem.name = name || DG.name;
                sectionItem.title = DG.title;
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

