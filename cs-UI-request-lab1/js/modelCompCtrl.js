//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelCompositionCtrl',
        function ($scope,$uibModal,$timeout) {


            $scope.compositionKind = ['request','report','general']
           // $scope.tumourStream = ['breast','gyne','lung','gi']


            //Add or edit an override
            $scope.editOverride = function (ed) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/editDGItem.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'editDGItemCtrl',

                    resolve: {
                        item: function () {
                            return {ed:ed}
                        },
                        allTypes : function () {
                            return $scope.allTypes
                        },
                        fullElementList : function () {
                            return $scope.fullElementList
                        },
                    hashAllDG : function () {
                        return $scope.hashAllDG
                    }
                    }

                }).result.then(function (ed) {
                    let path = ed.path
                    $scope.selectedModel.override = $scope.selectedModel.override || {}
                    $scope.selectedModel.override[path] = ed
                })

            }

            $scope.selectDGForSection = function () {
                //re-using the 'change type' dialog developed for DG
                $uibModal.open({
                    templateUrl: 'modalTemplates/changeType.html',
                    //backdrop: 'static',
                    size : 'xlg',
                    controller: 'changeTypeCtrl',

                    resolve: {
                        ed: function () {
                            return null
                        },
                        hashAllDG: function () {
                            return $scope.hashAllDG
                        }
                    }

                }).result.then(function (vo) {

                    if (vo.class == 'dg') {
                        $scope.input.newCompType = vo.value
                    } else {
                        alert("A DG is expected!")
                    }
                    console.log(vo)
                })

                }

            //Open the library interaction screen that is specific to compositions
            $scope.libraryInteraction = function (comp) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/libraryComp.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'libraryCompCtrl',

                    resolve: {
                        comp: function () {
                            return comp
                        }
                    }

                }).result.then(function (comp) {
                    if (comp) {
                        //If a composition is passed back, then download was selected
                        $scope.hashAllCompositions[comp.name] = comp
                        $scope.selectComposition(comp)

                    }

                })

            }


            $scope.deleteComposition = function (comp) {
                if (confirm("Are you sure you want to remove this composition from the local store")) {
                    delete $scope.hashAllCompositions[comp.name]
                }
            }


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

            $scope.addZElement = function (parentEd) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/addZElement.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller : function ($scope,hashTypes,modelsSvc) {
                        $scope.input = {}

                       // let fhirDT = modelsSvc.fhirDataTypes()
                        let DGs = Object.keys(hashTypes).sort(function(a,b){
                            if (a.toLowerCase() > b.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                        $scope.input.types = modelsSvc.fhirDataTypes().concat(DGs)


                        //$scope.input.types.sort()
                        $scope.input.mults = ['0..1','1..1','0..*','1..*']
                        $scope.input.mult = $scope.input.mults[0]

                        $scope.save = function () {
                            $scope.$close($scope.input)
                        }
                    },

                    resolve: {
                        hashTypes: function () {
                            return $scope.hashAllDG
                            //return $scope.input.types
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


                //remove any spaces from the name
                if (name) {
                    name = name.replace(/\s/g,'')
                }

                //the name will become part of the path. it needs to be unique within this section (or it will be overwritten)
                let path = name || DG.name;

                //
                let ctr = 0
                //count the number of times (if any) that this path appears
                section.items.forEach(function (item) {
                    console.log(item)
                    if (item.name == path) {
                        ctr++
                    }
                })

                if (ctr > 0) {
                    path = path + ctr
                }


                let sectionItem = {}
                sectionItem.name = path;
                sectionItem.title = title || DG.title;
                sectionItem.type = [DG.name]
                sectionItem.mult = "0..1"

                //need to operate on the selected model so it is updated
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

