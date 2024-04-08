
angular.module("pocApp").service('dgInflaterSvc', function($filter) {



    return {

        fhirDataTypes : function(){

            return ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']
        },

//get the complete list of elements for a DG
        getFullListOfDGElements(inModel, inTypes, hashAllDG) {

            let types = angular.copy(inTypes)

            let model = angular.copy(inModel)
            let topModel = angular.copy(model)


            //ensure the types hash has the FHIR dts as well
            let fdt = this.fhirDataTypes()
            fdt.forEach(function (dt) {
                types[dt] = dt
            })



            //console.log('getFullListOfElements for '+ inModel.name)
            if (!inModel) {
                return
            }
            let iterationCount = 0      //a counter to detect excessive iterations (indicates a circular reference)
            //create a complete list of elements for a DG (Compositions have a separate function)

            //processing the DG hierarchy is destructive (the parent element is removed after processing
            //to avoid infinite recursion - update: not any more.



            let hashHidden = {}     //ed's with mult = 0..0

            let allElements = []
            let errors = []
            let arLog = []  //a processing log of



            //first follow the parental hierarchy to populate the initial list
            //updates allElements as it extracts
            //as it moves up the hierarchy, add the element to the list (based on the path) unless there is
            //already one there (so it replaced the parental one)

            //create as ed to act as the root
            let edRoot = {ed: {path: model.name, title: model.title, description: model.description}}
            allElements.push(edRoot)

            //a hash of all parents examined as the DG is inflated.
            //If a DG is processed more than once, the process terminates with an error - this could be recursive
            let hashParents = {}

            try {
                //udpates allElements



                extractElements(model, model.name, 'root')   //the guts of the function

                arLog.length = 0        //don't return the log contents if all was OK
            } catch (ex) {
                console.log(arLog)
            }


            //set the mult to 0..0 for any element where an ancestor (ie path in a parent) is 0..0
            //this doesn't change the ED stored in the browser - it's only the memory copy
            allElements.forEach(function (item) {
                //item.ed.mult = '0..0'
                for (const key of Object.keys(hashHidden)) {
                    //if (item.ed.path.startsWith(key +'.')) {
                    if (item.ed.path.isChildPath(key)) {
                        item.ed.mult = '0..0'
                        break
                    }
                }
            })



            return {
                allElements: allElements,
                log: arLog,
                hashHidden: hashHidden
            }

            // add to list of elements, replacing any with the same path (as it has been overwritten)
            //todo - what was 'host' for?
            function addToList(ed, host, sourceModel) {
                //is there already an entry with this path
                let path = ed.path

                let foundEd

                let pos = -1
                let found = false
                for (const element of allElements) {
                    pos++
                    if (element.ed.path == path) {     //should only be one (unless there are duplicate names in the model
                        found = true
                        break
                    }
                }

                let itemToInsert = {ed: ed, host}
                if (host) {     //todo not sure if this is still used...
                    itemToInsert.host = host
                }

                //record the sourceModel - ie where in the hierarchy this element came from
                if (sourceModel) {
                    itemToInsert.ed.sourceModelName = sourceModel.name
                }

                //jan16
                if (ed.mult == '0..0') {
                    //this one is hidden. Add it to the hash
                    hashHidden[ed.path] = true
                }




                if (found) {
                    //if (pos > -1) {
                    //replace the existing path

                    //april 8 try not replacing as existing would be more recent
                    //console.log('replacing ' + path + " (" + sourceModel.name + ")")
                    //allElements.splice(pos, 1, itemToInsert)


                } else {
                    console.log('inserting ' + path + " (" + sourceModel.name + ")")
                    allElements.push(itemToInsert)          //this is what was working - just at the end
                }
            }



            //process a single element at the root of the DG
            function extractElements(model, pathRoot, type) {
                console.log(`extractElements: ${model.name}`)

                arLog.push({dg: model.name, path: pathRoot, type: type})

                iterationCount++
                if (iterationCount > 2000) {
                    alert(`Excessive iteration count for DG ${inModel.name}. The tree view will be incorrect. The processing steps are shown in an errors tab.`)
                    throw new Error(`Excessive iteration count for DG ${inModel.name}`)
                }



                //console.log('extractElements ' + model.name)
                //do parents first.
                if (model.parent) {

                    if (types[model.parent]) {

                        //to prevent infinite recursion
                        let parentName = model.parent


                        extractElements(types[parentName], pathRoot, "parent")


                    } else {
                        errors.push(`missing type name ${model.parent}`)
                        console.log(`missing type name ${model.parent}`)
                    }
                }

                if (model.diff) {
                    model.diff.forEach(function (ed) {

                        if (ed.type && ed.type.length > 0) {
                            let type = ed.type[0]   //only look at the first code
                            console.log(`Diff: ${ed.title} ${type}`)
                            if (types[type]) {
                                //this is a known type. Is there a definition for this type (ie do we need to expand it)
                                //a fhir datatype will not have a diff...
                                let childDefinition = types[type]

                                if (childDefinition.diff) {
                                    //if there is a diff element in the type, then it is a DG that can be expanded

                                    let relativePath = $filter('dropFirstInPath')(`${pathRoot}.${ed.path}`)

                                    //console.log('expanding child: ' + childDefinition.name)
                                    let clone = angular.copy(ed)
                                    clone.path = pathRoot + "." + ed.path

                                    //add to the list of elements
                                    addToList(clone, ed, model) //model will be the source

                                    extractElements(childDefinition, pathRoot + "." + ed.path, "element")

                                } else {
                                    //list add the ed to the list
                                    //this is a fhir dt
                                    let clone = angular.copy(ed, null, model) //include the model so the source of the ed is known

                                    clone.path = pathRoot + '.' + ed.path
                                    // function addToList(ed,host,sourceModel) {
                                    addToList(clone, null, model)

                                }


                            } else {
                                errors.push(`missing type ${model.name}`)
                                alert(`The type ${type} could not be found looking at DG ${model.name}`)
                            }


                        } else {
                            alert(`ed ${model.name} ${ed.path} is missing the type `)
                            errors.push(`ed ${model.name} ${ed.path} is missing the type `)
                        }
                    })
                }


            }


        }


    }
})
