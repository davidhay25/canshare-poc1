angular.module("pocApp")

    .service('documentSvc', function($filter,utilsSvc) {

        let config= {}


        return {

            makeHISODocument: function (comp,lst,hashAllDG) {

                let fhirDT = utilsSvc.fhirDataTypes()
                let arDoc = []


                let hashLink = {}       //to create simple links from paths

                //----------- metadata
                arDoc.push(addTaggedLine("h1", comp.title))
                arDoc.push(addTaggedLine("p", comp.description))

                arDoc.push("<table class='dTable'>")
                addRowIfNotEmpty(arDoc, 'HISO number', comp.meta.hisoNumber)
                addRowIfNotEmpty(arDoc, 'version', comp.version)
                addRowIfNotEmpty(arDoc, 'Category', comp.meta.category)
                addRowIfNotEmpty(arDoc, 'Tumour stream', comp.meta.tumourStream)
                addRowIfNotEmpty(arDoc, 'Procedure', comp.meta.procedure)
                addRowIfNotEmpty(arDoc, 'Organ', comp.meta.organ)

                arDoc.push("</table>")

                //--------- list of sections
                arDoc.push(addTaggedLine("h1", "Sections"))

                arDoc.push("<table class='dTable'>")

                arDoc.push("<tr><th>Title</th><th>Cardinality</th><th>Description (rules)</th></tr>")
                comp.sections.forEach(function (sect) {
                    arDoc.push("<tr>")
                    arDoc.push(`<td>${sect.title}</td>`)

                    let occurence = "Optional"
                    if (sect.mult) {
                        if (sect.mult.indexOf('1.') > -1) {
                            occurence = "Required"
                        }
                        if (sect.mult.indexOf('*') > -1) {
                            occurence += ", can repeat"
                        } else {
                           // occurence += "single occurrence"
                        }
                        arDoc.push(`<td>${occurence}</td>`)
                    }

                    let rules = sect.rules || ""

                    arDoc.push(`<td>${rules}</td>`)
                    arDoc.push("</tr>")

                })

                arDoc.push("</table>")

                //-------- Table of contents

                arDoc.push(addTaggedLine("h1", "Table Of Contents"))
                arDoc.push("<table class='dTable' style='width:100%;'>")

                let cntLink = 0

                lst.forEach(function (item,inx) {
                    let ed = item.ed
                    let kind = ed.kind //kind = section (highlight), section-dg (ignore)

                    let ar = ed.path.split('.')
                    let indent = 8 * ar.length

                    let link = `link${cntLink++}`
                    hashLink[ed.path] = link


                    if (kind !== 'section-dg' && inx > 0) {
                        if (kind == 'section') {
                            arDoc.push("<tr class='col1'>")
                        } else {
                            arDoc.push("<tr>")
                        }

                        arDoc.push(`<a name="${hashLink[ed.path]}-src"></a>`)
                        arDoc.push(`<td style="text-indent:${indent}px">${ed.title}</td>`)
                        //arDoc.push(`<td><a href="#${ed.path}">Link</a></td>`)


                        //arDoc.push(`<td>${ed.kind}</td>`)
                        arDoc.push(`<td style="width:10%">${ed.mult}</td>`)

                        arDoc.push(`<td style="width:40%">${ed.description || ed.rules || ""}</td>`)

                        if (kind !== 'section') {
                            arDoc.push(`<td><a href="#${hashLink[ed.path]}">Details</a></td>`)
                        } else {
                            arDoc.push(`<td></td>`)
                        }


                        arDoc.push("</tr>")
                    }
                })

                arDoc.push("</table>")


                //-------- element details

                arDoc.push(addTaggedLine("h1", "Element details"))

                lst.forEach(function (item) {
                    let ed = item.ed

                    if (ed.type) {
                        let type = ed.type[0]

                        if (fhirDT.indexOf(type) == -1) {
                            //this is a group or a DataType
                            arDoc.push(`<a name="${hashLink[ed.path]}"></a>`)

                            arDoc.push(addTaggedLine("h2", ed.title));


                        } else {
                            //arDoc.push(addTaggedLine("h2", $filter('lastInPath')(ed.path)));
                            arDoc.push(`<a name="${hashLink[ed.path]}"></a>`)
                            arDoc.push(addTaggedLine("h3", ed.title));

                            arDoc.push("<table class='dTable'>");

                            addRowIfNotEmpty(arDoc, 'Description', ed.description)

                            let occurence = "Optional, "
                            if (ed.mult) {
                                if (ed.mult.indexOf('1.') > -1) {
                                    occurence = "Required, "
                                }
                                if (ed.mult.indexOf('*') > -1) {
                                    occurence += "multiple occurrences"
                                } else {
                                    occurence += "single occurrence"
                                }
                                addRowIfNotEmpty(arDoc, 'Occurrence', occurence)
                            }

                            addRowIfNotEmpty(arDoc, 'Data type', type)

                            if (ed.valueSet) {
                                let vs = ed.valueSet
                                if (vs.indexOf('http') == -1) {
                                    vs = 'https://nzhts.digital.health.nz/fhir/ValueSet/'+vs
                                }

                                addRowIfNotEmpty(arDoc, 'ValueSet', vs)

                            }

                            if (ed.fixedCoding) {
                                let disp = `${ed.fixedCoding.code} | ${ed.fixedCoding.display} | ${ed.fixedCoding.system}`
                                addRowIfNotEmpty(arDoc, 'Fixed code', disp)
                            }

                            arDoc.push("</table><br/>");

                            //arDoc.push(`<td><a href="#${hashLink[ed.path]}-src">Back</a></td>`)
                            arDoc.push(`<div style="text-align: right;"><a class="tocFont" href="#${hashLink[ed.path]}-src">Back to TOC</a></div>`)
                        }
                    }
                })


                const header = `   
                    <html><head>
                    <style>
                    
                        h1, h2, h3, h4 {
                         font-family: Arial, Helvetica, sans-serif;
                        }
                    
                        tr, td {
                            border: 1px solid black;
                            padding : 8px;
                        }
                    
                        .dTable {
                            font-family: Arial, Helvetica, sans-serif;
                            width:100%;
                            border: 1px solid black;
                            border-collapse: collapse;
                        }
                        
                        .col1 {
                            background-color:Gainsboro;
                        }
                        
                        .tocFont {
                            font-family: Calibri, sans-serif;
                        }
                                   
                    </style>
                    </head>
                    <body style="padding: 8px;">
                    
                `;

                const footer = "</body></html>"


                let html = header + arDoc.join("\n") + footer;

                return html

                function addRowIfNotEmpty(ar,description,data) {
                    if (data) {


                        let display = data;

                        let arData =  data.split('\n')
                        if (arData.length > 1)  {
                            display = ""
                            arData.forEach(function (lne) {
                                display += "<div>" + lne + "</div><br/>"
                            })
                        }


                        ar.push('<tr>');
                        ar.push('<td valign="top" width="20%" class="col1">' + description + "</td>");

                        if (data && data.toLowerCase() == 'no description') {
                            ar.push('<td></td>');
                        } else {
                            ar.push('<td>' + display + "</td>");
                        }


                        ar.push('</tr>');
                    }
                }

                function addTaggedLine(tag,data) {

                    if (data && data.toLowerCase() == 'no description') {
                        return "<"+tag + "></"+tag+">"
                    } else {
                        return "<"+tag + ">"+data+"</"+tag+">"
                    }




                }

            }
        }})