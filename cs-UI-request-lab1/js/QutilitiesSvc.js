
//utilities for the Q builder - both DG and Composition

angular.module("pocApp")

    .service('QutilitiesSvc', function() {
        let cache = {}

        this.fhir = {}




        return {


            updateEWSourcePath : function(currentPath,sourcePath) {
                //adjustment for embedded DG path. This occurs when a DG with a conditional
                //is a child element of another DG. The path of the source (the controlling element)
                //is not correct - it needs to be adjusted to allow for the containing DG
                let arControllerPath = sourcePath.split('.')  //the control element - question / source
                let arThisPath = currentPath.split('.')      // this ed - the one that is dependant

                let source = sourcePath
                //console.log(arThisPath[0],arControllerPath[0])
                if (arThisPath[0] !== arControllerPath[0]) {
                    //This is an ew in a 'contained' DG
                    let diff = Math.abs(arThisPath.length - arControllerPath.length)
                    if (arThisPath.length > arControllerPath.length) {

                        let ar = arThisPath.slice(0,diff)
                        arControllerPath = ar.concat(arControllerPath)
                        source = arControllerPath.join('.')
                    } else {
                        console.log("EnableWhen paths don't seem right...")
                        //not sure if this is ever true - or what to do if it is!
                        //probably remove the extra elements from source???
                        //let ar = arControllerPath.slice(diff)
                        // arThisPath = ar.concat(arThisPath)
                        //source = arThisPath.join('.')
                    }

                }

                return source

            },

            setFixedValueDEP : function (ed,item) {
                //if a fixed value, set the Q elements
                if (ed.fixedCoding) {   //todo - need to look for other dts we can fix
                    let coding = {system:ed.fixedCoding.system,code:ed.fixedCoding.code,display:ed.fixedCoding.display}
                    item.initial = [{valueCoding:coding}]
                    item.readOnly = true

                    //can't have answerOption if there is a fixed value...
                    delete item.answerOption
                }
            },

            makeQfromCompositionDEP : function (comp,hashAllElements) {


                //first, construct a model of sections, and top level items within that section

                //next, go through the overrides and add and z elements (they will have 3 segments, and have zElement true)
                //Other overrides will have updates the appropriate hash in the hasAllElements





console.log(hashAllElements)
                //we assume that hashAllElements is sorted by key - seems to be, but may beed to sort directly...
                Object.keys(hashAllElements).forEach(function (key) {
                    let ar = key.split('.')
                    switch (ar.length) {
                        case 1:
                            //the root element. don't need to do anything
                            break
                        case 2:
                            //a section
                            break
                        case 3:
                            //an entry within a section
                            break

                    }
                })

                return {}

                let root = {item:[]}

                comp.sections.forEach(function (section) {
                    let sectionItem = {text:section.name,type:'display',item:[]}
                    root.item.push(sectionItem)
                    sectionItem.items.forEach(function (item) {
                       // let
                    })
                    
                })
           return root
                let rootElementEd = fullElementList[0].ed

                let Q = {resourceType : "Questionnaire",status:'draft'}
                Q.url = `http://canshare.co.nz/fhir/Questionnaire/${rootElementEd.name}`
                Q.description = rootElementEd.description
            },


            makeItemFromDGDEP: function (fullElementList,hashAllDG) {
                //create a Q item representing a DG
                //Rooted in a group item, can have:
                //  a child that is a single item (representing a FHIR dt)

                let rootElementEd = fullElementList[0].ed

                let root = {text:rootElementEd.title,linkId:rootElementEd.path,item:[]}
                let insertItem = root       //where an item is to be inserted

                fullElementList.forEach(function (item) {
                    let ed = item.ed
                    if (ed && ed.type) {
                        let type = ed.type[0]
                        let DG = hashAllDG[type]
                        if (DG) {
                            //this is a referenced DG. Create a new group
                            let groupItem = {text:ed.text,linkId:ed.path,type:'group',item:[]}
                            insertItem.item.push(groupItem)
                            insertItem = groupItem      //make the place to insert the group

                        } else {
                            //this is a FHIR DT
                            let childItem = {text:ed.title}
                            childItem.type = 'string'       //todo derive Q type from DT
                            childItem.linkId = ed.path
                            insertItem.item.push(childItem)

                        }
                    }


                })



                //processDG(DG,root)
                return root

            }
        }})