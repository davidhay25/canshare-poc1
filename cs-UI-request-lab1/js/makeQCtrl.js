angular.module("pocApp")
    .controller('makeQCtrl',
        function ($scope,modelCompSvc,$timeout,$uibModal) {

            //don't use 'input' as we need $scope.input.types
            $scope.local = {}

            //a hash of all elements that have been added to the Q. Used to avoid duplicate entries
            let hashElementsUsed = {}

            $scope.selectQtab = function (section) {
                $scope.selectedSection = section

            }

            //groups can only be added to sections
            $scope.addGroup = function (sectionNode) {


                $uibModal.open({
                    templateUrl: 'modalTemplates/qGroup.html',
                    backdrop: 'static',
                    //size : 'lg',
                    controller: function($scope,group) {
                        $scope.input = {}
                        $scope.close = function () {
                            let vo = {name : $scope.input.name,text:$scope.input.text}
                            $scope.$close(vo)
                        }
                    },

                    resolve: {

                        group: function () {
                            return null
                        }
                    }

                }).result.then(function (vo) {

                    let groupName = vo.name

                    let parentId = sectionNode.id
                    let nodeId = `${parentId}-${new Date().getTime()}`

                    //this is the prefix of the section where the group is located.
                    //It's used to provide the list of possible elements (from the section) to add to the group
                    let prefix = `${$scope.selectedComp.name}.${$scope.selectedQNode.data.name}.`

                    let node = {id:nodeId,text:groupName,parent:parentId,data:{level:'group',sectionPrefix:prefix}}
                    node.icon = "icons/icon-q-group.png"
                    $scope.treeData.push(node)
                    drawtree($scope.treeData)
                })



            }

            //add an element to the Q tree

            $scope.selectElementToAdd = function (inx) {
                let selectedEd = $scope.allElementsThisSection[inx]
                let path = selectedEd.path

                //we'll go through all the elements in the allElementsThisSection arrar adding
                //elements that start with the same path
                let ar = []
                let parentId = $scope.selectedQNode.id  //Where to insert the element. This is either a section or a group

                $scope.allElementsThisSection.forEach(function (ed) {

                    //for now, only select the individual item, but leave the code there to select
                    //all eds on the path. Need to decide how to manage 'referemced' DG's - possibly as a Group at the same level
                    
                    if (ed.type && ed.path == path) {

                       // if (ed.type && ed.path.startsWith(path)) {    //ed without a type are the section.DGName elements
                        //this element is to be added
                        //teh controlHint values are drawn from the Q extension at https://hl7.org/fhir/R4B/valueset-questionnaire-item-control.html

                        //todo - incorporate standard Q types + control Hint - ie 2 elements
                        let controlHint = "string"            //this can be any value - it will be an extension in the Q - https://hl7.org/fhir/R4B/extension-questionnaire-itemcontrol.html
                        let controlType = "string"          //this has to be one of the defined type values
                        if (ed.options && ed.options.length > 0) {
                            controlHint = "drop-down"
                            controlType = "choice"
                        }
                        switch (ed.type[0]) {
                            case 'dateTime' :
                                controlHint = "dateTime"
                                controlType = "dateTime"
                                break
                            case 'CodeableConcept' :
                                if (ed.valueSet) {
                                    controlHint = "lookup"
                                    controlType = "choice"
                                }
                        }

                        let node = {id:ed.path,text:ed.title,parent:parentId,data:{ed:ed,level:'element',controlType:controlType,controlHint:controlHint}}
                        $scope.treeData.push(node)
                    } else {
                        //This is not in the same path
                        ar.push(ed)
                    }
                })

                $scope.allElementsThisSection = ar      //replace the allElements list
                drawtree($scope.treeData)

                //Object.keys($scope.allElementsThisSection).forEach()

/*

                //This is a has of all elements added to the Q (so unavailable to add later)
                hashElementsUsed[ed.path] = true

                $scope.allElementsThisSection.splice(inx,1)


                let parentId = $scope.selectedQNode.id  //this is either a section or a group


                let controlType = "text"
                if (ed.options && ed.options.length > 0) {
                    controlType = "optionsDD"
                }
                switch (ed.type[0]) {
                    case 'dateTime' :
                        controlType = "dateTime"
                        break
                    case 'CodeableConcept' :
                        if (ed.valueSet) {
                            controlType = "lookup"
                        }
                }

                let node = {id:ed.path,text:ed.title,parent:parentId,data:{ed:ed,level:'element',controlType:controlType}}
                $scope.treeData.push(node)
  drawtree($scope.treeData)
*/






            }

            $scope.removeElement = function () {
                console.log($scope.selectedQNode.id)

                let inx = -1
                for (const treeNode of $scope.treeData) {
                    inx++
                    if (treeNode.data.ed && (treeNode.data.ed.path == $scope.selectedQNode.id)) {
                        $scope.treeData.splice(inx,1)

                        delete hashElementsUsed[treeNode.data.ed.path]

                        drawtree($scope.treeData)
                        break
                    }

                }

            }

            $scope.initQ = function (comp) {
                $scope.selectedComp = comp
                console.log(comp)

                let vo = modelCompSvc.makeFullList(comp,$scope.input.types) //input.types created on the parent scope

                $scope.allCompElements = vo.allElements     //an array
                //$scope.hashCompElements = vo.hashAllElements

                //console.log($scope.allCompElements,$scope.hashCompElements)

                //create initial tree
                $scope.treeData = []
                let root = {id:"root",text: "root",parent:'#',data:{level:'root'}}
                $scope.treeData.push(root)
                comp.sections.forEach(function (sect) {
                    let sectionData = {level:'section',name:sect.name}
                    //add all the DG to the section data. todo - need to incorporate all overrides
                    //there is other section level metadata that may be useful as well
                    /*
                    sect.items.forEach(function (item) {
                        let dg = $scope.hashAllDG[item.type[0]]
                        sectionData.DG.push(dg)
                    })
*/
                    let sectionNode = {id:sect.name,text:sect.name,parent:'root',data:sectionData}
                    sectionNode.icon = `icons/icon-q-group.png`  //the default icon

                    $scope.treeData.push(sectionNode)
                })

                drawtree($scope.treeData)

            }

            $timeout(function () {
                $scope.initQ($scope.world.compositions['PathRequest'])

            },500)

            function drawtree(treeData) {
                $('#qtree').jstree('destroy');
                // console.log(treeData)
                $scope.allDGTree = $('#qtree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {


                    if (data.node) {

                        //This is a list of all elements from the comp available to add to the Q section
                        $scope.allElementsThisSection = []
                        $scope.selectedQNode = data.node;
                        delete $scope.allowAddGroup
                        switch ($scope.selectedQNode.data.level) {
                            case "section":
                                //so we can re-draw the section whenever something changes...
                                $scope.sectionNameFromTree = $scope.selectedQNode.data.name

                                $scope.allowAddGroup = true     //can add a group to the section
                                //create an array of all elements (expanded) in the section
                                //todo remove any already used
                                let prefix = `${$scope.selectedComp.name}.${$scope.selectedQNode.data.name}.`
                                setElementList(prefix)

                                //set the selected section for the renderer
                                for (const sect of $scope.Q.item) {
                                    if (sect.text == $scope.sectionNameFromTree) {
                                        $scope.selectedSection = sect
                                        break
                                    }
                                }

                                break
                            case "group":
                                setElementList(data.node.data.sectionPrefix)
                                break

                        }

                        function setElementList(prefix) {
                            $scope.allCompElements.forEach(function (item) {
                                let ed = angular.copy(item.ed)
                                if (ed.path.startsWith(prefix)) {
                                    //Don't add an ed already added
                                    if (! hashElementsUsed[ed.path]) {
                                        let ar = ed.path.split('.')
                                        ar.splice(0,2)
                                        ed.shortPath = ar.join('.')
                                        $scope.allElementsThisSection.push(ed)
                                    }

                                }

                            })
                        }

                    }

                    $scope.$digest();

                }).bind("loaded.jstree", function (event, data) {
                    $(this).jstree("open_all");

                    let v = $(this).jstree(true).get_json('#', { 'flat': false })
                    $scope.Q = makeObject(v) //not a complete Q, but compatible

                    if ($scope.sectionNameFromTree) {
                        for (const sect of $scope.Q.item) {
                            if (sect.text == $scope.sectionNameFromTree) {
                                $scope.selectedSection = sect
                                break
                            }
                        }
                    }

                    $scope.$digest()
                });

            }

            //create a hierarchical object representing the tree. This is used for the rendering,
            //and can also be converted into the Q. Uses the internal representation from the tree
            function makeObject(treeObject) {
                let obj = {}

                function addChild(parent,node) {
                    let item = {text:node.text,ed:node.data.ed,level:node.data.level,controlHint:node.data.controlHint,controlType:node.data.controlType}
                    parent.item = parent.item || []
                    parent.item.push(item)

                    if (node.children && node.children.length > 0) {

                        node.children.forEach(function (childNode) {
                            addChild(item,childNode)
                        })
                    }
                }

                treeObject[0].children.forEach(function (child) {
                    addChild(obj,child)
                })

                $scope.Qresource = makeQ(treeObject)

                return obj
            }

            //construct the Questionnaire resource
            function makeQ(treeObject) {
                Q = {resourceType:"Questionnaire",status:"draft"}

                function addChild(parent,node) {
                    let data = node.data

                    let item = {text:node.text}

                    //if the node is a section or group, then the type must also be 'group. Only 'element' types can be different
console.log(node.data.level)
                    if (node.data.level == 'element') {
                        item.type = data.controlType    //the 'official' type for the item
                        if (data.controlType !== data.controlHint)  {
                            //the hint is the extension that gives more options to the renderer
                            item.extension = item.extension || []
                            let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                            ext.valueCodeableConcept = {coding:[{code:data.controlHint,system:"http://hl7.org/fhir/questionnaire-item-control"}]}
                            item.extension.push(ext)

                        }
                    } else {
                        item.type = 'group'
                    }

                    item.linkId = node.id
                    parent.item = parent.item || []
                    parent.item.push(item)

                    if (node.children && node.children.length > 0) {
                        node.children.forEach(function (childNode) {

                            addChild(item,childNode)
                        })
                    }

                }


                treeObject[0].children.forEach(function (section) {
                    //only add a section if it has children
                    if (section.children && section.children.length > 0) {
                        addChild(Q,section)
                    }

                })

               //console.log(Q)
                return Q


            }

        })