angular.module("pocApp")
    .controller('makeQCtrl',
        function ($scope,modelCompSvc,$timeout,$uibModal,$localStorage,$uibModal,$http,modelsSvc) {

            //don't use 'input' as we need $scope.input.types
            $scope.local = {}


            //get all the library questionnaires
            //all QO are stored in the library (not like Comp & DG ATM)
            //copies being edited are saved in $localStorage.allQObject
            function loadAllQO() {
                $http.get("/model/allQObject").then(
                    function (data) {
                        $scope.hashLibraryQO = data.data
                        // $scope.allQObject = data.data
                    }, function(err) {
                        alert(angular.toJson(err))
                    }
                )
            }
            loadAllQO()


            //checkin the current document.
            $scope.checkin = function () {
                $scope.currentQObject.status = "checked-in"
                delete $scope.currentQObject.user
                updateLibrary()
            }

            $scope.checkout = function () {
                $scope.currentQObject.status = "checked-out"
                $scope.currentQObject.user = $scope.user.email
                $scope.canEdit = false
                updateLibrary()
            }

            //send the current Q to the POC environment
            $scope.pushToPOC = function () {
                let Q = $scope.Qresource        //the actual Q resource
                Q.id = `builder-${$scope.currentQObject.name}`

                Q.name = $scope.currentQObject.name
                Q.title = $scope.currentQObject.name

                //set the context to 'request'
                let ctxString = 'request'
                let ctx = {code:{system:"http://terminology.hl7.org/CodeSystem/usage-context-type",code:"focus"}}
                ctx.valueCodeableConcept = {coding:[{system:"http://canshare.co.nz/fhir/CodeSystem/questionnaire-type",code:ctxString}],text:ctxString}
                Q.useContext = [ctx]


                console.log(Q)
//return
                //directly to hapi server ATM
                let qry = `http://poc.canshare.co.nz:8080/fhir/Questionnaire/${Q.id}`
                $http.put(qry,Q).then(
                    function (data) {
                        alert("The form has been copied onto the POC Forms server, and is available for use")
                    }, function (err) {
                        alert(angular.toJson(err))
                    }
                )


            }


            //a hash of all elements that have been added to the Q. Used to avoid duplicate entries
            //is specific to the currently selected Q
            let hashElementsUsed = {}


            //update the library with the current QObject
            let updateLibrary = function () {
                $http.put(`/model/QObject/${$scope.currentQObject.name}`,$scope.currentQObject).then(
                    function () {
                        console.log('save')
                    },
                    function () {
                        alert("There was an error updating the Library")
                    }
                )

                $scope.currentQObject.content = $scope.treeData

            }


            //when a QO is selected, it is the object from the library that is returned.
            //we want to save a copy in the browser cache so it can be edited
            $scope.selectQObject = function (QObject) {
                $scope.currentQObject = QObject
                $scope.canEdit = false;




                delete $scope.allElementsThisSection
                delete $scope.selectedQNode


                let status = QObject.status
                if (status == 'checked-out') {
                    //the QO is checked out to
                    if ($scope.user && QObject.user == $scope.user.email) {
                        //checked out to this user
                        $scope.canEdit = true

                    }
                }


                //inialise the screen with the selected cmposition
                $scope.selectedComp = $localStorage.world.compositions[QObject.compName]

                //get all the elements for this composition
                let vo = modelCompSvc.makeFullList($scope.selectedComp,$scope.input.types,$scope.hashAllDG) //input.types created on the parent scope

                $scope.allCompElements = modelsSvc.makeOrderedFullList(vo.allElements)     //orders the list and removes group original children


                //$scope.allCompElements = vo.allElements

                //needs global scope...
                $scope.treeData = $scope.currentQObject.content

                if (!$scope.treeData) {
                    alert("The contents of this Q could not be found. It should be deleted.")
                    return
                }

                //set the hashElementsUsed for this Q
                hashElementsUsed = {}
                $scope.treeData.forEach(function (node) {
                    let ed = node.data.ed
                    if (ed) {
                        hashElementsUsed[ed.path] = true
                    }
                })



                drawtree($scope.treeData)
            }

            //create a new Q object
            $scope.newQObject = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/newQObject.html',
                    //backdrop: 'static',
                    //size : 'lg',
                    controller: function ($scope,allCompositions,hashLibraryQO) {
                        $scope.input = {}
                        $scope.allCompositions = allCompositions
                        console.log($scope.input)

                        $scope.create = function () {
                            if (hashLibraryQO[$scope.input.name]){
                                alert("Sorry, there is already a Questionnaire with that name")
                            } else {
                                let vo = {}
                                vo.name = $scope.input.name
                                vo.description = $scope.input.description
                                vo.comp = $scope.input.selectedComp
                                $scope.$close(vo)
                            }

                        }
                    },

                    resolve: {
                        allCompositions: function () {
                            return $localStorage.world.compositions
                        },
                        hashLibraryQO: function(){
                            return $scope.hashLibraryQO
                        }
                    }

                }).result.then(function (vo) {
                   // content is the treeData array that builds the tree

                    //$scope.currentQName = vo.name

                    let QObject = {}
                    QObject.compName = vo.comp.name
                    QObject.name = vo.name
                    QObject.description = vo.description
                    QObject.status = "checked-out"
                    QObject.user = $scope.user.email       //user must exist or this function not called

                    //$scope.currentQObject = QObject

                    //save the QO to the library.
                    $http.put(`/model/QObject/${QObject.name}`,QObject).then(
                        function () {
                            loadAllQO()
                        },
                        function (err) {
                            console.log(angular.toJson(err.data))
                        }
                    )

                    //$scope.selectQObject()
                    //inialise the screen with the selected cmposition
                    $scope.initQ(QObject)
                    $scope.selectQObject(QObject)

                    drawtree($scope.treeData)


                })

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
                    //all eds on the path. Need to decide how to manage 'referenced' DG's - possibly as a Group at the same level
                    
                    if (ed.type && ed.path == path) {
                       // if (ed.type && ed.path.startsWith(path)) {    //ed without a type are the section.DGName elements
                        //this element is to be added
                        //the controlHint values are drawn from the Q extension at https://hl7.org/fhir/R4B/valueset-questionnaire-item-control.html

                        hashElementsUsed[ed.path] = true

                        let type = ed.type[0]
                        let model = $scope.hashAllDG[type]
                        if (model && model.diff && model.diff.length > 0) {
                            //This is a DG. Add all the child elements (ie those that start with this path)
                            //if one of the child elements is also a DG then add a group, and add the elents to that group
                            //if a group is nested, then it is still added directly to the 'section' - ie they are not nested but flattened
                            alert("This is a DG")

                        }


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

                $scope.currentQObject.content = $scope.treeData
                updateLibrary()

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

                        $scope.currentQObject.content = $scope.treeData
                        updateLibrary()

                        drawtree($scope.treeData)
                        break
                    }

                }

                delete $scope.selectedQNode

            }


            //initialize a new QObject
            $scope.initQ = function (QObject) {

                //get the composition and construct the complete list of elements
                $scope.selectedComp = $localStorage.world.compositions[QObject.compName]
                //$scope.selectedComp = QObject.meta.compName
                let vo = modelCompSvc.makeFullList($scope.selectedComp,$scope.input.types,$scope.hashAllDG) //input.types created on the parent scope


                $scope.allCompElements = vo.allElements     //an array

                //create initial tree with empty sections
                $scope.treeData = []
                let root = {id:"root",text: "root",parent:'#',data:{level:'root'}}
                $scope.treeData.push(root)
                $scope.selectedComp.sections.forEach(function (sect) {
                    let sectionData = {level:'section',name:sect.name}
                    let sectionNode = {id:sect.name,text:sect.name,parent:'root',data:sectionData}
                    sectionNode.icon = `icons/icon-q-group.png`  //the default icon

                    $scope.treeData.push(sectionNode)
                })

                QObject.content = $scope.treeData
               // drawtree($scope.treeData)

            }



            function drawtree(treeData) {
                //noyt completely sure this is the best place to update the local
                //$localStorage.allQObject[$scope.currentQObject.name].content = treeData
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