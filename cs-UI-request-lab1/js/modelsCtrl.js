angular.module("pocApp")
    .controller('modelsCtrl',
        function ($scope,$http,$localStorage,modelsSvc,modelsDemoSvc,modelCompSvc, $timeout,$uibModal,$filter,modelTermSvc) {

            //$scope.localStorage = $localStorage

            $scope.input = {}
            $scope.input.showFullModel = true

            $scope.leftPanel = 'col-md-3'
            $scope.rightPanel = 'col-md-9'

            $scope.fhirRoot = "http://hl7.org/fhir/R4/"

            //allows a specific tab in the mail UI to be selected
            $scope.ui = {}
            $scope.ui.tabDG = 1;
            $scope.ui.tabComp = 0;
            $scope.ui.tabTerminology = 2;

            //$scope.input.mainTabActive = $scope.ui.tabTerminology;

            //used in DG & Comp so when a type is a FHIR DT, we can create a link to the spec
            //$scope.main = {fhirDataTypes:modelsSvc.fhirDataTypes()}
            $scope.fhirDataTypes =modelsSvc.fhirDataTypes()

//console.log($scope.main.fhirDataTypes)
            //allows a specific tab in the showCompositions to e selected. Used by term summary (only need tree ATM)
            $scope.compUi = {}
            $scope.compUi.tree = 0
            $scope.input.compTabActive = $scope.compUi.tree

            $scope.toggleLeftPanel = function(){
                if ($scope.leftPanel == 'col-md-3') {
                    $scope.leftPanel = 'hidden'
                    $scope.rightPanel = 'col-md-12'
                } else {
                    $scope.leftPanel = 'col-md-3'
                    $scope.rightPanel = 'col-md-9'
                }
            }

            $scope.mCodeGroupPage = {}
            $scope.mCodeGroupPage.disease = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-disease.html"
            $scope.mCodeGroupPage.patient = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-patient.html"
            $scope.mCodeGroupPage.assessment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-assessment.html"
            $scope.mCodeGroupPage.treatment = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-treatment.html"
            $scope.mCodeGroupPage.genomics = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-genomics.html"
            $scope.mCodeGroupPage.outcome = "https://build.fhir.org/ig/HL7/fhir-mCODE-ig/group-outcome.html"

           // $localStorage.world = modelsSvc.getDemo()

            if (! $localStorage.world) {
                $localStorage.world = modelsDemoSvc.getDemo()
            }

            $scope.world = $localStorage.world




            //create a separate object for the DG - evel though still referenced by world. Will assist split between DG & comp
            $scope.hashAllDG = $localStorage.world.dataGroups
            //make the term summary
            //$scope.termSummary = modelTermSvc.makeDGSummary($scope.hashAllDG).list

            //same as for DG's - a step towards separate objects for DG & comp
            $scope.hashAllCompositions = $localStorage.world.compositions
            //make the term summary. These are the override elements in the models

            //make an array for the type-ahead lookup. - needs to be retionalized... when i remove world...
/* not just now - but keep
            $scope.arDG = []

            Object.keys($scope.hashAllDG).forEach(function (key) {
                let DG = $scope.hashAllDG[key]
                $scope.arDG.push({name:key})
            })
*/


            $scope.updateTermSummary = function () {
                $scope.termSummary = modelTermSvc.makeDGSummary($scope.hashAllDG).list
                $scope.compTermSummary = modelTermSvc.makeCompOverrideSummary($scope.hashAllCompositions).list
                $scope.hashVsSummary = modelTermSvc.makeValueSetSummary($scope.hashAllDG,$scope.hashAllCompositions).hashVS
                //console.log($scope.hashVsSummary)
                //console.log($scope.termSummary)
            }

            $scope.updateTermSummary()

            $scope.viewVS = function (item) {
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return item     //just looks at the .options property
                        }
                    }

                })
            }

            //process the world to get filter and other vars.
            //todo split world into comp & DG, dropping VS

            $scope.updateMetaValues = function() {
                $scope.tumourStreams = ["All"]
                $scope.compCategories = ["All"]

                Object.keys($scope.world.compositions).forEach(function (key) {
                    let comp = $scope.world.compositions[key]
                    comp.meta = comp.meta || {}

                    let tumourStream = comp.meta.tumourStream
                    if (tumourStream && $scope.tumourStreams.indexOf(tumourStream) == -1) {
                        $scope.tumourStreams.push(tumourStream)
                    }

                    let category = comp.meta.category
                    if (category && $scope.compCategories.indexOf(category) == -1) {
                        $scope.compCategories.push(category)
                    }

                })
            }

            $scope.updateMetaValues()
            $scope.input.selectedTumourStream = $scope.tumourStreams[0]
            $scope.input.selectedCompCategory = $scope.compCategories[0]



            //xref is cross references between models/types
            //hash[type name] - array of type name
            $scope.xref = modelsSvc.getReferencedModels($scope.hashAllDG,$scope.hashAllCompositions)


            $scope.resetWorld = function () {

                if (confirm("Are you wish to restore to the default demo state")) {
                    $localStorage.world = modelsDemoSvc.getDemo()
                    $scope.world = $localStorage.world
                    $scope.hashAllDG = $localStorage.world.dataGroups
                    $scope.hashAllCompositions = $localStorage.world.compositions
                    $scope.xref = modelsSvc.getReferencedModels($scope.world)

                    validateModel()
                }

            }



            //used in the DG list filtering
            $scope.showDG = function(DG,filter) {
                if (filter) {

                    let show = false
                    if (DG.name && DG.name.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        show = true
                    }
                    if (DG.description && DG.description.toLowerCase().indexOf(filter.toLowerCase()) > -1) {
                        show = true
                    }

                    return show

                } else {
                    return true
                }
            }

            $scope.listAllDG = function () {
                $scope.input.showDGList = true
                delete $scope.selectedModel
            }



            //---------- functions to edit a model from the tree

            //set the multiplicity of the element to 0..0
            $scope.removeElement = function (element) {
                element.mult = "0..0"
                modelsSvc.updateOrAddElement($scope.selectedModel,element)
            }

            //removes the override
            $scope.reinstateElementDEP = function (element) {
                delete element.mult
                modelsSvc.removeElement($scope.selectedModel,element)
            }

            //allow the user to set the VS for a given element
            $scope.setValueSet = function (element) {
                //console.log(element)
                let vs = prompt("ValueSet url")
                if (vs) {
                    element.valueSet = vs       //for the immediate display

                    modelsSvc.updateOrAddElement($scope.selectedModel,element)

                }

            }

            //------------

            //select a DataGroup or composition from the list / table
            $scope.selectModelFromList = function (name,kind) {

                let m
                switch (kind) {
                    case "dg" :
                        m = $scope.world.dataGroups[name]
                        if (! m) {
                            alert (`No datagroup with the name: ${name}`)
                        }
                        break
                    default :
                        alert ("Only datagroups can be selected ATM")
                        break
                }

                if (m) {
                    $scope.selectedModel = m
                    $scope.selectModel($scope.selectedModel)
                    delete $scope.input.showDGList
                }

                //$scope.selectedModel = $scope.world.dataGroups[name]
                //$scope.selectModel($scope.selectedModel)

            }

            //Generate a bundle of SD's to save on a FHIR server
            //each model (comp or dg) will be an SD
            $scope.makeBundle = function () {
                $scope.lmBundle = modelsSvc.createLMBundle($localStorage.world)
            }

            $scope.validateBundle = function (bundle) {


                delete $scope.lmValidate
                let qry = "http://hapi.fhir.org/baseR4/Bundle/$validate"
                $http.post(qry,bundle).then(
                    function (data) {
                        $scope.lmValidate = data.data
                        $scope.lmValidateSummary = modelsSvc.summarizeValidation(data.data,bundle)

                    }, function (err) {
                        $scope.lmValidate = err.data
                        $scope.lmValidateSummary = modelsSvc.summarizeValidation(data.data,bundle)
                    }
                )



                /*
                return

                let qry = "http://hapi.fhir.org/baseR4/StructureDefinition/$validate"
                $http.post(qry,bundle.entry[0].resource).then(
                    function (data) {
                        $scope.lmValidate = data.data
                        $scope.lmValidateStatus = data.status
                    }, function (err) {
                        $scope.lmValidate = err.data
                        $scope.lmValidateStatus = data.status
                    }
                )
                */
/*

                */

            }



            //create a new model
            $scope.newModel = function(kind) {
                let newModel = {kind:kind}
                $scope.editModel(newModel,true)
            }


            $scope.showComposition = function (comp) {
                let show = true
                if ($scope.input.selectedTumourStream !== 'All') {
                    if (comp.meta.tumourStream !== $scope.input.selectedTumourStream) {
                        show = false
                    }
                }

                if ($scope.input.selectedCompCategory !== 'All') {
                    if (comp.meta.category !== $scope.input.selectedCompCategory) {
                        show = false
                    }
                }


                return show
            }

            $scope.newComposition = function() {

                let name = prompt("What is the name (no spaces, & must be unique)")
                if (name) {
                    let newComp = {kind:'comp', name:name, title:name, sections:[]}
                    $localStorage.world.compositions[newComp.name] = newComp
                    $scope.selectedModel = newComp
                    $scope.selectComposition(newComp)
                }
                //$scope.editComposition(newComp,true)
            }


            //edit an existing model
            $scope.editModel = function (model,isNew) {

                $uibModal.open({
                    templateUrl: 'modalTemplates/editModel.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller : "editModelCtrl",

                    resolve: {
                        model: function () {
                            return model
                        },
                        hashTypes: function () {
                            return $scope.input.types
                        },
                        hashValueSets : function() {
                            return $localStorage.world.valueSets
                        },
                        isNew: function () {
                            return isNew
                        }
                    }

                }).result.then(function (newModel) {
                    if (newModel) {
                        //if a model is returned, then it is a new one and needs to be added to the world


                        if (newModel.kind == 'comp') {
                            $localStorage.world.compositions[newModel.name] = newModel
                        } else {
                            $localStorage.world.dataGroups[newModel.name] = newModel
                        }

                        let vo1 = modelsSvc.validateModel($localStorage.world)
                        $scope.errors = vo1.errors
                        $scope.input.types = vo1.types      //a hash keyed by name

                        //a hash by type of all elements that reference it
                        $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

                        $scope.selectModel(newModel)

                    } else {
                        //the model may have been updated - select it to refresh the various tabs
                        //note this is the model passed in for editing
                        $scope.selectModel(model)
                    }

                })

            }

            function validateModel() {
                // validate the model. This retruns a hash of all types defined in the model as well as errors
                let vo1 = modelsSvc.validateModel($localStorage.world)
                $scope.errors = vo1.errors
                $scope.input.types = vo1.types      //a hash keyed by name
                $scope.input.arTypes = Object.keys(vo1.types)       //list of types foe new element dropdown


                //a hash by type of all elements that reference it
                $scope.analysis = modelsSvc.analyseWorld($localStorage.world,$scope.input.types)

            }
            validateModel()

            $scope.selectModelFromTypeUsage = function (model) {
                $scope.selectedModelFromTypeUsage = model
            }

            //drop the first element in the path - used by the table display
            $scope.condensedPathDEP = function (path) {
                if (path) {
                    let ar = path.split('.')
                    ar.splice(0,1)
                    return  ar.join('.')
                    /*
                    let padding = ""
                    for (var i = 0; i < ar.length; i++) {
                        padding += "&nbsp;&nbsp;"
                    }

                    return  padding + ar.join('.')
                    */
                }
            }

            //$scope.input.arTypes = []


            $scope.addElement = function (name,type) {
                //add a new element to the current model
                $scope.selectedModel.diff = $scope.selectedModel.diff || []
                $scope.selectedModel.diff.push({path:name,title:name,type:[type]})
                $scope.selectModel($scope.selectedModel)

            }



            $scope.updateFullModelShow = function () {
                //when the 'show full model' checkbox is checked
                delete $scope.selectedNode
                $timeout(function(){
                    $scope.selectModel($scope.selectedModel)
                },100)

            }

            function clearB4Select() {
                delete $scope.selectedModel
                delete $scope.selectedNode
                delete $scope.input.showDGList
                delete $scope.selectedCompositionNode
            }




            $scope.showVSDEP = function (name) {
                //name could either be a url or the name of a VS in the world
                let vsItem = $localStorage.world.valueSets[name]
                if (vsItem) {
                    console.log(vsItem)

                } else {
                    alert(`There is no ValueSet in the model with the name: ${name}. `)
                }
            }

            $scope.selectModelByName = function (name) {

            }

            $scope.selectComposition = function(comp){
                clearB4Select()
                $scope.selectedModel = comp

                let vo = modelCompSvc.makeFullList(comp,$scope.input.types)
                $scope.allCompElements = vo.allElements

                //console.log(vo)
                let rootNodeId = $scope.allCompElements[0].path
                let treeData = modelsSvc.makeTreeFromElementList($scope.allCompElements)
                makeCompTree(treeData,rootNodeId)

            }

            //only used for DG now
            $scope.selectModel = function (comp) {
                clearB4Select()
                $scope.selectedModel = comp


                //create the list of override elements
                $scope.overrides = []
                $scope.selectedModel.diff.forEach(function (ed) {
                    if (ed.path.indexOf('.') > -1 ) {
                        $scope.overrides.push(ed)
                    }

                })

                $scope.Qobject = modelsSvc.makeQfromModel(comp,$scope.input.types)
                $scope.QR = {}

                let vo = modelsSvc.getFullListOfElements(comp,$scope.input.types,$scope.input.showFullModel)

                $scope.fullElementList = vo.allElements
                $scope.graphData = vo.graphData
                makeGraph()

                let treeData = modelsSvc.makeTreeFromElementList($scope.fullElementList)
                makeDGTree(treeData)

            }

           // $scope.selectDataGroup = function (comp) {
             //   clearB4Select()
           //     $scope.selectedDataGroup = comp
          //  }

            function makeGraph() {

                let container = document.getElementById('graph');
                if (container) {
                    let graphOptions = {
                        physics: {
                            enabled: true,
                            barnesHut: {
                                gravitationalConstant: -10000,
                            }
                        }
                    };
                    if ($scope.graph) {
                        $scope.graph.destroy()
                    }

                    $scope.graph = new vis.Network(container, $scope.graphData, graphOptions);

                    //https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
                    $scope.graph.on("stabilizationIterationsDone", function () {

                        $scope.graph.setOptions({physics: false});
                    });

                    $scope.graph.on("click", function (obj) {
                        delete $scope.selectedModelFromGraph
                        let nodeId = obj.nodes[0];  //get the first node

                        let node = $scope.graphData.nodes.get(nodeId);

                        if (node.data && node.data.model) {
                            $scope.selectedModelFromGraph = node.data.model;
                            $scope.$digest()
                        }
                    })
                }
            }

            $scope.fitGraph = function () {
                if ($scope.graph) {
                    $timeout(function(){$scope.graph.fit()},500)
                }
            }

            function makeDGTree(treeData) {
                $('#dgTree').jstree('destroy');

                let x = $('#dgTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,

                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {
                    //seems to be the node selection event...

                    if (data.node) {
                        $scope.selectedNode = data.node;
                        console.log(data.node)
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    $(this).jstree("open_node",id);
                    //$(this).jstree("open_all");  //open all nodes


                    $scope.$digest();
                });

            }

            $scope.expandCompTree = function () {
                $('#compositionTree').jstree('open_all');

            }

            //make the tree of the composition
            function makeCompTree(treeData,rootNodeId) {
                $('#compositionTree').jstree('destroy');

                $scope.compTree = $('#compositionTree').jstree(
                    {'core': {'multiple': false, 'data': treeData,
                            'themes': {name: 'proton', responsive: true}}}
                ).on('changed.jstree', function (e, data) {

                    if (data.node) {
                        $scope.selectedCompositionNode = data.node;
                    }

                    $scope.$digest();       //as the event occurred outside of angular...
                }).bind("loaded.jstree", function (event, data) {
                    let id = treeData[0].id
                    //if ()
                   // $(this).jstree("close_all");
                    $(this).jstree("open_node",id);
                   // console.log(rootNodeId)
                    $scope.$digest();
                });

            }
        }
    )