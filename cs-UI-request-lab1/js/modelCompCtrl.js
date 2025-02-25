//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('modelCompositionCtrl',
        function ($scope,$uibModal,$timeout,librarySvc,modelsSvc,$localStorage,$http,utilsSvc,documentSvc) {


            $localStorage.qStrategy = $localStorage.qStrategy || {}
            $scope.qStrategy = $localStorage.qStrategy

            $scope.compositionKind = ['request','report','general']





            $scope.qGenerationOptions = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/qGenerationOptions.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: function($scope,strategy){
                        $scope.strategy = strategy
                        //$scope.input = {}
                        $scope.save = function () {
                            $scope.$close($scope.strategy)
                        }
                    }, resolve: {
                        strategy: function () {
                            return $localStorage.qStrategy
                        }
                    }

                }).result.then(function (strategy) {
                    console.log(strategy)
                    $localStorage.qStrategy = strategy

                    //need to set the fullQ on the parent scope
                    $scope.selectComposition($scope.selectedComposition)


                })
            }

            $scope.cloneComp = function (comp) {
                let title = prompt("What title should the new Composition have? (leave blank to cancel)")
                let name
                if (title) {
                    name = title.replace(/\s/g, '') //remove any spaces

                    modelsSvc.isUniqueNameOnLibrary(name,'comp').then(
                        function () {
                            let newComp = angular.copy(comp)
                            newComp.name = name
                            newComp.title = title
                            newComp.checkedOut = $scope.user.email
                            //save a copy to the Library (as we do with DGs)
                            librarySvc.checkOut(newComp,$scope.user)
                            $scope.hashAllCompositions[newComp.name] = newComp
                            $scope.selectComposition(newComp)
                        }, function() {
                            alert(`Sorry, this name (${name}) is not unique`)
                        }
                    )
                }
            }

            $scope.canEditComp = function (comp) {
                if ($scope.user && $scope.user.email) {
                    if (comp && comp.checkedOut === $scope.user.email) {
                        return true
                    }
                }
            }

            //publish a comp version. Only if checked out. todo Should the comp be checked in afterwards?
            $scope.publish = function (comp) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/publishComp.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'publishCompCtrl',

                    resolve: {
                        comp: function () {
                            return comp
                        },
                        arAllElements: function () {
                            return $scope.allCompElements
                        },
                        user : function () {
                            return $scope.user
                        },
                        Q : function () {
                            return $scope.fullQ
                        }



                    }}
                ).result.then(function (pubComp) {
                    //pass back the version that was published
                    //need to update the version in the local store & possible check in
                    $scope.selectedComposition.version = pubComp.version +1

                })
            }

            $scope.selectCompTreePath = function (path) {
                $timeout(function () {
                    //let fullPath = `${item.hiddenDGName}.${item.path}`
                    $("#compositionTree").jstree("select_node",  path);
                    $("#compositionTree").jstree("open_node",  path);
                    $scope.input.compTabActive = $scope.compUi.tree //make sure the tree is selected
                },500)

            }

            $scope.showLogEntry = function (le) {
                $scope.logEntry = le
            }

            //removes a conditional hide / show from a comp.
            $scope.deleteSectionConditional = function (inx) {
                if (confirm("Are you sure you wish to remove this conditional")) {
                    $scope.selectedComposition.enableWhen.splice(inx,1)
                }
            }

            $scope.getRulesCount = function () {
                let cnt = 0
                if ($scope.allCompElements) {
                    $scope.allCompElements.forEach(function (item) {
                        if (item.ed.rules) {
                            cnt ++
                        }
                    })
                }

                return cnt
            }

            $scope.revert = function () {
                if (confirm("Are you sure you wish to revert this Composition? Any changes will be lost.")){

                    librarySvc.revert($scope.selectedComposition, $scope.user).then(
                        function (data) {
                            //returns the model from the library
                            $scope.hashAllCompositions[$scope.selectedComposition.name] = data
                            $scope.selectComposition(data)
                            //$scope.$emit('updateDGList',{name:$scope.selectedModel.name})

                            alert("Check out has been cancelled, and the Library version of this Composition downloaded.")
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )


                }
            }


            $scope.checkIn = function () {
                librarySvc.checkIn($scope.selectedComposition,$scope.user)

                //save the comp logical fsh to the library. Could do this in the library I guess, but easy here
                if ($scope.compFsh) {
                    let url = `/fsh/comp/logical/${$scope.selectedComposition.name}`
                    let vo = {name:$scope.selectedComposition.name,fsh:$scope.compFsh}
                    let config = {headers:{'x-user-email': $scope.user.email}}

                    $http.put(url,vo,config).then(
                        function (data) {

                        }, function (err) {
                            alert("There was an error saving the Logical Model FSH")
                        }
                    )
                }



            }


            //retrieve the latest copy of this Comp from the library and mark as checked out to the current user
            $scope.checkOut = function () {
                //alert('checkOut')


                librarySvc.checkOut($scope.selectedComposition,$scope.user,function(comp){
                    console.log(comp)
                    $scope.hashAllCompositions[comp.name] = comp
                    $scope.selectComposition(comp)

                })

            }



            //Add or edit an override
            $scope.editOverrideDEP = function (ed) {
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
                        },
                        parentEd : function () {
                            return  null    //parentEd is only ude whne adding a new Ed
                        },
                        initialTab : function () {
                            return null
                        }
                    }

                }).result.then(function (ed) {
                    let path = ed.path
                    $scope.selectedComposition.override = $scope.selectedComposition.override || {}
                    $scope.selectedComposition.override[path] = ed

                    $scope.selectComposition($scope.selectedComposition)    //in modelsCtrl

                    //select the element in the Composition tree. Need to wait for the tree to be built...
                    $timeout(function () {
                        $("#compositionTree").jstree("select_node",  path);
                    },500)

                })

            }

            //removing a Z element. It will be in the composition
            $scope.removeZElementDEP = function (ed) {
                console.log(ed,$scope.selectedComposition.override)

                if ($scope.selectedComposition.override) {
                    delete $scope.selectedComposition.override[ed.path]
                    //select the element in the Composition tree. Need to wait for the tree to be built...
                    $timeout(function () {
                        $scope.selectComposition($scope.selectedComposition)    //in modelsCtrl
                        let ar = ed.path.split('.')
                        ar.pop()
                        let parentPath = ar.join('.')
                        console.log(parentPath)
                        $("#compositionTree").jstree("select_node",  parentPath);
                        $("#compositionTree").jstree("open_node",  parentPath);
                    },500)
                }

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
            $scope.libraryInteractionDEP = function (comp) {

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


            $scope.selectRuleTreePath = function (path) {

                let ar = path.split('.')
                let dgName = ar.splice(0,1)[0]
                let newPath = ar.join('.')
                $scope.termSelectDGItem({DHName:dgName,hiddenDGName:dgName,path:newPath})



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
                            return true
                        }
                    }

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

            $scope.addZElementDEP = function (parentEd) {
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

                        $scope.input.types = utilsSvc.fhirDataTypes().concat(DGs)


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
                    $scope.selectedComposition.override = $scope.selectedComposition.override || {}
                    $scope.selectedComposition.override[ed.path] = ed
                    //delete $scope.selectedCompositionNode
                    $scope.selectComposition($scope.selectedComposition)  //in parent
                    $scope.selectCompTreePath(ed.path)

                })
            }
        
            $scope.getOverridesCountDEP = function () {
                if ($scope.selectedComposition && $scope.selectedComposition.override) {
                    return Object.keys($scope.selectedComposition.override).length
                }

            }
        
            $scope.revertOverrideDEP = function (path) {
                delete $scope.selectedComposition.override[path]
                $scope.selectComposition($scope.selectedComposition)  //in parent
                $scope.selectCompTreePath(path)
            }


            $scope.removeElement = function (ed) {

                let newEd = angular.copy(ed)
                newEd.mult = "0..0"
                $scope.selectedComposition.override = $scope.selectedComposition.override || {}
                $scope.selectedComposition.override[newEd.path] = newEd
                //delete $scope.selectedCompositionNode
                $scope.selectComposition($scope.selectedComposition)  //in parent

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
                    //if (item.name.startsWith(path)) {
                    if (item.name.isChildPath(path)) {
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
                $scope.selectedComposition.sections.forEach(function (sect) {
                    //console.log(sect)
                    if (sect.name == section.name) {
                        sect.items.push(sectionItem)
                    }
                })

                delete $scope.selectedCompositionNode
                $scope.selectComposition($scope.selectedComposition)  //in parent

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
                $scope.selectComposition($scope.selectedComposition)  //in parent
                let id = `${comp.name}.${name}`
                $scope.selectCompTreePath(id)
            }

        }
    )

