
angular.module("pocApp")

    .service('viewBundleSvc', function() {

        var objColours ={};
        objColours.Patient = '#93FF1A';
        objColours.Composition = '#E89D0C';
        objColours.Encounter = '#E89D0C';
        objColours.List = '#ff8080';
        objColours.Observation = '#FFFFCC';
        objColours.ValueSet = '#FFFFCC';
        objColours.Practitioner = '#FFBB99';
        objColours.MedicationAdministration = '#ffb3ff';
        objColours.MedicationRequest = "#f4d2b7" ;
        objColours.CarePlan = '#FF9900';
        objColours.Sequence = '#FF9900';
        objColours.CareTeam = '#ffe6ff'
        objColours.QuestionnaireResponse = '#ffe6ff'
        // objColours.Condition = '#cc9900';
        objColours.LogicalModel = '#ff8080';
        objColours.Provenance = '#ffb3ff';
        objColours.ServiceRequest = '#ff8080';
        objColours.Composition = '#ff8080';
        objColours.Organization = '#FF9900';
        objColours.ProviderRole = '#FFFFCC';
        objColours.Location = '#cc9900';
        objColours.HealthcareService = '#FFFFCC';
        objColours.MedicationDispense = '#FFFFCC';
        //objColours.Composition = '#FFFFCC';
        objColours.Goal = '#FF9900';
        objColours.Measure = '#FF9900';
        objColours.Task = '#FF9900';
        objColours.Immunization = '#aeb76c';
        objColours.Procedure = '#aeb76c';


        return {

            summarizeValidation : function(OO,bundle) {
                //present the validation issues in the OO with the bundle entry

                //create an index of resources in the bundle
                let totalErrors = 0
                let lstResources = []
                let unknownIssues = []      //issues that can't be associated with a specific resource
                if (! bundle.entry) {
                    return {}
                }
                bundle.entry.forEach(function (entry,inx) {
                    lstResources.push({resource:entry.resource,pos:inx,issues:[]})
                })

                //add all the issues in the OO to the list
                OO.issue.forEach(function (iss) {
                    if (iss.location) {
                        let loc = iss.location[0]  //Bundle.entry[2].resource
                        let ar = loc.split('[')
                        if (ar.length > 1) {
                            let l = ar[1]   // 2].resource
                            let g = l.indexOf(']')
                            let pos = l.slice(0,g)
                            //console.log(pos,loc)

                            let resourceAtIndex = lstResources[pos]
                            let item = {severity:iss.severity,location:loc,pos:pos,diagnostics:iss.diagnostics}
                            if (iss.severity == 'error') {
                                totalErrors++
                            }
                            resourceAtIndex.issues.push(item)
                        } else {
                            unknownIssues.push(iss)
                        }


                    } else {
                        //this is an OO with no location. I didn't think this should happen & we don't know which resource caused it...
                        unknownIssues.push(iss)
                    }

                })

                return {resources:lstResources,totalErrors:totalErrors,unknownIssues:unknownIssues}

            },


            //create the graph to view the extracted resources. Assumes that all references are UUIDs
            //options {arResources:[]
            makeGraph: function (options) {

                //let objColours = {}
                let missingReferences = {}      //where a resource references a missing entry...

                var arNodes = [], arEdges = [];
                var objNodes = {};

                var allReferences = [];
                //let centralResourceNodeId;      //the node id of the centralNode (if any)

                //create a single array of all resources, including contained
                let arResources = options.arResources
                let tmpHash = {}

                //create the nodes...

                arResources.forEach(function(resource,inx) {

                    //assume that thes are all uuids
                    //todo change


                    //todo - need a way to
                    let url = `${resource.resourceType}/${resource.id}`
                    if (resource.id.indexOf('-') > -1) {    //this is a UUID
                        url = `urn:uuid:${resource.id}`
                    }

                    //check to see if this resource is already in the bundle...
                    if (!objNodes[url]) {
                        objNodes[url] = resource
                        let node = {id: url, label: resource.resourceType,
                            shape: 'box'}//,url:url,resource:resource};  //
                        node.data = {resource:resource}

                        if (objColours[resource.resourceType]) {
                            node.color = objColours[resource.resourceType];
                        }

                        let text = getNarrative(resource)
                        node.label = text + "\n" + resource.resourceType
                        arNodes.push(node);

                        var refs = [];
                        findReferences(refs,resource,resource.resourceType);
                        let cRefs = []

                        refs.forEach(function(ref){
                            allReferences.push({src:node,path:ref.path,targ:ref.reference,index:ref.index})

                        })
                    }




                });

                console.log(objNodes)

                allReferences.forEach(function(ref){
                    let targetNode = objNodes[ref.targ];
                    if (targetNode) {
                        //var label = $filter('dropFirstInPath')(ref.path);
                        let ar = ref.path.split('.')
                        ar.splice(0,1)
                        let label = ar.join('.')
                        arEdges.push({id: 'e' + arEdges.length +1,
                            from: ref.src.id,
                            to: ref.targ, // targetNode.id,
                            label: label,arrows : {to:true}})
                    } else {
                        console.log('>>>>>>> error Node Id '+ref.targ + ' is not present')
                    }
                });

                let nodes;
                let edges;

                //nodes = new vis.DataSet(arNodes);
                nodes = new vis.DataSet(arNodes)
                edges = new vis.DataSet(arEdges);


                // provide the data in the vis format
                var data = {
                    nodes: nodes,
                    edges: edges
                };

                console.log(missingReferences)

                return {graphData : data};


                function findReferences(refs,node,nodePath,index) {
                    angular.forEach(node,function(value,key){

                        //if it's an object, does it have a child called 'reference'?

                        if (angular.isArray(value)) {
                            value.forEach(function(obj,inx) {
                                //examine each element in the array
                                if (obj) {  //somehow null's are getting into the array...
                                    var lpath = nodePath + '.' + key;
                                    if (obj.reference) {
                                        //this is a reference!
//console.log(obj)
                                        //there are also circumstances where this is an element name
                                        //mar 15 - 2022

                                        let thing = obj.reference;
                                        if (thing.reference) {
                                            thing = thing.reference
                                        }
                                        refs.push({path: lpath, reference: obj.reference})

                                    } else {
                                        //if it's not a reference, then does it have any children?
                                        findReferences(refs,obj,lpath,inx)
                                    }
                                }

                            })
                        } else

                        if (angular.isObject(value)) {
                            var   lpath = nodePath + '.' + key;
                            if (value.reference) {
                                //this is a reference!
                                //if (showLog) {console.log('>>>>>>>>'+value.reference)}

                                refs.push({path: lpath, reference: value.reference, index: index})

                            } else {
                                //if it's not a reference, then does it have any children?
                                findReferences(refs,value,lpath)
                            }
                        }
                    })
                }

                function getNarrative(resource) {
                    //assumes the narrative follows the FHIR pattern of the text being inside a div element...
                    if (resource.text && resource.text.div) {

                        if (resource.text.div) {
                            var jqueryObject = $($.parseHTML(resource.text.div));
                            let txt = jqueryObject.first().text()
                            //if (txt == undefined) {txt = ""}
                            return  txt
                        } else {
                            return ""
                        }


                    } else {
                        return ""
                    }



                }

            }
        }
    })
