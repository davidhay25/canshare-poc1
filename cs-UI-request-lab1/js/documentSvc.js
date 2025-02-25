angular.module("pocApp")

    .service('documentSvc', function($filter,utilsSvc) {

        let config= {}


        return {

            makeHISODocument: function (lst) {

                let arDoc = []
                arDoc.push("This is a test")

                let fhirDT = utilsSvc.fhirDataTypes()


                lst.forEach(function (item) {
                    let ed = item.ed

                    if (ed.type) {
                        let type = ed.type[0]
                        if (fhirDT.indexOf(type) == -1) {
                            //this is a group or a DataType
                            arDoc.push(addTaggedLine("h2", ed.title));

                        } else {
                            //arDoc.push(addTaggedLine("h2", $filter('lastInPath')(ed.path)));
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


                            arDoc.push("</table><br/>");
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