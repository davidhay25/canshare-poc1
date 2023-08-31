//Utilities related to IG generation
angular.module("pocApp")

    .service('igSvc', function(modelsSvc) {

        return {
            makeFshForComp : function(comp,elements,hashElements) {
                return //todo - finish later
                //generate a fsh file for a composition.
                //the sections will be the top level entries. We use the composition to structure the model by
                //iterating over the sections, then the contents of the sections.
                //but because the composition can override the DG's, we need to iterate using the values in hashElements

                //hashElements has all elements by path todo - check that DG inheritance works properly
                console.log(comp)
                console.log(elements)
                let that = this
                
                comp.sections.forEach(function (sect) {
                    sect.items.forEach(function (item) {
                        let type = item.type[0]         //only have a single type
                        let fsh = that.makeFshForDG()

                    })
                })
            },
            makeFshForDG : function (dg,elements) {
                //generate a FSH file for a given DG
                //elements is the complete list of elements, including those derived from parents and
                //with child values updated from parents (if any)

                let fhirDT = modelsSvc.fhirDataTypes()

                //first construct an object that represents the hierarchy (rather than a flat list of elements).
                let hash = {}
                let rootPath
                elements.forEach(function (item,inx) {
                    let ed = item.ed
                    let path = ed.path
                    hash[path] = {ed:ed,children:[]}  //add to the hash in case it is a parent...

                    //add the ed to the parent
                    let ar = ed.path.split('.')
                    if (ar.length > 1) {
                        ar.pop()
                        let parentPath = ar.join('.')
                        hash[parentPath].children.push(hash[path])
                    } else {
                        rootPath = ar[0]
                    }

                })

               // now we can build the FSH document

                let arLines = []
                arLines.push(`Logical:\t ${dg.name}`)
                arLines.push(`Id:\t\t ${dg.name}`)
                arLines.push(`Title:\t\t "${dg.title}"`)
                if (dg.description) {
                    arLines.push(`Description:\t "${dg.description}"`)
                }
                arLines.push("")

                //the recursive processing function
                function processNode(ar,node,spacer) {
                    //ar.push(node.ed.path)
                    let arFshLine = getFsh(node.ed)     //will be an array of lines
                    arFshLine.forEach(function (lne) {
                        ar.push(spacer + lne)
                    })

                    if (node.children) {
                        //the first element (the root) has no fshLine. Checking here avoids over indenting
                        if (arFshLine.length > 0) {
                            spacer += "  "
                        }

                        node.children.forEach(function (child) {
                            processNode(ar,child,spacer)
                        })
                    }
                }

                processNode(arLines,hash[rootPath],"")
                //return arLines.join('\r\n')
                return arLines.join('\n')

                //get the fsh lines for an ed
                //can be more than one
                function getFsh(ed) {

                    if (ed.type) {
                        let arLne = []
                        let lne = ""
                        let type = ed.type[0]
                        //if the type is not a FHIR type, then it will be one of the DG. Replace it with 'BackboneElement'
                        if (fhirDT.indexOf(type) == -1) {
                            type = "BackboneElement"
                        }

                        let ar =  ed.path.split('.')
                        lne = `* ${ar[ar.length-1]}`
                        let mult = ed.mult || '0..1'
                        lne += ` ${mult} ${type} `

                        if (ed.description) {
                            lne += `"${cleanString(ed.description)}"`
                        } else {
                            lne += `"${cleanString(ed.path)}"`  //description is required
                        }
                        arLne.push(lne)
                        if (ed.valueSet) {
                            let lneVs =`* ${ar[ar.length-1]} from ${ed.valueSet} (preferred)`
                            arLne.push(lneVs)
                            //let lneVs = `item2 from http://hl7.org/fhir/ValueSet/contact-point-system (required)`

                        }

                        return arLne
                    } else {
                        return []
                    }

                }

                function cleanString(s) {
                    if (s) {
                        s = s.replace(/"/g, "'");
                        return s
                    } else {
                        return ""
                    }


                }



            },
            makeDocumentProfile : function (comp) {
                //generate a
            }

        }
    })