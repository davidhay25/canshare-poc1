angular.module("pocApp")

    .service('modelCompSvc', function($q,$http) {

        let config = {}


        return {


            makeFullList: function (comp,types) {
                //generate a full list of elements. Like DG but need to accomodate sections
                //section name is in the path...
                //assume that composition hierarcy is only 2 levels - ie a comp can have a parent, but the parent cannot
                //this simplifies the parsing. May need to revisit if too limiting

                let allElements = []

                let hashAllElements = {}        //keyed on path

                //create as ed to act as the root
                let edRoot = {path:comp.name,title:comp.title}
                hashAllElements[comp.name] = edRoot

                //allElements.push(edRoot)

                function processDG(DG,pathRoot) {

                    if (DG.parent) {
                        //todo
                    } else {
                        //This is a 'leaf' DG. Iterate through the diff
                        DG.diff.forEach(function (ed) {

                            let type = ed.type[0]
                            let model = types[type]
                            if (model && model.name) {
                                console.log(types[type])
                                let childPath = `${pathRoot}.${model.name}`
                                //hashAllElements[childPath] = model
                                processDG(model,childPath)
                            } else {
                                //this is a FHIR DT
                                let path = `${pathRoot}.${ed.path}`
                                hashAllElements[path] = ed
                            }
                        })
                    }

                }

                function extractElements(DG,pathRoot) {
                    //extract all the elements in the DG,
                    let type = DG.type[0]   //one type only
                    let model = types[type]    //this could be a FHIR DT or a DG. A DG will have a name, a DT will not

                    if (model.name) {
                        //This is a DG. todo need to think about DG inheritance

                        let childPathRoot
                        //If there is a slice, then use the path from the DG as the path.
                        // Otherwise use the model name todo - should this be 'name' not 'path'?

                        //let childPathRoot = `${pathRoot}.${model.name}`

                        //if there's a slice, then add the slice name to the path..
                        if (DG.slice) {
                            //childPathRoot += '-' + DG.slice.name

                            childPathRoot = `${pathRoot}.${DG.path}`
                            console.log('slice',childPathRoot,model)
                            let slicedModel = angular.copy(model)
                            slicedModel.path += "-" + DG.slice.path
                            hashAllElements[childPathRoot] = slicedModel

                        } else {
                            childPathRoot = `${pathRoot}.${model.name}`
                            hashAllElements[childPathRoot] = model
                        }


                        processDG(model,childPathRoot)

                    } else {
                        console.log('missing name: ',model)
                        //this is a Z element - ie a FHIR DT directly attached to the section
                    }

                }

                //note the assumptions of a single level hierarchy - a parent cannot have another parent
                function processComp(comp) {
                    if (comp.parent) {
                        //this composition has a parent, so process that first
                        //tmp processComp(types[comp.parent])     //the parent property is the name of the parent
                    } else {
                        //this is a 'leaf
                        comp.sections.forEach(function (section) {
                            let pathRoot = `${comp.name}.section-${section.name}`   //section root is model name + section name
                            hashAllElements[pathRoot] = section
                            //each item is assumed to be a DG - think about others (Z & override) later
                            section.items.forEach(function (DG) {
                                extractElements(DG,pathRoot)
                            })

                            //let DG = types[section.name]


                        })
                    }
                }

                processComp(comp)

                let ar = []
                Object.keys(hashAllElements).forEach(function (key) {
                    let ed = hashAllElements[key]
                    //ed.fullPath = key
                    ed.path = key
                    ar.push(ed)
                })

                return {allElements:ar}




            }
        }
    })