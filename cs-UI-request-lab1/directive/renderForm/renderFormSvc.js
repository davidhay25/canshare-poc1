

angular.module("pocApp")

    .service('renderFormsSvc', function($q,$http) {

        arExpandedVsCache = {}
        //formData = {}

        //termServer = "https://r4.ontoserver.csiro.au/fhir/"
        termServer = "https://terminz.azurewebsites.net/fhir/"



        extItemControl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extUrlObsExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
        extResourceReference = "http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource"
        extHidden = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"


        //todo fsh doesn't underatnd expression extension...
        //extPrepop = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-prepop"

        extPrepop = "http://canshare.com/fhir/StructureDefinition/sdc-questionnaire-initialExpression"

        extExtractNotes = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractNotes"
        extExtractPath = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractPath"
        extExtractType = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractType"
        extExtractNone = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-extractNone"

        extUsageNotes = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-usageNotes"

        extVerification= "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-verification"
        extNotes= "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-notes"

        extSourceStandard = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-sourceStandard"

        extHisoClass = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-class"
        extHisoLength = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-length"
        extHisoDT = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-dt"
        extHisoLayout = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hiso-layout"

        extColumn = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column"
        extColumnCount = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-column-count"
        extDescription = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-item-description"

        // extAuthor = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-author"
        extQAttachment = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-attachment"
        extHL7v2Mapping = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-v2mapping"
        extCheckOutQ = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-check-out"

        extHisoStatus = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-hisostatus"
        extHisoUOM = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-unit-of-measure"

        extFolderTag = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-folder-tag"

        extPlaceholder = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-placeholder"
        extExclude = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-exclude"


        return {

            expandVS : function(url,filter) {
                let deferred = $q.defer()
                //for now, go directly to the term server. Might want to bounce it through the nodejs server eventually
                let qry = `${termServer}ValueSet/$expand?url=${url}`
                if (filter){
                    qry += `&filter=${filter}`
                }

                $http.get(qry).then(
                    function (data) {
                        deferred.resolve(data.data)     //the expanded VS

                    }, function (err) {
                        deferred.reject(err.data)
                    }
                )

                return deferred.promise

                let encodedQry = encodeURIComponent(qry)

                $http.get(`/proxy?qry=${encodedQry}`).then(
                    function (data) {
                        $scope.expandedVS = data.data
                        console.log($scope.expandedVS)
                    }
                )
            },

            findExtension : function(item,url) {
                //return an array with all matching extensions
                let ar = []

                if (item && item.extension) {
                    for (var i=0; i <  item.extension.length; i++){
                        let ext = item.extension[i]
                        if (ext.url == url) {
                            ar.push(ext)
                        }
                    }
                }
                return ar

            },
            getMetaInfoForItem : function(item) {
                //populate meta info - like resource extraction. Basically pull all extensions into a VO
                var that = this
                let meta = {}



                //update the Observationextract
                let ar = this.findExtension(item,extUrlObsExtract)
                if (ar.length > 0 ) {
                    if (ar[0].valueBoolean) {
                        meta.extraction = meta.extraction || {}
                        meta.extraction.extractObservation = true
                    }
                }

                //now look for any extraction notes
                let ar1 = this.findExtension(item,extExtractNotes)
                if (ar1.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.notes = ar1[0].valueString
                }

                let ar1b = this.findExtension(item,extExtractPath)
                if (ar1b.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.path = ar1b[0].valueString
                }

                let ar1c = this.findExtension(item,extExtractType)
                if (ar1c.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.type = ar1c[0].valueString
                }

                let ar1d = this.findExtension(item,extExtractNone)
                if (ar1d.length > 0) {
                    meta.extraction = meta.extraction || {}
                    meta.extraction.none = ar1d[0].valueBoolean
                }


                //now look for description
                let arDesc = this.findExtension(item,extDescription)
                if (arDesc.length > 0) {

                    meta.description = arDesc[0].valueString
                }

                //and usage notes
                let ar2 = this.findExtension(item,extUsageNotes)
                if (ar2.length > 0) {
                    //meta.extraction = meta.extraction || {}
                    meta.usageNotes = ar2[0].valueString
                }

                //and reference types
                let ar3 = this.findExtension(item,extResourceReference)

                if (ar3.length > 0) {
                    meta.referenceTypes = meta.referenceTypes || []
                    ar3.forEach(function (ext) {
                        meta.referenceTypes.push(ext.valueCode)
                    })
                }

                //and source standard
                let ar4 = this.findExtension(item,extSourceStandard)
                if (ar4.length > 0) {
                    meta.sourceStandard = ar4[0].valueString
                }

                //display col - column number, 1 based
                let ar5 = this.findExtension(item,extColumn)
                if (ar5.length > 0) {
                    meta.column = ar5[0].valueInteger
                }

                //column count
                // meta.columnCount = 2       //default column count

                let ar6 = this.findExtension(item,extColumnCount)
                if (ar6.length > 0) {
                    meta.columnCount = ar6[0].valueInteger

                }

                //form control
                let ar7 = this.findExtension(item,extItemControl)
                if (ar7.length > 0) {
                    meta.itemControl = ar7[0].valueCodeableConcept

                    //set the element 'renderVS' to the code. Used when rendering a valueset
                    if (meta.itemControl.coding) {
                        meta.renderVS = meta.itemControl.coding[0].code
                    }

                }

                //hidden
                let ar8 = this.findExtension(item,extHidden)
                if (ar8.length > 0) {
                    meta.hidden = ar8[0].valueBoolean
                }

                /*
                                //hiso code
                                let ar10 = this.findExtension(item,extHisoClass)
                                if (ar10.length > 0) {
                                    meta.hisoClass = ar10[0].valueString
                                }
                               */
//hiso code
                let ar11 = this.findExtension(item,extHisoLength)
                if (ar11.length > 0) {
                    meta.hisoLength= ar11[0].valueInteger
                }

                let ar12 = this.findExtension(item,extHisoDT)
                if (ar12.length > 0) {
                    meta.hisoDT= ar12[0].valueString
                }

                let ar13 = this.findExtension(item,extHisoLayout)
                if (ar13.length > 0) {
                    meta.hisoLayout= ar13[0].valueString
                }


                let ar14 = this.findExtension(item,extVerification)
                if (ar14.length > 0) {
                    meta.verification = ar14[0].valueString
                }

                let ar15 = this.findExtension(item,extNotes)
                if (ar15.length > 0) {
                    meta.notes= ar15[0].valueString
                }

                let ar16 = this.findExtension(item,extHL7v2Mapping)
                if (ar16.length > 0) {
                    meta.v2mapping= ar16[0].valueString
                }

                let ar17 = this.findExtension(item,extHisoUOM)
                if (ar17.length > 0) {
                    meta.UOM = ar17[0].valueString
                }

                //updateExtension(item,extHL7v2Mapping,"String",meta.v2mapping)

                let ar18 = this.findExtension(item,extPlaceholder)
                if (ar18.length > 0) {
                    meta.placeholder = ar18[0].valueString
                }

                let ar19 = this.findExtension(item,extExclude)
                if (ar19.length > 0) {
                    meta.exclude = ar19[0].valueBoolean
                }


                return meta

                function getSingleExtValueTypeDEP(meta,item,url,type) {
                    let ar = that.findExtension(item,url)
                    if (ar.length > 0) {
                        let v = ar[0]
                        return v[type]
                    }
                }
            },

            makeQR :  function(Q,form) {
                let that = this


                //todo - working on multiple values for a single linkId.
                //the form var is a hash keyed by the linkId containing the value (if any).
                // For now, make that an array = and only take the first value when processing. Later - allow more than one

                let hashFormValues = {}
                Object.keys(form).forEach(function (key) {
                    let value = form[key]       //the value entered. if this item can have multiple values, then the linkId will have a sufffix separated by -- - eg linkId--1 and linkId--2
                    let ar = key.split('--')
                    let realKey = ar[0]  //strip off any suffix - eg linkid--1 will become just linkid
                    hashFormValues[realKey] = hashFormValues[realKey] || []
                    hashFormValues[realKey].push(value)

                })


                //make the QuestionnaireResponse from the form data
                //hash is items from the Q keyed by linkId - not used any more!
                //form is the data entered keyed by linkId
                let qrId = this.createUUID()
                let err = false

                let QR = {resourceType:'QuestionnaireResponse',id:qrId,status:'in-progress'}
                QR.text = {status:'generated'}
                QR.text.div="<div xmlns='http://www.w3.org/1999/xhtml'>QR resource</div>"
                QR.questionnaire = Q.url
                QR.authored = new Date().toISOString()

                QR.item = []

                //the top level items - sections - directly off the Q root...
                Q.item.forEach(function (section) {
                    let parentItem = null

                    if (section.item) {
                        section.item.forEach(function (child) {
                            //items off the section. they will either be data elements, or groups

                            let itemToAdd = {linkId : child.linkId,text:child.text}
                            //let itemToAdd = {linkId : child.linkId,answer:[],text:child.text}
                            let key = child.linkId  //the key for this Q item
                            let value = form[key]
                            let arValues = hashFormValues[key]


                            if (arValues !== undefined) {        //is there a value for this item. Won't be if this is a group...
                               /* if (! parentItem) {
                                    parentItem = {linkId : section.linkId,text:section.text,item: []}
                                    QR.item.push(parentItem)
                                }
*/
                                arValues.forEach(function (value) {
                                    let result = getValue(child,value)
                                    if (result ) {

                                        if (! parentItem) {
                                            parentItem = {linkId : section.linkId,text:section.text,item: []}
                                            QR.item.push(parentItem)
                                        }


                                        itemToAdd.answer = itemToAdd.answer || []
                                        itemToAdd.answer.push(result)
                                    }

                                })
                                parentItem.item = parentItem.item || []
                                parentItem.item.push(itemToAdd)

                            }



                            //Are there any grandchildren? If so, they will be conditional items...
                            //the immediate child is of type group, with the actual data items as grandchildren below that
                            if (child.item) {
                                //so this will be the groups - with child items
                                //the first is the 'main' item that goes in the left pane,
                                // others are in the right pane. May have conditionals (but do we care here? )
                                //but all are at the some level in the QR - on an item off the parent
                                //with the conditional statements on it, and child items (great granschild) below that
                                let gcRootItem     //the item in the QR that any conditional values get added
                                child.item.forEach(function (gcItem) {      //gc is grandChild...
                                    //is there data for this iyem
                                    //todo - not checking whether the item has conditions - should we?
                                    //let gcValue = form[gcItem.linkId]

                                    let arValues = hashFormValues[gcItem.linkId]

                                    if (arValues !== undefined) {

                                        //the parent (off the section) may not have been created yet
                                        if (! parentItem) {
                                            parentItem = {linkId : section.linkId,text:section.text,item: []}
                                            QR.item.push(parentItem)
                                        }

                                        if (! gcRootItem) {
                                            //the root hasn't been created
                                            gcRootItem = {linkId:child.linkId,text:child.text,item:[]}
                                            parentItem.item = parentItem.item || []
                                            parentItem.item.push(gcRootItem)
                                        }


                                        //let gcItemToInsert = {linkId:gcItem.linkId,text:gcItem.text,answer:[]}
                                        let gcItemToInsert = {linkId:gcItem.linkId,text:gcItem.text}

                                        arValues.forEach(function (v) {
                                            let result = getValue(gcItem,v)
                                            if (result) {
/*
                                                if (! gcRootItem) {
                                                    //the root hasn't been created
                                                    gcRootItem = {linkId:child.linkId,text:child.text}
                                                    parentItem.item = parentItem.item || []
                                                    parentItem.item.push(gcRootItem)
                                                }
*/

                                                gcItemToInsert.answer = gcItemToInsert.answer ||[]
                                                gcItemToInsert.answer.push(result)
                                            }

                                        })

                                        gcRootItem.item = gcRootItem.item || []
                                        gcRootItem.item.push(gcItemToInsert)


                                        //
                                    }



                                    //is the conditional met?
                                    if (false && that.checkConditional(conditionalItem,form)) {
                                        //yes! Not check all the items off this item for data
                                        if (conditionalItem.item) {
                                            let ggcRootItem     //the item in the QR that any conditional values get added
                                            conditionalItem.item.forEach(function (ggcItem) {
                                                //ggc = great grand child!

                                                let ggcValue = form[ggcItem.linkId]
                                                if (ggcValue) {
                                                    //if there's a value, then ensure that the QR structure is complete
                                                    let ggcAnswer = getValue(ggcItem,ggcValue)

                                                    if (! ggcRootItem) {
                                                        //the root hasn't been created
                                                        ggcRootItem = {linkId:conditionalItem.linkId,text:conditionalItem.text,item:[]}
                                                        itemToAdd.item = itemToAdd.item || []
                                                        itemToAdd.item.push(ggcRootItem)
                                                    }
                                                    let ggcItemToInsert = {linkId:ggcItem.linkId,text:ggcItem.text,answer:[]}
                                                    ggcItemToInsert.answer.push(ggcAnswer)
                                                    ggcRootItem.item.push(ggcItemToInsert)

                                                }

                                            })
                                        }



                                    }

                                })
                            }

                        })
                    }

                })

                return QR

                function getValue(item,value) {
                    if (value == undefined) {       //can't just use 'if value' as booleans can be false
                        return
                    }
                    let result;
                    switch (item.type) {
                        case "choice":

                            //check added Aug 2
                            if (! value) {
                                return null
                            }

                            //when a radio is used as the input, the value is a string rather than an object
                            //but when pre-popping it is just the text, so trap the error
                            if (typeof value === 'string' || value instanceof String) {
                                try {
                                    value = JSON.parse(value)
                                } catch(ex) {
                                    console.log("The value was not json")
                                }
                            }


                            if (value.valueCoding) {
                                //itemToAdd.answer.push(value)    //will be a coding
                                result = value
                            } else {
                                result = {valueCoding : value}
                                //itemToAdd.answer.push({valueCoding : value})
                            }
                            //itemToAdd.answer.push({valueCoding : value})    //will be a coding
                            //itemToAdd.answer.push(value)    //will be a coding
                            break;
                        case "decimal" :
                            let v = parseFloat(value)
                            if (v) {
                                result = {valueDecimal : v }
                                //itemToAdd.answer.push({valueDecimal : v })
                            } else {
                                alert("Item: " + item.text + " must be a number")
                            }

                            break;
                        case "boolean":
                            result = {valueBoolean : value}
                            //itemToAdd.answer.push({valueBoolean : value})    //will be a coding
                            break;

                        case "date":
                            result = {valueDate: moment(value).format("YYYY-MM-DD")}


                            break;
                        case "dateTime":

                            result = {valueDateTime: moment(value).format("YYYY-MM-DDThh:mm:ssZ")}
                            break;


                        case "reference" :
                            result = {valueReference : value}
                            //itemToAdd.answer.push({valueReference : value})
                            break

                        case "integer" :
                            result = {valueInteger : parseInt(value)}
                            break

                        default :
                            result = {valueString : value}
                        //itemToAdd.answer.push({valueString : value})
                    }

                    return result
                    //node.item = node.item || []
                    //node.item.push({answer: answer})
                    //node.item.push(itemToAdd)


                }

            },



            //return vo {template, hiddenFields, hiddenSections}
            //template is an array of section objects
            //section has rows array where a row has
            //pass in the formdata to allow initial values to be set....

            makeFormTemplate : function(Q,formData) {
                if (!Q) {
                    return
                }
                let that = this;
                let hiddenFields = {}
                let hiddenSections = []
                //let termServer = that.termServer

                //create a template suitable for rendering in up to 4 columns
                //is a collection of sections. Each section contains an array of rows,
                // each row is an array with up to 4 elements (col1-4) and the cell has an array of items

                //if the item has answerValueSet then call fillFromValueSet() to populate meta.expandedVSOptions

                let template = []

                if (Q.item) {
                    Q.item.forEach(function (sectionItem) {
                        let section = {linkId:sectionItem.linkId,text:sectionItem.text,rows:[],item:sectionItem}
                        section.meta = that.getMetaInfoForItem(sectionItem)
                        if (section.meta.hidden) {
                            hiddenSections.push(section)
                        }
                        template.push(section)

                        //now look at the items below the section level.
                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (item) {
                                let meta = that.getMetaInfoForItem(item)
                                if (meta.hidden) {
                                    hiddenFields[sectionItem.linkId] = hiddenFields[sectionItem.linkId] || []
                                    hiddenFields[sectionItem.linkId].push(item)
                                    // hiddenFields.push(item)
                                }
                                if (item.type == 'group') {
                                    //groups has a specific structure ATM
                                    //the first item goes in col 1
                                    //other items go in col 2 - and will often have conditionals on them

                                    let row = {}    //will have multiple columns

                                    row.meta = meta   //this is the meta for the group item...
                                    row.text = item.text
                                    row.group = item

                                    if (item.item) {    //these are the child items
                                        if (meta.columnCount) {
                                            //if there's a column count, then fill rows left -> right
                                            let col = 1

                                            item.item.forEach(function (child,inx) {

                                                let side = 'col' + col
                                                let cell = {item:child,meta:that.getMetaInfoForItem(child)}
                                                fillFromValueSet(cell,termServer)
                                                setDecoration(cell,child)
                                                setDefaultValue(child,formData)
                                                row[side] = row[side] || []
                                                row[side].push(cell)

                                                //dirty = true

                                                if (col % meta.columnCount == 0) {
                                                    //add the current row, and move on to the next..
                                                    section.rows.push(row)
                                                    row = {}
                                                    row.meta = meta
                                                    row.group = item        //need to group to be able to check show/hide for all rows in a group...
                                                    col = 1

                                                } else {
                                                    col++
                                                }
                                            })

                                            if (row.col1) {
                                                //why was I doing this?
                                                // section.rows.push(row)
                                            }

                                        } else {

                                            //when the columnCount is not present or 0, use the strategy first in left, others in right
                                            //this is to make it easier to have the 'control' item in the left column and the others in th eright
                                            item.item.forEach(function (child,inx) {
                                                let childMeta = that.getMetaInfoForItem(child)
                                                if (childMeta.hidden) {
                                                    hiddenFields[sectionItem.linkId] = hiddenFields[sectionItem.linkId] || []
                                                    hiddenFields[sectionItem.linkId].push(item)

                                                }
                                                //ignore any item entries on the child - we don't go any deeper atm

                                                if (inx == 0) {
                                                    //this is the first item in the group - it goes in the left
                                                    let cell = {item:child,meta:childMeta}      //to allow for ither elements like control type...
                                                    fillFromValueSet(cell,termServer)
                                                    setDecoration(cell,child)        //sets things like control type
                                                    setDefaultValue(child,formData)
                                                    //row.left = [cell]
                                                    row['col1'] = [cell]
                                                } else {
                                                    //this is a subsequent item - it will go in the right col by default
                                                    //let side = "right"
                                                    let side = 'col2'
                                                    /* for now, ignore the column number. re-visit when I think more about fill startegies...
                                                    if (childMeta.column ) {
                                                        side = 'col' + childMeta.column
                                                    }*/


                                                    let cell = {item:child,meta:childMeta}
                                                    fillFromValueSet(cell,termServer)
                                                    //,that.getMetaInfoForItem(child)
                                                    setDecoration(cell,child)
                                                    setDefaultValue(child,formData)
                                                    row[side] = row[side] || []
                                                    row[side].push(cell)
                                                }
                                            })
                                            //section.rows.push(row)   //assume that the whole group fits in a single row...
                                        }

                                    }
                                    //add the row even if there are no items in there yet
                                    section.rows.push(row)   //assume that the whole group fits in a single row...

                                } else {
                                    //2023-01-24

                                    //if the item isn't a group, then add it to column 1.
                                    let row = {}   //will have a single entry - left
                                    row.item = item
                                    row.meta = meta
                                    let cell = {item:item,meta:meta}      //to allow for ither elements like control type...
                                    fillFromValueSet(cell,termServer)
                                    setDecoration(cell,item)
                                    setDefaultValue(item,formData)
                                    //row.left = [cell]             //make it an array to match the group
                                    row['col1'] = [cell] //make it an array to match the group

                                    section.rows.push(row)


                                }

                            })
                        }

                    })
                }

                return {template:template,
                    hiddenFields:hiddenFields,
                    hiddenSections: hiddenSections
                }

                //if the element has a .initial value, then set that in the form
                function setDefaultValue(item,formData) {
                    console.log(item)
                    if (item.initial && item.initial.length > 0) {
                        //right now, only coding
                        let iCoding = item.initial[0].valueCoding
                        if (iCoding) {
                            formData[item.linkId] = {valueCoding:iCoding}
                        }


                    }

                }

                //looks for specific instructions from the Q about an item - eg render as radio
                //todo - does this overlap with the meta stuff??

                function setDecoration(cell,item) {

                    //look for item control
                    //let extControlType = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
                    let ar = that.findExtension(item,extItemControl)
                    if (ar.length > 0) {
                        let ext = ar[0].valueCodeableConcept
                        if (ext && ext.coding.length > 0) {
                            let controlHint = ext.coding[0].code
                            cell.displayHint = controlHint

                        }
                    }

                    //check required

                    cell.required = item.required


                    //look for observation extraction
                    //let extExtractObs = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
                    let arObs = that.findExtension(item,extUrlObsExtract)
                    if (arObs.length > 0) {
                        if (arObs[0].valueBoolean) {

                            cell.extractObservation = true
                        }

                    }

                }


                //if the item has answerValueSet and the rendering is dropdown or radio then fetch the values from the
                //term server and add them to the meta (so they can't update the item). They will never be saved back....
                //todo - this could be non-perormant when editing / previewing, do we care?
                //hinz todo
                // move all this to a server module
                // the server module will:
                // assume the VS Url may be versioned
                // check the local cache (for now, just use a memory object in the server - ?persist in the canshare server
                // if not present, then make a versioned call to the TS
                //save the expanded VS in the cache & return it
                // this function will populate cell.meta.expandedVSOptions



                function fillFromValueSet(cell,termServer) {
                    // console.log('fillFromVS',cell)
                    if (cell.item.answerOption) {
                        //ATM there can be both answerOption and answerValueSet as an artifact of authoring (strictly incorrect).
                        //If there is an answerOption, then use that rather than the valueSet
                        return
                    }

                    if (cell.item.answerValueSet && (cell.meta.renderVS !== 'lookup')) {
                        //if (cell.item.answerValueSet && (cell.meta.renderVS == 'radio' || cell.meta.renderVS == 'dropdown')) {
                        //We can't use the termserver $expand operation on VS created by canshare as we need to support 'uncoded'
                        //concepts - where the code is set to ‘261665006’. When there are multiple entries
                        //with the same code, only 1 of them is returned by $expand - which seems reasonable actually.
                        //so, we get the copy of the VS from the local server and just pull out the elements...

                        //note also that Ontoserver by default returns ValuSets as if _summary was set - no compose element...
                        let vsUrl = cell.item.answerValueSet
                        cell.meta.expandedVSOptions = []

                        if (vsUrl.indexOf('canshare') > -1) {

                            //this is a canshare created VS - enumerate the concepts from the local copy
                            let qry = "/ds/fhir/ValueSet?url=" + vsUrl

                            $http.get(qry).then(
                                function(data) {
                                    if (data.data && data.data.entry) {
                                        //assume only a single VS with this url. todo will need to re-visit is we want to support versions...
                                        let vs = data.data.entry[0].resource
                                        //cell.meta.expandedVSOptions = []
                                        if (vs.compose.include && vs.compose.include[0].concept) {
                                            let system =vs.compose.include[0].system
                                            vs.compose.include[0].concept.forEach(function (concept) {
                                                cell.meta.expandedVSOptions.push({system:system,code:concept.code,display:concept.display})

                                            })
                                        }
                                    }

                                }, function (err) {

                                }
                            )

                        } else {


                            //this is a VS produced by someone else - likely the spec - use $expand on the term server
                            //let vs = cell.item.answerValueSet
                            //maximum number to return is 50

                            console.log('fillFromVS',cell,vsUrl)

                            if (arExpandedVsCache[vsUrl]) {
                                //present in the cache
                                cell.meta.expandedVSOptions = arExpandedVsCache[vsUrl]
                                console.log('cache hit')
                            } else {
                                let qry =  termServer + "ValueSet/$expand?url=" + vsUrl + "&count=50"

                                $http.get(qry).then(
                                    function(data){

                                        let expandedVS = data.data
                                        arExpandedVsCache[vsUrl] = []
                                        if (expandedVS.expansion && expandedVS.expansion.contains) {
                                            expandedVS.expansion.contains.forEach(function (concept) {
                                                let coding = {system:concept.system,code:concept.code,display:concept.display}
                                                cell.meta.expandedVSOptions.push(coding)
                                                arExpandedVsCache[vsUrl].push(coding)
                                            })
                                        }
                                    },
                                    function(err){

                                        console.log(err)
                                        alert("There was an error expanding the VS with the url: "+ vsUrl + " " + angular.toJson(err.data))
                                        return [{display:"no matching values"}]
                                    }
                                )
                            }


                        }



                        /* don't delete for now...
                    let vs = cell.item.answerValueSet
                    let qry =  termServer + "ValueSet/$expand?url=" + vs

                     $http.get(qry).then(
                        function(data){

                            let vs = data.data

                            if (vs.expansion) {
                                cell.meta.expandedVSOptions = vs.expansion.contains
                            } else {
                                cell.meta.expandedVSOptions = []
                            }


                        },
                        function(err){
                            console.log(err)
                            alert("There was an error expanding the VS with the url: "+ vs + " " + angular.toJson(err.data))
                            return [{display:"no matching values"}]
                        }
                    ).finally(
                        function(){
                            $scope.showWaiting = false
                        }
                    )

                    */
                    }

                }

            },
//determine whether the condition on an item is true...
            checkConditional : function(item,formData) {

                //operates like an OR - return true if any of the conditionals match

                if (item.enableWhen && item.enableWhen.length > 0) {
                    let canShow = false     //default is to hide (ie it is an OR )

                    item.enableWhen.forEach(function(conditional){

                        let formValue = formData[conditional.question]  //the value from the form to be compared

                        if (! formValue) {
                            //if the question is from a VS rendered as a checkbox, each checkbox has the
                            //id of linkid--{n} so the value could be in any of them (but a simple lookup like this will fail).

                            let prefix = conditional.question + "--"   //any answers will start with this
                            Object.keys(formData).forEach(function (key) {
                                if (key.indexOf(prefix) > -1) {
                                    //this formData item belongs to the set of controls rendered for this question.
                                    //does the value match the answerCoding?
                                    let stringValueCoding = formData[key]
                                    if (stringValueCoding) {
                                        let ans = JSON.parse(stringValueCoding)   //It will be a string representation
                                        if (checkEqualCoding(ans.valueCoding,conditional.answerCoding)) {
                                            canShow = true
                                        }
                                    }
                                }
                            })
                        }

                        //when a radio is used as the input, the value is a string rather than an object
                        if (typeof formValue === 'string' || formValue instanceof String) {
                            formValue = JSON.parse(formValue)
                        }

                        if (formValue !== undefined && formValue !== null) {        //note that value may be boolean false...
                            //if (formValue !== null) {
                            switch(conditional.operator) {

                                case '!=' :
                                    if (conditional.answerString) {
                                        if (formValue.valueString !== conditional.answerString) {
                                            canShow = true
                                        }
                                    }

                                    if (conditional.answerCoding) {
                                        if (! checkEqualCoding(formValue.valueCoding,conditional.answerCoding)) {
                                            canShow = true
                                        }
                                    }

                                    break
                                case '=' :
                                    //all kinds of conditional support '='
                                    if (conditional.answerCoding) {
                                        if (checkEqualCoding(formValue.valueCoding,conditional.answerCoding)) {
                                            canShow = true
                                        }
                                    }

                                    if (conditional.answerString) {
                                        if (formValue.valueString == conditional.answerString) {
                                            canShow = true
                                        }
                                    }

                                    if (conditional.answerBoolean !== undefined) {

                                        if (conditional.answerBoolean) {
                                            //when the trigger value is true
                                            if (formValue) {
                                                canShow = true
                                            }
                                        } else {
                                            //when the triggervalue is false
                                            if (! formValue) {
                                                canShow = true
                                            }
                                        }

                                    }
                                    /*
                                                                    //when a radio is used as the input, the value is a string rather than an object
                                                                    if (typeof formValue === 'string' || formValue instanceof String) {
                                                                        formValue = JSON.parse(formValue)
                                                                    }
                                                                    */
                                    break
                                case ">" :
                                    //Only supported by integer

                                    if (conditional.answerInteger !== undefined) {
                                        let targetValue = parseInt(conditional.answerInteger)
                                        let value = formValue.valueInteger

                                        if (value > targetValue) {
                                            canShow = true
                                        }

                                    }
                                    break
                            }
                        }

                    })

                    return canShow

                } else {
                    return true
                }

                function checkEqualCoding(source,target) {
                    //source is from the form, target is the  Q




                    if (source && target) {
                        if (source.system) {
                            if ((source.system == target.system) && (source.code == target.code)) {
                                return true
                            }
                        } else {
                            if (source.code == target.code) {
                                return true
                            }
                        }
                    }


                }
            },
            createUUID : function() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                })
            }

        }
    })


