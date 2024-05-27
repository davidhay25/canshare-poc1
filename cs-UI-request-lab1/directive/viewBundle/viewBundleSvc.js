
angular.module("formsApp")

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
                if (OO && OO.issue) {
                    OO.issue.forEach(function (iss) {
                        if (iss.location) {
                            let loc = iss.location[0]  //Bundle.entry[2].resource
                            let ar = loc.split('[')
                            if (ar.length > 1) {
                                let l = ar[1]   // 2].resource
                                let g = l.indexOf(']')
                                let pos = l.slice(0,g)


                                let resourceAtIndex = lstResources[pos]
                                if (resourceAtIndex) {
                                    let item = {severity:iss.severity,location:loc,pos:pos,diagnostics:iss.diagnostics}
                                    if (iss.severity == 'error') {
                                        totalErrors++
                                    }
                                    resourceAtIndex.issues.push(item)
                                } else {
                                    unknownIssues.push(iss)
                                }

                            } else {
                                unknownIssues.push(iss)
                            }


                        } else {
                            //this is an OO with no location. I didn't think this should happen & we don't know which resource caused it...
                            unknownIssues.push(iss)
                        }

                    })
                }


                return {resources:lstResources,totalErrors:totalErrors,unknownIssues:unknownIssues}

            },


            //create the graph to view the extracted resources. Assumes that all references are UUIDs
            //options {arResources:[]
            makeGraph: function (options) {


                //let hashResources = {}      //resource by id
                //let objColours = {}
                let missingReferences = {}      //where a resource references a missing entry...
                let focusResourceRef
                if (options.focusResource) {    //this is an actual resource instance

                    focusResourceRef = `${options.focusResource.resourceType}/${options.focusResource.id}` //default to type/id


                    if (options.focusResource.id.indexOf('-') > -1) {    //this is a UUID
                        focusResourceRef = `urn:uuid:${options.focusResource.id}`
                    }



                }


                var arNodes = [], arEdges = [], edge;
                var objNodes = {};

                var allReferences = [];
                //let centralResourceNodeId;      //the node id of the centralNode (if any)

                //create a single array of all resources, including contained
                let arResources = options.arResources
                let tmpHash = {}

                //create the nodes...


                arResources.forEach(function(resource,inx) {




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
                        findReferences(refs,resource,resource.resourceType);    //locate all the outbound references for this element
                        //let cRefs = []

                        refs.forEach(function(ref){
                            allReferences.push({src:node,path:ref.path,targ:ref.reference,index:ref.index})

                        })
                    }

                });

               // console.log(objNodes)

                //if there's a focusResource, then assemble a hash of all resources that it references, or that reference it

                let hashResourcesToInclude = {}     //when there is a focus resource, this will be a hash of resources that have a reference with it
                hashResourcesToInclude[focusResourceRef] = true     //include the focus resource
                let refToInclude = []  //references to include
                allReferences.forEach(function(ref){
                    let targetNode = objNodes[ref.targ];    //the node that the reference points to...
                    if (targetNode) {
                        //var label = $filter('dropFirstInPath')(ref.path);
                        let ar = ref.path.split('.')
                        ar.splice(0,1)
                        let label = ar.join('.')
                        edge = {id: 'e' + arEdges.length +1,
                            from: ref.src.id,
                            to: ref.targ, // targetNode.id,
                            label: label,arrows : {to:true}}


                        //console.log(focusResourceRef, ref.src.id,ref.targ)
                        if (focusResourceRef) {
                            if (ref.src.id == focusResourceRef) {
                                hashResourcesToInclude[ref.targ] = true
                                refToInclude.push(ref)
                                //console.log('include src')
                                arEdges.push(edge)
                            }

                            if ( ref.targ == focusResourceRef) {
                                hashResourcesToInclude[ref.src.id] = true
                                refToInclude.push(ref)
                                //console.log('include targ')
                                arEdges.push(edge)
                            }

                        } else {
                            arEdges.push(edge)
                        }

                    } else {
                        let resource = ref.src.data.resource
                        missingReferences[resource.id] = missingReferences[resource.id] || {refs:[]}
                        missingReferences[resource.id].resource = resource
                        missingReferences[resource.id].refs.push({target:ref.targ,path:ref.path})
                        console.log('>>>>>>> error Node Id '+ref.targ + ' is not present. (From '+ ref.src.id)
                    }
                });

                //console.log(focusResourceRef,hashResourcesToInclude)

                //create an array of nodes, excluding those that don't have a refence with the focus resource
                let arNodes1 = []

                arNodes.forEach(function (node) {
                    if (focusResourceRef) {
                        if (hashResourcesToInclude[node.id]) {
                            arNodes1.push(node)
                        }
                    } else {
                        arNodes1.push(node)

                    }

                })

                let nodes;
                let edges;

                //nodes = new vis.DataSet(arNodes);
                nodes = new vis.DataSet(arNodes1)
                edges = new vis.DataSet(arEdges);


                // provide the data in the vis format
                var data = {
                    nodes: nodes,
                    edges: edges

                };

                console.log(missingReferences)

                return {graphData : data,missingReferences:missingReferences};


                function findReferences(refs,node,nodePath,index) {
                    angular.forEach(node,function(value,key){

                        //if it's an object, does it have a child called 'reference'?

                       // if (angular.isArray(node.id,value)) {
                        if (angular.isArray(value)) {
                            //console.log(value)
                            value.forEach(function(obj,inx) {
                                //examine each element in the array
                                if (obj) {  //somehow null's are getting into the array...
                                    var lpath = nodePath + '.' + key;
                                    if (obj.reference || obj.valueReference) {
                                        //this is a reference!
//console.log(obj)


                                        //This is a 'normal' reference - from a defined element
                                        if (obj.reference) {
                                            let thing = obj.reference;
                                            //there are also circumstances where this is an element name
                                            //mar 15 - 2022

                                            if (thing.reference) {
                                                thing = thing.reference
                                            }
                                            refs.push({path: lpath, reference: obj.reference})
                                        }


                                        //for extensions, the element name is 'valueReference'
                                        if (obj.valueReference) {
                                            refs.push({path: lpath, reference: obj.valueReference.reference})
                                        }

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
