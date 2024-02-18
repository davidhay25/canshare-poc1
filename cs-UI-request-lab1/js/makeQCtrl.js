angular.module("pocApp")
    .controller('makeQCtrl',
        function ($scope,modelCompSvc,$timeout,$localStorage,$uibModal,$http,modelsSvc,makeQSvc) {

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

            $scope.previewQ = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/previewQ.html',
                    //backdrop: 'static',
                    size : 'lg',
                    controller: function ($scope,Q) {
                        $scope.input = {}
                        $scope.Q = Q
                        $scope.QR = {}

                        console.log(Q)

                    },

                    resolve: {
                        Q: function () {
                            return $scope.Qresource
                        }
                    }
                })
            }

            //a hash of all elements that have been added to the Q. Used to avoid duplicate entries
            //is specific to the currently selected Q
            let hashElementsUsed = {}

            function saveToLibrary() {
                $scope.currentQObject.content = $scope.treeData

                $http.put(`/model/QObject/${$scope.currentQObject.name}`,$scope.currentQObject).then(
                    function () {
                        console.log('save')

                    },
                    function () {
                        alert("There was an error updating the Library")
                    }
                )
            }

            $scope.save = function () {
                if (confirm("Do you wish to save this Questionnaire in the Library")) {
                    saveToLibrary()
                    alert("Q has been saved in the Library")
                }

            }

            //update the library with the current QObject
            let updateLibrary = function () {

                return  ////temp while developing

                saveToLibrary()

                $scope.currentQObject.content = $scope.treeData

            }


            //update the treedata with the number of cols to display
            $scope.updateCols = function(cnt) {
                for (const item of $scope.treeData) {
                    if (item.id == $scope.selectedQNode.id) {
                        item.data.cols = cnt
                        break
                    }
                }

                drawtree($scope.treeData)


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

                    } else {
                        alert(`Checked out to ${QObject.user}. If this is you, try re-selecting the Q.`)
                    }
                }


                //inialise the screen with the selected cmposition
                $scope.selectedComp = $localStorage.world.compositions[QObject.compName]

                if (! $scope.selectedComp) {
                    alert(`This Questionnaire is based on the Composition: ${QObject.compName} which needs to be downloaded from the Library` )
                    return
                }

                //get all the elements for this composition
                getAllCompElements($scope.selectedComp)

                //console.log($scope.allCompElements)



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
                                vo.populate = $scope.input.populate
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

                    $scope.selectedComp = $localStorage.world.compositions[QObject.compName]
                    //$scope.selectedComp = QObject.meta.compName

                    getAllCompElements($scope.selectedComp) //populates $scope.allCompElements

                    //$scope.selectQObject()
                    //initialise the screen with the selected composition
                    if (vo.populate) {
                        let treeData = makeQSvc.makeCompleteTree($scope.selectedComp,$scope.hashAllDG)
                    } else {
                        $scope.initQ(QObject)
                    }


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


                    //all eds on the path. Need to decide how to manage 'referenced' DG's - possibly as a Group at the same level
                    //note that some elements aren't actually ed's - the section, and the DG off the section are in there as well
                    
                    if (ed.path == path) {
                        //this element is to be added
                        //the controlHint values are drawn from the Q extension at https://hl7.org/fhir/R4B/valueset-questionnaire-item-control.html

                        hashElementsUsed[ed.path] = true    //mark this element as having been selected


                        if (makeQSvc.isADG(ed,$scope.hashAllDG)) {
                            //This is a DG. Add all the child elements (ie those that start with this path)
                            //if one of the child elements is also a DG then add a group, and add the elents to that group
                            //if a group is nested, then it is still added directly to the 'section' - ie they are not nested but flattened
                            console.log("This is a DG")

                            let vo = makeQSvc.getAllChildNodes (parentId,ed,$scope.hashAllDG,$scope.allElementsThisSection)
                            console.log(vo)

                            vo.arNodes.forEach(function (node) {
                                hashElementsUsed[node.id] = true    //mark this element as having been selected. The node id is the path
                                $scope.treeData.push(node)

                            })
                           // $scope.selectedQNode = {id:ed.id}

                        } else {
                            //so it's not a DG. But could still be the section entry. If there's a type, then it's an element
                            if (ed.type) {

                            }

                            //get the control hint and type for the Q generation
                            let voControl = makeQSvc.getControlDetails(ed)

                            let node = {id:ed.path,
                                text:ed.title,
                                parent:parentId,
                                data:{ed:ed,level:'element',controlType:voControl.controlType,controlHint:voControl.controlHint}}

                            //locate where to insert the node. We want all children of a nod in the same place
                            //to make moving easier
                            let pos = -1
                            $scope.treeData.forEach(function (node1,inx) {
                                if (node1.parent == node.parent ) {pos = inx}
                            })
                            if (pos > -1) {
                                $scope.treeData.splice(pos,0,node)
                            } else {
                                $scope.treeData.push(node)
                            }

                        }

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


            $scope.moveUp = function () {


                makeQSvc.moveUp($scope.selectedQNode,$scope.treeData)
                drawtree($scope.treeData)
            }

            $scope.moveDown = function (node) {
                makeQSvc.moveDown($scope.selectedQNode,$scope.treeData)
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

            function getAllCompElements(comp) {
                let vo = modelCompSvc.makeFullList(comp,$scope.input.types,$scope.hashAllDG) //input.types created on the parent scope
                $scope.allCompElements = vo.allElements     //an array

/*
                console.log(vo.allElements)
                vo.allElements.forEach(function (item) {
                    console.log(item.ed.path, item.ed.kind)
                })
*/
            }

            //initialize a new QObject
            $scope.initQ = function (QObject) {

                //get the composition and construct the complete list of elements
              //tmp  $scope.selectedComp = $localStorage.world.compositions[QObject.compName]
                //$scope.selectedComp = QObject.meta.compName

              //tmp  getAllCompElements($scope.selectedComp)

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




            //dnd not working atm. Have left code in there for now, but could be removed...
            function drawtree(treeData) {

                $('#qtree').jstree('destroy');

                $scope.qTree = $('#qtree').jstree(
                    {'core': {'multiple': false,
                            'data': treeData,
                            'themes': {name: 'proton', responsive: true}
                        }
                    }
                ).on('select_node.jstree', function (e, data) {
                    console.log('select_node')

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
                                //if (ed.path.startsWith(prefix)) {
                                if (ed.path.isChildPath(prefix)) {
                                    //console.log(ed)
                                    //Don't add an ed already added
                                    if (! hashElementsUsed[ed.path]) {
                                        let ar = ed.path.split('.')
                                        ar.splice(0,2)  //remove the dg name and section
                                        ed.shortPath = ar.join('.')

                                        $scope.allElementsThisSection.push(ed)
                                    }

                                }

                            })
                        }

                    }




                    $scope.$digest();

                })
                    .bind("loaded.jstree", function (event, data) {
                        console.log('loaded')
                        $(this).jstree("open_node","root");
                        if ($scope.selectedQNode) {
                            $(this).jstree("select_node",$scope.selectedQNode.id);
                            $(this).jstree("open_node",$scope.selectedQNode.id);
                            console.log('node populated: ' + $scope.selectedQNode.id)
                           // $(this).jstree("open_node",$scope.selectedQNode.id);
                        }
                    })
/*
                    .bind("select_node.jstree", function (event, data) {
                        console.log('select_node')

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
                })
                    */

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

                $scope.Qresource = makeQSvc.makeQ(treeObject)

                $scope.downloadQLinkJson = window.URL.createObjectURL(new Blob([angular.toJson($scope.Qresource,true)],{type:"application/json"}))
                $scope.downloadQLinkJsonName = `Q-${$scope.currentQObject.name}.json`

                return obj
            }

            //construct the Questionnaire resource
            function makeQDEP(treeObject) {
                Q = {resourceType:"Questionnaire",status:"draft"}

                function addChild(parent,node) {
                    let data = node.data

                    let item = {text:node.text}

                    //if the node is a section or group, then the type must also be 'group. Only 'element' types can be different

                    if (node.data.level == 'element') {
                        item.type = data.controlType    //the 'official' type for the item

                        if (data.controlType !== data.controlHint)  {
                            console.log(item.text,data.controlType,data.controlHint)
                            //the hint is the extension that gives more options to the renderer
                            item.extension = item.extension || []
                            let ext = {url:"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"}
                            ext.valueCodeableConcept = {coding:[{code:data.controlHint,system:"http://hl7.org/fhir/questionnaire-item-control"}]}
                            item.extension.push(ext)

                        }
                    } else {
                        item.type = 'group'
                        console.log(data.cols)
                        if (data.cols) {
                            item.extension = item.extension || []
                            let ext = {url:"http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"}
                            ext.valueInteger = data.cols
                            item.extension.push(ext)


                        }



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