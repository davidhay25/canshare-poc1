angular.module("pocApp")

    .service('QutilitiesSvc', function(modelsSvc) {
        let cache = {}

        this.fhir = {}




        return {

            makeQfromComposition : function (comp,hashAllElements) {


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


            makeItemFromDG: function (fullElementList,hashAllDG) {
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