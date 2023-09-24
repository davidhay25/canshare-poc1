angular.module("pocApp")
    .controller('makeQCtrl',
        function ($scope,modelCompSvc,$timeout,$uibModal,$localStorage,$uibModal) {

            //don't use 'input' as we need $scope.input.types
            $scope.local = {}


            //a hash of all elements that have been added to the Q. Used to avoid duplicate entries
            //is specific to the currently selected Q
            let hashElementsUsed = {}

            //list of Q on this browser. Interact with the library to save / download (like comp & DG)
            //The list is the internal Q object - not the FHIR resource (as the Q can be build from that object)
            //$scope.listQObjects = $localStorage || []

            $localStorage.allQObject = $localStorage.allQObject || {}

            $scope.allQObject = $localStorage.allQObject

            $scope.qlibraryInteraction = function (QObject) {

                alert("Library integration here")

                return

                $uibModal.open({
                    templateUrl: 'modalTemplates/libraryQ.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'libraryQCtrl',

                    resolve: {
                        QObject: function () {
                            return QObject
                        }
                    }

                }).result.then(function (ed) {
                    //copy the units to the current item
                    //need to update the .diff in the selected model
                    /*
                                        //todo - what is this code doing???
                                        let p = $filter('lastInPath')(ed.path)
                                        for (const ed1 of $scope.selectedModel.diff) {
                                            if (ed1.path == p) {
                                                ed1.units = ed.units
                                                //ed.valueSet = vsUrl
                                                break
                                            }
                                        }

                                        */
                })

            }


            $scope.selectQObject = function (QObject) {

                delete $scope.selectedQNode

                $scope.currentQObject = QObject
                //inialise the screen with the selected cmposition
                $scope.selectedComp = $localStorage.world.compositions[QObject.meta.compName]

                //get all the elements for this composition
                let vo = modelCompSvc.makeFullList($scope.selectedComp,$scope.input.types) //input.types created on the parent scope
                $scope.allCompElements = vo.allElements

                //needs global scope...
                $scope.treeData = QObject.content

                //set the hashElementsUsed for this Q
                hashElementsUsed = {}
                $scope.treeData.forEach(function (node) {
                    let ed = node.data.ed
                    if (ed) {
                        hashElementsUsed[ed.path] = true
                    }
                })


                // $scope.initQ($scope.allQObject[QObject.meta.name])
                drawtree($scope.treeData)
            }

            //create a new Q object
            $scope.newQObject = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/newQObject.html',
                    //backdrop: 'static',
                    //size : 'lg',
                    controller: function ($scope,allCompositions) {
                        $scope.input = {}
                        $scope.allCompositions = allCompositions
                        console.log($scope.input)

                        $scope.create = function () {
                            let vo = {}
                            vo.name = $scope.input.name
                            vo.description = $scope.input.description
                            vo.comp = $scope.input.selectedComp
                            $scope.$close(vo)
                        }
                    },

                    resolve: {
                        allCompositions: function () {
                            return $localStorage.world.compositions
                        }
                    }

                }).result.then(function (vo) {
                   // content is the treeData array that builds the tree

                    //$scope.currentQName = vo.name

                    let QObject = {meta:{},content:[]}
                    QObject.meta.compName = vo.comp.name
                    QObject.meta.name = vo.name
                    QObject.meta.description = vo.description

                    $scope.currentQObject = QObject

                    //$localStorage.allQObject = $localStorage.allQObject || {}
                    //$localStorage.allQObject[$scope.currentQObject.name] = QObject

                    $scope.allQObject[$scope.currentQObject.meta.name] = $scope.currentQObject

                    //inialise the screen with the selected cmposition
                    $scope.initQ($scope.currentQObject)

                })

            }




            $scope.selectQtabDEP = function (section) {
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

                    $scope.selectedQNode = node
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
                        //the controlHint values are drawn from the Q extension at https://hl7.org/fhir/R4B/valueset-questionnaire-item-control.html

                        hashElementsUsed[ed.path] = true


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
                        //This is not in the same path, or has no type
                        if (! ed.type) {
                            //alert("This element has no type. It's a reference to the DG whose contents follow.")
                        }
                        ar.push(ed)
                    }
                })

                $scope.allElementsThisSection = ar      //replace the allElements list
                drawtree($scope.treeData)
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

                delete $scope.selectedQNode

            }


            //initialize a new QObject
            $scope.initQ = function (QObject) {





                //console.log(comp)

                //get the composition and construct the complete list of elements
                $scope.selectedComp = $localStorage.world.compositions[QObject.meta.compName]
                //$scope.selectedComp = QObject.meta.compName
                let vo = modelCompSvc.makeFullList($scope.selectedComp,$scope.input.types) //input.types created on the parent scope


                $scope.allCompElements = vo.allElements     //an array

                //create initial tree with empty sections
                $scope.treeData = []
                let root = {id:"root",text: "root",parent:'#',data:{level:'root'}}
                $scope.treeData.push(root)
                comp.sections.forEach(function (sect) {
                    let sectionData = {level:'section',name:sect.name}

                    let sectionNode = {id:sect.name,text:sect.name,parent:'root',data:sectionData}
                    sectionNode.icon = `icons/icon-q-group.png`  //the default icon

                    $scope.treeData.push(sectionNode)
                })

                QObject.content = $scope.treeData
                drawtree($scope.treeData)

            }


/*
            $timeout(function () {
                $scope.initQ($scope.world.compositions['PathRequest'])

            },500)
*/
            function drawtree(treeData) {
                //$localStorage.allQ[$scope.currentQObject.name].content = treeData
                    $('#qtree').jstree('destroy');

                $scope.qTree = $('#qtree').jstree(
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

                        //set the list of possible elements for this section / group
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

                    if ($scope.selectedQNode) {
                        $(this).jstree("select_node",$scope.selectedQNode.id);
                    }

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
//console.log(node.data.level)
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