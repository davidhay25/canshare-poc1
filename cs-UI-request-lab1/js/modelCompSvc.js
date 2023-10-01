angular.module("pocApp")

    .service('modelCompSvc', function($q,$http,modelsSvc,$filter) {

        let config = {}


        return {


            makeFullList: function (inComp,inTypes,inHashAllDG) {
                let comp = angular.copy(inComp)         //as we will be modifying the composition
                let hashAllDG = angular.copy(inHashAllDG)
                //generate a full list of elements. Like DG but need to accomodate sections
                //section name is in the path...
                //assume that composition hierarcy is only 2 levels - ie a comp can have a parent, but the parent cannot
                //this simplifies the parsing. May need to revisit if too limiting

                //processing the DG hierarchy is destructive (the parent element is removed after processing
                //to avoid infinite recursion
                let types = angular.copy(inTypes)


                let allElements = []

                let hashAllElements = {}        //keyed on path

                //create as ed to act as the root
                let edRoot = {path:comp.name,title:comp.title}
                hashAllElements[comp.name] = {ed:edRoot}

                //allElements.push(edRoot)

                //processes a single DG, adding child elements (recursively) to the hash
                function processDG(DG,pathRoot) {

                    console.log("ProcessDG:" + DG.name)
                    if (DG.parent) {
                        //todo
                        let parentModel = types[DG.parent]
                        delete DG.parent
                        processDG(parentModel,pathRoot)
                    } else {
                        //This is a 'leaf' DG. Iterate through the diff
                        DG.diff.forEach(function (ed) {

                            let type = ed.type[0]
                            let model = types[type]
                            if (model && model.name) {
                                //console.log(types[type])
                                let childPath = `${pathRoot}.${model.name}`
                                hashAllElements[childPath] = {ed:model,host:ed}
                                processDG(model,childPath)
                            } else {
                                //this is a FHIR DT
                                let path = `${pathRoot}.${ed.path}`
                                ed.kind = 'element'
                                hashAllElements[path] = {ed:ed}
                            }
                        })
                    }

                }

                //process a single section item. Create and add the section to the hash, then call processDG to get the child elements of the DG
                function processSectionItem(sectionItem,pathRoot) {
                    console.log("ProcessSectionItem:"+sectionItem.name)
                    //extract all the elements in the DG,
                    let localPath = sectionItem.name         //the path in the section. Often the DG name
                    let type = sectionItem.type[0]   //one type only
                    //let mult = sectionItem.mult     //how many times this item (DT, DG) can appear in the section

                    //let type = DG.name   //one type only
                    let model = types[type]    //this could be a FHIR DT or a DG. A DG will have a name, a DT will not

                    if (model && model.name) {
                        //This is a DG. todo need to think about DG inheritance

                        let childPathRoot
                        //let childPathRoot = `${pathRoot}.${model.name}`

                        childPathRoot = `${pathRoot}.${localPath}`
                        hashAllElements[childPathRoot] = {ed:model,host:sectionItem}


                        let vo = modelsSvc.getFullListOfElements(model,types,hashAllDG)
                        let allElementsThisDG = modelsSvc.makeOrderedFullList(vo.allElements)     //orders the list and removes group original children

                        //let allElementsThisDG = vo.allElements      //array of {ed: host: } ed path includes model name
                        allElementsThisDG.forEach(function (item) {
                            let ed = item.ed
                            ed.kind = 'element'

                            let shortPath = $filter('dropFirstInPath')(ed.path)

                            let p
                            if (ed.type) { p = ed.type[0]}
                            console.log(shortPath,ed.path,ed.mult,p)

                            let path = `${childPathRoot}.${shortPath}`
                            hashAllElements[path] = {ed:ed}

                        })




console.log(vo.allElements)
                        // - temp, checking out using the DG expansion    processDG(model,childPathRoot)



                        /* not using a slice directly any more
                        //if there's a slice, then add the slice name to the path..
                        if (sectionItem.slice) {
                            //childPathRoot += '-' + DG.slice.name

                            childPathRoot = `${pathRoot}.${sectionItem.name}`
                            //console.log('slice',childPathRoot,model)
                            let slicedModel = angular.copy(model)
                            slicedModel.path += "-" + sectionItem.slice.name
                            slicedModel.title = sectionItem.slice.title
                            slicedModel.slice = sectionItem.slice
                            slicedModel.kind = 'slice'
                            hashAllElements[childPathRoot] = {ed:slicedModel}

                        } else {
                            //childPathRoot = `${pathRoot}.${model.name}`
                            childPathRoot = `${pathRoot}.${localPath}`
                            hashAllElements[childPathRoot] = {ed:model,host:sectionItem}
                        }

                        */



                    } else {
                        console.log('missing name: ',model)
                        //this is a Z element - ie a FHIR DT directly attached to the section
                        // or a missing DG
                        alert(`Missing type: ${type} (may be a z element - will be fixing if so`)
                    }

                }

                //note the assumptions of a single level hierarchy - a parent cannot have another parent
                function processComp(comp) {



                        //todo - check for removed sections in th eoverride


                        comp.sections.forEach(function (section) {

                            //let pathRoot = `${comp.name}.section-${section.name}`   //section root is model name + section name
                            let pathRoot = `${comp.name}.${section.name}`   //section root is model name + section name
                            hashAllElements[pathRoot] = {ed:section}
                            //each item is assumed to be a DG - think about others (Z & override) later
                            section.items.forEach(function (item) {
                               //{name: title: type: mult:}

                                processSectionItem(item,pathRoot)


                            })

                            //let DG = types[section.name]


                        })

                }

                processComp(comp)

                //Now process any overrides
                if (comp.override) {
                    Object.keys(comp.override).forEach(function (path) {
                        hashAllElements[path] = {ed:comp.override[path]}
                    })

                }

                let ar = []
                Object.keys(hashAllElements).forEach(function (key) {
                    let item = hashAllElements[key]         // {ed: sectionItem: }
                    delete item.ed.diff //don't think the diff is needed here...
                    let clone = angular.copy(item)        //don't want to update the actual model
                    clone.ed.path = key

                    ar.push(clone)
                })

                return {allElements:ar,hashAllElements:hashAllElements}




            }
        }
    })