let serverBase = process.env.SERVERBASE

const { default: axios } = require("axios")
const utilModule = require("./serverModuleUtil");

let debug = false


//extract resources from the QR. Returns an array of resources
async function extractResources(QR,SR, Q) {

    //If a Q was passed in, we can progress immediately to resource extraction and creation. This happens with the Q designer
    if (Q) {
        return performExtraction(QR,SR, Q)
    }

    //Otherwise, we need to retrieve the Q from the forms server. This is the usual pattern
    let qUrl = QR.questionnaire
    if (! qUrl) {
        throw("No questionnaire element in the QR")
    }

    //retrieve the Q. For now, the single hapi server is acting as the forms server
    let url = serverBase + "Questionnaire?url=" + qUrl // + "&status=active"
    let response = await axios.get(url)

    let bundle = response.data
    if (bundle.entry && bundle.entry.length == 1) {
        //the Q was retrieved
        let Q = bundle.entry[0].resource    //todo - assume only 1
        return performExtraction(QR,SR, Q)

    } else {
        let numQ = 0
        if (bundle.entry) {
            numQ = bundle.entry.length
        }
        //console.log(`${numQ} Q with url ${qUrl} found`)

        throw "There needs to be a single Q with the url: " + qUrl + ". " +numQ + " were found."
        //return utilModule.makeOO(["There needs to be a single Q with the url: " + qUrl + ". " + bundle.entry.length + " were found."])
    }

    //perform the extraction and add a provenance and device resource
    function performExtraction(QR,SR, Q) {
        //perform the actual extraction and resource creation

        //retrieve Observations (and potentially other resources)
        let arExtractedResources = performResourceExtraction(Q,QR)

        //the device represents this app - it is going to be the agent that pefroms the extraction
        let device = {resourceType:"Device",identifier:[{system:'http://canshare.co.nz/ns',value:"requesterOp"}]}
        device.deviceName = [{name:"Resource extractor",type:"other"}]
        device.id = utilModule.createUUID()


        // a provenance is only created if resources are extracted - ie arExtractedResources.length > 0
        let provenance = addProvenance(QR,arExtractedResources,device)
        console.log('provenance',provenance)


        //add the device to the list of extracted resources after the provenance is added so there isn't a target reference to it....
        //add an entity reference from Provenance to the SR. a provenance was only created if resources are extracted
        if (provenance) {
            provenance.entity.push({role:"source",what:{reference:`urn:uuid:${SR.id}`}})
            arExtractedResources.push(device)
        }

        return arExtractedResources

    }


}

//create a provenance resource that identifies the QR from which the resources were created.
function addProvenance(QR,lst,device) {
    if (lst.length > 0) {

        let provenance = {resourceType:"Provenance"}
        provenance.id =  createUUID()


        provenance.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Resources extracted from QR</div>"}
        provenance.recorded = new Date().toISOString()
        provenance.entity = []
        provenance.agent = []
        provenance.target = []

        provenance.entity.push({role:"source",what:{reference:"urn:uuid:" + QR.id}})
        provenance.agent.push({who:{reference: "urn:uuid:" +device.id}})

        lst.forEach(function (resource) {
            provenance.target.push({reference:  `urn:uuid:${resource.id}`})
        })

        lst.push(provenance)

        return provenance

    }

    function capitalizeDEP(s) {
        return s[0].toUpperCase() + s.substring(1)
    }

}


//Extract observations and other resources from the QR.
function performResourceExtraction(Q,QR) {
    const extractDefinitionUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext"
    const extractObsUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
    const unitsUrl = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
    let arExtractedResources = []     //the extracted observations

    //iterate over the Q to create a hash (by linkId) of items with the Observation extraction set
    let hashQ = {}      //hash of items that have the Observation extract extension set
    let hashQR = {}     //hash of items in QR with an answer
    let hashQDefinition = {}    //hash of items that have the definition extraction set. {item: resourceType:}
    let hashQItem = {}          //hash or all items in the Q by linkId


    //recursive algorithm to create hash of items that are Observation extraction
    function parseQ(hashQ,item) {
        hashQItem[item.linkId] = item
        if (item.item) {
            //Observation extraction will not be applied to group type items (ie those that contain other items)
            //still need to check for definition based extraction...
            //we're assuming that the extension is on the parent - child items use 'definition' with the resource elements

            //look for definition extractions. These should only be on group level elements
            let ar1 = utilModule.findExtension(item,extractDefinitionUrl)

            if (ar1.length > 0) {
                let resourceType = ar1[0].valueCode
                hashQDefinition[item.linkId] = {item:item,resourceType:resourceType}
                console.log(`definition extraction found - ${item.linkId} - ${resourceType}`)
            }

            //recurse through the child items
            item.item.forEach(function(child){
                parseQ(hashQ,child)
            })

        } else {
            //this is a leaf item so can have the Observation extraction set

            let ar = utilModule.findExtension(item,extractObsUrl)

            if (ar.length > 0) {
                //in this case the extension is a boolean. Assume only 1
                if (ar[0].valueBoolean) {
                    //todo - ?need to check that there is a code
                    hashQ[item.linkId] = item
                }
            }

        }
    }

    if (Q.item) {
        //should never be missing the top level item array...
        Q.item.forEach(function(topLevel){
            parseQ(hashQ,topLevel)
        })
    }

    //go through the QR and generate a hash of answers keyed by linkId
    function parseQR(hashQR,item) {
        if (item.item) {
            item.item.forEach(function(child){
                parseQR(hashQR,child)
            })

        } else {
            //It's assumed that there is only an item if it has a value
            hashQR[item.linkId] = item
        }
    }

    if (QR.item) {
        QR.item.forEach(function(topLevel){
            parseQR(hashQR,topLevel)
        })
    }


    //now we can match the answers to the questions. Iterate over the hash from Q that has possible extracts and look for a matching QR
    //if (debug) {console.log('hashQ',hashQ)}

    //iterate over the items from the Q that can have an observation extraction...
    Object.keys(hashQ).forEach(function (key){      //hashQ is the hash of items in the Q that have the extract observation extension set
        let QItem = hashQ[key]  //the Q item that this QR item is an answer to

        //is there a QR item with a matching linkId?
        if (hashQR[key]) {
            // yes there is. Create an observation for each answer. (In theory there can be multiple answers)
            let QRItem = hashQR[key]    //the item from the QR
            if (QRItem.answer){
                QRItem.answer.forEach(function (theAnswer) {  //there can be multiple answers for an item
                    //theAnswer is a single answer value...
                    let observation = {resourceType: 'Observation'}

                    observation.id = utilModule.createUUID()
                    observation.text = {status: 'generated'}

                    observation.status = "final"
                    observation.effectiveDateTime = QR.authored
                    observation.subject = QR.subject
                    if (QR.author) {
                        observation.performer = [QR.author]
                    }

                    //the code comes from the Q
                    //The Q.code is an array of coding. Add them all to Observation.code as per the IG
                    let text = ""
                    let oCode = {coding: []}
                    if (QItem.code) {
                        QItem.code.forEach(function (coding) {
                            oCode.coding.push(coding)
                            if (oCode.display) {
                                text += oCode.display + ": "
                            }

                        })
                    }

                    observation.code = oCode
                    observation.derivedFrom = [{reference:"urn:uuid:" + QR.id}]
                    //observation.derivedFrom = [{reference: "QuestionnaireResponse/" + QR.id}]



                    //todo - the dtatypes for Observation and Questionnaire aren't the same!


                    if (theAnswer.valueDecimal) {
                        //if a decimal, then look for the unit extension to create a Quantity
                        let ar = utilModule.findExtension(QItem, unitsUrl)
                        if (ar.length > 0) {
                            let coding = ar[0].valueCoding
                            //Can create a Quantity. should only be 1 really...
                            let qty = {value: theAnswer.valueDecimal, system: coding.system, code: coding.code}
                            observation.valueQuantity = qty
                            text += theAnswer.valueDecimal + " " + coding.display
                        } else {
                            //not sure what to do if there's no extension. Is that a QA that should be applied to the Q? ie that decimal must have the extension?
                        }
                    }

                    if (theAnswer.valueString) {
                        observation.valueString = theAnswer.valueString
                        text += theAnswer.valueString
                    }

                    if (theAnswer.valueCoding) {
                        observation.valueCodeableConcept = {coding: [theAnswer.valueCoding]}
                        text += theAnswer.valueCoding.code + " (" + theAnswer.valueCoding.system + ")"
                    }

                    observation.text.div = "<div xmlns='http://www.w3.org/1999/xhtml'>" + text + "</div>"

                    arExtractedResources.push(observation)

                })
            }
        }
    })


    //now go through and pull out any items that use definition based - eg Procedures or Condition
    //hashQDefinition is from the Q - it contains all elmments that might be extracted to a resource
    //note that this routine is not generic - it specifically looks for Procedure and Condition resources.

    Object.keys(hashQDefinition).forEach(function (key){


        let vo = hashQDefinition[key]   //{item: resourceType:}  //this should always refer to a group...
        let resourceType = vo.resourceType
        let groupItem = vo.item   //this is the group item (from the Q) - assuming the Q is correct of course

        console.log(`looking for ${resourceType}`)

        //let groupItemFromQ = hashQItem[groupItem.linkId]     //this is the corresponding group item from the Q. It may have the .code...


        if (groupItem.item){     //assume that any contents of the resource are representes as child elements in the Q / QR
            let resource = {resourceType:resourceType}
            resource.id =  createUUID()
            resource.subject = QR.subject;      //todo - may need to figure out if the type *has* a subject

            //if there is a .code on the group item from the Q, then add it to the resource
            //this is the pattern where the group has the code, and a child element for the status
            if (groupItem.code) {
                resource.code = {coding:[groupItem.code[0]]}       //note it's a codeable concept
            }

            /*
            if (groupItemFromQ && groupItemFromQ.code) {
                resource.code = {coding:[groupItemFromQ.code[0]]}       //note it's a codeable concept
            }
            */

            let canBeAdded = false      //only add if there is at least one child element entry in the QR

            //each child element has the content of a resource element (defined by the 'definition' element in the item)
            //NOTE: Right now this is optimized for Procedure extraction (Condition planned) in our implementation. May not work well for other types.
            //And remember we're iterating over the Q
            groupItem.item.forEach(function (child){     //get all the resource elements
                if (child.definition) {             //... but only if the item has a definition element

                    let QRItem = hashQR[child.linkId]       //the actual QR item containing the answer
                    if (QRItem && QRItem.answer && QRItem.answer.length > 0)  {
                        //there is an answer
                        canBeAdded = true       //we do overrite this later on - checking for status
                        //assume this is a fhirpath expression - 2 level only - eg http://hl7.org/fhir/specimen.type
                        //todo - need a better and more robust algorithm here. For now, assume that any value is a top level element....

                        //path/definition will be something like http://hl7.org/fhir/Procedure#Procedure.status

                        let ar1 = child.definition.split("#")
                        let path = ar1[1]       //ep Procedure.code
                        console.log(`${resourceType}: path: ${path}`)

                        let ar = path.split('.')
                        //assume that the element is a 'top level' - ie off the root
                        let elementName = ar[1]     //remove the resource type - eg Procedure.code becomes just code.

                        //console.log(`element name: ${elementName}`)
                        //todo - support all the answer types that could be used...
                        //todo - think about multiple answers...

                        //processing is resource type specific ATM todo - tidy all this code up when it meets current requirements
                        if (resourceType == 'Procedure') {


                            switch (elementName) {
                                case 'status' :
                                    //there are a couple of patterns for status. It can be true or false for done/note done or the actual status as a Coding
                                    if (QRItem.answer[0].valueBoolean !== undefined) {  //there is a value...
                                        let value = QRItem.answer[0].valueBoolean //this will be the actual value - true or false
                                        //in this implementation a boolean true for procedure means completed, false means not-done
                                        //todo - unsure if we should be creating these at all when false
                                        resource.status = value ? "completed" : "not-done"
                                    }

                                    if (QRItem.answer[0].valueCoding !== undefined) {  //whether the procedire was performed or not is specified by coding
                                        //the value of the status is the code value of the coding
                                        resource.status = QRItem.answer[0].valueCoding.code
                                    }
                                    break
                                case 'bodySite' :
                                    if (QRItem.answer[0].valueCoding) {
                                        resource[elementName] = [{coding:[QRItem.answer[0].valueCoding]}]
                                    }
                                    break
                                default:
                                    //any element that has a valueCoding just gets that value added. Status may override this value
                                    if (QRItem.answer[0].valueCoding) {
                                        //if there's a Coding as the answer, assign it to the path (generally the code)
                                        resource[elementName] = {coding:[QRItem.answer[0].valueCoding]}
                                    }
                                    break
                            }

                            /*
                            if (elementName == 'status') {
                                //there are a couple of patterns for status. It can be true or false for done/note done or the actual status as a Coding
                                if (QRItem.answer[0].valueBoolean !== undefined) {  //there is a value...
                                    let value = QRItem.answer[0].valueBoolean //this will be the actual value - true or false
                                    //in this implementation a boolean true for procedure means completed, false means not-done
                                    //todo - unsure if we should be creating these at all when false
                                    resource.status = value ? "completed" : "not-done"
                                }

                                if (QRItem.answer[0].valueCoding !== undefined) {  //whether the procedire was performed or not is specified by coding
                                    //the value of the status is the code value of the coding
                                    resource.status = QRItem.answer[0].valueCoding.code
                                }
                            } else {
                                //any element that has a valueCoding just gets that value added. Status may override this value
                                if (QRItem.answer[0].valueCoding) {
                                    //if there's a Coding as the answer, assign it to the path (generally the code)
                                    resource[elementName] = {coding:[QRItem.answer[0].valueCoding]}
                                }
                            }
                            */

                        }

                        if (resourceType == 'Condition') {

                            if (elementName == 'verificationStatus') {

                                //there are a couple of patterns for verificationstatus. It can be true or false for done/note done or the actual status as a Coding
                                if (QRItem.answer[0].valueBoolean !== undefined) {  //there is a value in the boolean...
                                    let value = QRItem.answer[0].valueBoolean //this will be the actual value - true or false
                                    //in this implementation a boolean true for procedure means completed, false means not-done
                                    //todo - unsure if we should be creating these at all when false
                                    if (value) {
                                        //boolean is true - set verificationStatus to 'confirmed'
                                        resource.verificationStatus = {coding:[{system:'http://terminology.hl7.org/CodeSystem/condition-ver-status',code:'confirmed'}]}
                                    } else {
                                        resource.verificationStatus = {coding:[{system:'http://terminology.hl7.org/CodeSystem/condition-ver-status',code:'unconfirmed'}]}
                                    }
                                }



                                if (QRItem.answer[0].valueCoding !== undefined) {  //whether the condition was present or not is specified by coding
                                    //the value of the status is the code value of the coding
                                    resource.verificationStatus = {coding:[QRItem.answer[0].valueCoding]}
                                }
                            } else {
                                //any element that has a valueCoding just gets that value added as a CC. Status may override this value
                                if (QRItem.answer[0].valueCoding) {
                                    //if there's a Coding as the answer, assign it to the path (generally the code)
                                    resource[elementName] = {coding:[QRItem.answer[0].valueCoding]}
                                }
                            }

                        }

                    }

                }
            })

            //at this point the resource (Procedure or Condition) has been created from the data in the QR - the individual elements coming from child QR items
            //now try to create a meaningful text
            if (resource['code']) {
                //in theory, procedures and conditions should always have a code
                let ccCode = resource['code']
                if (ccCode.coding) {
                    let coding = ccCode.coding[0]
                    let text = coding.display || coding.code
                    resource.text = {div:`<div xmlns='http://www.w3.org/1999/xhtml'>${text}</div>`,status:"additional"}
                } else {
                    resource.text = {div:"<div xmlns='http://www.w3.org/1999/xhtml'>Extracted resource - no Coding in .code</div>",status:"additional"}
                }
            } else {
                resource.text = {div:"<div xmlns='http://www.w3.org/1999/xhtml'>Extracted resource - no Code</div>",status:"additional"}
            }

            //we'll check the resource status to see if this resource can be added.
            // todo right now this is hard coded and ugly, but we'll look to refine and potentially support an 'always extract' extension
            canBeAdded = false
            if (resource.code && resource.status == 'completed' ||
                (resource.verificationStatus && resource.verificationStatus.coding && resource.verificationStatus.coding[0].code == 'confirmed')) {
                canBeAdded = true
            }

            if (canBeAdded) {
                arExtractedResources.push(resource)

            }
        }
    })



    return arExtractedResources //{'obs':arExtractedResources,provenance:provenance,QHash:hashQ,QRHash:hashQR};

}

function createIdDEP() {
    let id = 'id-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000)
    return id
}


function createUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


module.exports = {
    extractResources : extractResources
};