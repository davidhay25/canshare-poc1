angular.module("pocApp")
    .controller('modelViewerCtrl',
        function ($scope,$http,$uibModal,utilsSvc,orderingSvc) {


            $scope.version = utilsSvc.getVersion()


            $scope.input = {}

            //in the table view, hide common DG like HCP as the details are not relevant to reviewers
            $scope.input.hideSomeDG = true
            let DGsToHideInCompTable = ['NZPersonName','HealthcarePractitionerSummary','NZAddress']



            //retrieve a summary of all the published comps (no snapshot)
            //there may be multiple entries for a single comp if there are multiple versions
            $scope.arHisoStatus = []
            $http.get('publish/comp').then(
                //return a hash keyed on name
                function (data) {
                    console.log(data.data)

                    $scope.hashComp = data.data
                    //create array of hiso status
                    Object.keys($scope.hashComp).forEach(function (key) {
                        let comp = $scope.hashComp[key]
                        comp.meta = comp.meta || {}
                        comp.meta.hisoStatus = comp.meta.hisoStatus || 'Development'
                        //let hisoStatus = comp.meta.hisoStatus
                        if ($scope.arHisoStatus.indexOf(comp.meta.hisoStatus) == -1) {
                            $scope.arHisoStatus.push(comp.meta.hisoStatus)
                        }
                    })



                }, function (err) {
                        alert(angular.toJson(err.data))
                }
            )

            $scope.selectED = function (ed) {
                $scope.selectedED = ed
            }

            //load a single comp - the most recent version
            $scope.loadComp = function (comp) {
                //delete $scope.selectedComp

                //now load the full version (all versions)
                $http.get(`publish/comp/${comp.name}`).then(
                    function (data) {
                        //returns the most recent comp
                        $scope.selectedComp = data.data.comp
                        $scope.Q =  data.data.Q

                        //get the list of all sections in this comp
                        $scope.input.tableSections = [{name:'all',title:'All sections'}]
                        $scope.selectedComp.sections.forEach(function (section) {

                            let entry = {name:section.name,title:section.title,types:[]}

                            //these are the types (DGs) in the section. We use this for the
                            //table section display - if the ed starts with one of these types in the path then they are part of the section
                            section.items.forEach(function (item) {
                                entry.types.push(item.name)
                                /*
                                item.type.forEach(function (type) {
                                    entry.types.push(type)
                                })
                                */

                            })

                            $scope.input.tableSections.push(entry)
                        })
                        $scope.input.tableSection = $scope.input.tableSections[0]

                        console.log($scope.input.tableSections)

                        //create the list of paths to ignore in the table view
                        //based on specific types like HealthcarePractitionerSummary & NZAddress
                        $scope.pathsToIgnore = {}
                        $scope.selectedComp.snapshot.forEach(function (ed) {
                            if (ed.type && DGsToHideInCompTable.indexOf(ed.type[0]) > -1) {
                                $scope.pathsToIgnore[ed.path] = true
                            }
                        })

                        //create the treeData from the snapshot. This will be simplified from the designer view
                        let treeData =  makeTreeData($scope.selectedComp.snapshot,$scope.input.tableSections)
                        drawTree(treeData)



                    }, function (err) {
                        delete $scope.selectedComp
                        alert(angular.toJson(err.data))
                    }

                )



            }

            //called by the table view to determine if a row is displayed
            $scope.showTableRow = function (ed) {

                if (ed.mult == '0..0') {
                    return false
                }

                //path = {compname}.{section}.{sectionDG}.{topchildindg}

                let arPath = ed.path.split('.')
                /*
                if (arPath.length < 4) {
                    //ignore the section and section group paths
                    return false
                }
*/
                let canShow = true

                //if there's a tableFilter then see if the title matches
                if ($scope.input.tableFilter) {
                    if (ed.title) {
                        let title = ed.title.toLowerCase()
                        let srch = $scope.input.tableFilter.toLowerCase()
                        if (title.indexOf(srch) == -1) {
                            canShow = false
                            return false        //no need to check any more
                        }
                    }
                }

                //If there's a specific section requested - only show contents of that section
                //in the published comp


                if ($scope.input.tableSection) {
                    if ($scope.input.tableSection.name == 'all') {
                        //return canShow
                    } else {

                        //need to check if the first segment matchs one of the section DG - $scope.input.tableSection.types
                        //the
                        //let ar = ed.path.split('.')

                        canShow = false         //default to no
                        if ($scope.input.tableSection.types.indexOf(arPath[0]) > -1) {
                            canShow = true
                        }
                    }
                }

                if (! canShow) {
                    return false
                }



                //If the row is a child of type HealthcarePractitionerSummary (and others) then hide
                //$scope.pathsToIgnore is created when the comp is selected
                if ($scope.input.hideSomeDG) {
                    //if the type is HCP then add to ignorepath
                    //if (ed.type && ed.type[0] == 'HealthcarePractitionerSummary') {

                    Object.keys($scope.pathsToIgnore).forEach(function (key) {
                        //if (ed.path.startsWith(key)  &&  ed.path.length > key.length ) {
                        if (ed.path.isChildPath(key)  ) {
                            canShow = false
                        }
                    })

                }

                return canShow

            }


            $scope.viewVS = function (url,refsetId) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
                        }, refsetId : function () {
                            return refsetId
                        }
                    }

                })
            }


            //construct a tree based on the snapshot. Don't use the one in the designer as we want to simplify itt
            function makeTreeData(arElements,arSections){
                //construct a composition tree assuming that arElements is in path order
console.log(arSections)
                let treeData = []
                let rootEd = arElements[0]
                let root = {id:"topElement",text: rootEd.title,parent:'#',data:{ed:rootEd}}
                treeData.push(root)
                arSections.forEach(function (section,inx) {
                    if (inx > 0) {
                        section.types.forEach(function (sectionPath) {
                            let sectionNode = {id:sectionPath,text:section.title, parent:'topElement',data:{}}
                            treeData.push(sectionNode)
                            arElements.forEach(function (ed) {
                                // if (ed.path.startsWith(sectionPath)) {
                                if (ed.path.isChildPath(sectionPath)) {
                                    let ar1 = ed.path.split('.')
                                    ar1.pop()
                                    let parent = ar1.join('.')

                                    let node = {id:ed.path,parent:parent,text:ed.title,data:{ed:ed}}
                                    treeData.push(node)
                                }

                            })


                        })
                        //section = {name: title: ?types:}


                    }


                })



                /*
                               let that = this
                               let rootEd = arElements[0]
                               rootEd.kind = 'root'
                               let treeData = []

                               let treeIcons = {}
                               treeIcons.section = "icon-qi-horizontal.png"
                               treeIcons.dg = "icon-q-group.png"
                               treeIcons.slice = "icon-q-group.png"


                               //add the root
                               let root = {id:rootEd.path,text: rootEd.title,parent:'#',data:{ed:rootEd}}
                               treeData.push(root)


                               for (let i=1; i < arElements.length; i++){          //skip the root
                                   let ed = arElements[i]

                                   let ar = ed.path.split('.')
                                   let leafPath = ar.pop()     // the name is the last item.

                                   //The eds from a DG do not have the full path. we may need to add the composition name
                                   if (ar[0] !== $scope.selectedComp.name) {
                                       ar.splice(0,0,$scope.selectedComp.name)
                                   }

                                   let parent = ar.join(".")  //the
                                   let id = ed.path

                                   //create the tree text
                                   let text


                                   text = text || ed.title || leafPath


                                   let node = {id:id,text:text,parent:parent,data:{ed:ed}}
                                   console.log(node.id,node.parent)

                                   node.data.level = ed.kind       //Questionnaire uses 'level'

                                   //let voControl = makeQSvc.getControlDetails(ed)
                                   //node.data.ed.controlType = voControl.controlType
                                  // node.data.ed.controlHint = voControl.controlHint

                                   node.icon = `icons/icon_primitive.png`  //the default icon

                                   let arStyle = []         //the style element to add to the node['a_attr']


                                   if (ed.kind) {
                                       //let iconFile = `icons/${treeIcons[ed.kind]}`
                                       if (treeIcons[ed.kind]) {
                                           node.icon = `icons/${treeIcons[ed.kind]}`
                                       }
                                   }

                                   //todo ??? does a DG have z elements ???
                                   if (ed.zElement) {
                                       node.icon = `icons/icon-q-open-choice.png`
                                   }

                                   if (ed.type && ed.type[0] == 'CodeableConcept') {
                                       node.icon = "icons/icon_datatype.gif"
                                   }

                                   //fixed values are blue
                                   if (ed.fixedCoding || ed.fixedString) {
                                       arStyle.push("color : blue")
                                       // node['a_attr'] = { "style": "color : blue" }
                                   }

                                   //this element was defined on a parent. This will superceed the fixed value
                                   if (ed.sourceModelName && ed.sourceModelName !== rootEd.path) {
                                       arStyle.push("color : #999999")
                                   }


                                   //required

                                   if (ed.mult) {
                                       //required bolding
                                       if (ed.mult.indexOf('1..') > -1) {
                                           //need to add to any existing stype

                                           arStyle.push("font-weight:bold")
                                           // node['a_attr'] = { "style": "font-weight:bold" }
                                       }
                                       //multiple
                                       if (ed.mult.indexOf('..*') > -1) {
                                           node.text += " *"
                                       }

                                   }

                                   if (ed.hideInQ) {
                                       arStyle.push("text-decoration: line-through")
                                   }

                                   if (ed.enableWhen && ed.enableWhen.length > 0) {
                                       arStyle.push("text-decoration-line: underline")
                                       arStyle.push("text-decoration-style: dotted")
                                   }


                                   //construct the style element for the 'a'
                                   if (arStyle.length > 0) {
                                       let style = ""
                                       arStyle.forEach(function (s) {
                                           style += s + ";"

                                       })
                                       node['a_attr'] = { "style": style}
                                       // console.log(ed.path,style)
                                   }



                                   if (ed.mult && ed.mult == '0..0') {
                                       //don't add removed elements
                                   } else {
                                       treeData.push(node)
                                   }

                               }

                               */

                return treeData


            }

            function drawTree(treeData) {
                $('#compositionTree').jstree('destroy');

                $scope.compTree = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node && data.node.data) {
                        $scope.selectedED = data.node.data.ed;
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);


                    $scope.$digest();
                });

            }
        })