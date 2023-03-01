

const { default: axios } = require("axios")

async function extractResources(QR) {

    //get the Questionnaire. for now, get it derectly from the hapi server...
    let qUrl = QR.questionnaire
    if (! qUrl) {
        return makeOO("No questionnaire element in the QR")
    }

    //retrieve the Q
    let url = serverRoot + "Questionnaire?url=" + qUrl // + "&status=active"
    let response = await axios.get(url)

    let bundle = response.data
    //if (debug) {console.log('arResources',arResources)}
    if (bundle.entry && bundle.entry.length == 1) {
        //the Q was retrieved
        let Q = bundle.entry[0].resource    //todo - assume only 1

        //retrieve Observations (and potentially other resources)
        let resources = performObservationExtraction(Q,QR)

        // now create other resources (and track with provenance). The provenance was created and populated during resource extraction
        let provenance = resources.provenance

        let cp = null

        //the service request for a revire request - always added ATM as being used for forms development
        //could add other SR's as needed - or a task

        let sr = createServiceRequest(QR,globals.reviewRefer,cp,"Review request",Q)      //todo refactor names of vo returned
        //provenance.target = provenance.target || []
        //provenance.target.push({reference: "urn:uuid:"+ sr.id})
        provenance.target.push({reference: "ServiceRequest/"+ sr.id})
        resources.obs.push(sr)          //not really all obs...

        //to support more sophisticated workflow
        let task = createTask(QR,sr)
        //provenance.target.push({reference: "urn:uuid:"+ task.id})
        provenance.target.push({reference: "Task/"+ task.id})
        resources.obs.push(task)          //not really all obs...

        /* not used now, but keep...
                //generate MDM referral (servicerequest) if requested by QR
                if (resources.QRHash['mdmreferral']) {
                    let srMDM =  createServiceRequest(QR,globals.mdmrefer,cp,"MDM referral",Q)      //todo refactor names of vo returned
                    provenance.target.push({reference: "urn:uuid:"+ srMDM.id})
                    resources.obs.push(srMDM)          //not really all obs...
                }
        */


        return resources


    } else {
        return makeOO("There needs to be a single Q with the url: " + qUrl + ". " + bundle.entry.length + " were found.")
    }

}



function performObservationExtraction(Q,QR) {
    const extractDefinitionUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext"

    const extractObsUrl = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract"
    const unitsUrl = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
    let arObservations = []     //the extracted observations

    //iterate over the Q to create a hash (by linkId) of items with the Observation extraction set
    let hashQ = {}      //hash of items that have the Observation extract extension set
    let hashQR = {}     //hash of items in QR with an answer
    let hashQDefinition = {}    //hash of items that have the definition extraction set. {item: resourceType:}


    //recursive algorithm to create hash of items that are Observation extraction
    function parseQ(hashQ,item) {
        if (item.item) {
            //still need to check for definition based extraction...
            //we're assuming that the extension is on the parent - child items use 'definition' with the resource elements

            //look for definition extractions
            let ar1 = findExtension(item,extractDefinitionUrl)
            //console.log(item.linkId,item.extension,ar1.length)
            if (ar1.length > 0) {
                let resourceType = ar1[0].valueCode
                hashQDefinition[item.linkId] = {item:item,resourceType:resourceType}
            }

            item.item.forEach(function(child){
                parseQ(hashQ,child)
            })

        } else {
            //look for the extract Observation extension
            let ar = findExtension(item,extractObsUrl)
            //console.log(item.linkId)
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

    //go through the QR and generate a hash or response items keyed by linkId
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

    //the provenance resource for this action
    let provenance = {resourceType:"Provenance"}
    provenance.id = createId()  // createUUID()   //will be ignored by fhir server
    //the subject might be a reference to a contained PR resource...
    if (QR.author && QR.author.reference && QR.author.reference.substring(0,1) == '#') {
        provenance.contained = QR.contained
    }

    provenance.text= {status:"generated",div:"<div xmlns='http://www.w3.org/1999/xhtml'>Resources extracted from QR</div>"}
    provenance.recorded = new Date().toISOString()
    provenance.entity = []
    provenance.agent = []
    provenance.target = []

    //provenance.entity.push({role:"source",what:{reference:"urn:uuid:" + QR.id}})
    provenance.entity.push({role:"source",what:{reference:"QuestionnaireResponse/" + QR.id}})
    //set the agent to the author of the QR todo ?should this be to a 'Device' representing the forms receiver
    provenance.agent.push({who:QR.author})

    //now we can match the answers to the questions. Iterate over the hash from Q that has possible extracts and look for a matching QR
    if (debug) {console.log('hashQ',hashQ)}
    Object.keys(hashQ).forEach(function (key){
        let QItem = hashQ[key]  //the Q item that this QR item is an answer to
        //is there a QR item with a matching linkId?
        //console.log(key)
        if (hashQR[key]) {
            // yes there is. Create an observation for each answer.
            let QRItem = hashQR[key]    //the item from the QR
            if (QRItem.answer){
                QRItem.answer.forEach(function (theAnswer) {  //there can be multiple answers for an item
                    //theAnswer is a single answer value...
                    let observation = {resourceType: 'Observation'}

                    //the subject might be a reference to a contained PR resource...
                    if (QR.author && QR.author.reference && QR.author.reference.substring(0, 1) == '#') {
                        observation.contained = QR.contained
                    }

                    observation.id = createId() // createUUID()
                    observation.text = {status: 'generated'}
                    let text = ""
                    observation.status = "final"
                    observation.effectiveDateTime = QR.authored
                    observation.subject = QR.subject

                    observation.performer = [QR.author]
                    //the code comes from the Q
                    //The Q.code is an array of coding. Add them all to Observation.code as per the IG
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
                    //observation.derivedFrom = [{reference:"urn:uuid:" + QR.id}]
                    observation.derivedFrom = [{reference: "QuestionnaireResponse/" + QR.id}]


                    //console.log(theAnswer)
                    //todo - the dtatypes for Observation and Questionnaire aren't the same!
                    if (theAnswer.valueDecimal) {
                        //if a decimal, then look for the unit extension to create a Quantity
                        let ar = findExtension(QItem, unitsUrl)
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

                    arObservations.push(observation)
                    //provenance.target = provenance.target || []

                    //provenance.target.push({reference: "urn:uuid:"+ observation.id})
                    provenance.target.push({reference: "Observation/" + observation.id})

                })
            }
        }
    })



    //now go through and pull out any items that use definition based
    Object.keys(hashQDefinition).forEach(function (key){
        let vo = hashQDefinition[key]   //{item: resourceType:}
        let resourceType = vo.resourceType
        let item = vo.item

        if (item.item){     //assume that any contents of the resource are child elements
            let resource = {resourceType:resourceType}
            resource.id = createId()  // createUUID()
            resource.text = {div:"<div xmlns='http://www.w3.org/1999/xhtml'>Specimen from Pathology request form</div>",status:"additional"}
            resource.subject = QR.subject;      //todo - may need to figure out if the type *has* a subject
            let canBeAdded = false      //only add if there is at least one child element entry

            item.item.forEach(function (child){
                if (child.definition) {
                    let QRItem = hashQR[child.linkId]
                    if (QRItem && QRItem.answer) {
                        //there is an answer
                        canBeAdded = true
                        //assume this is a fhirpath expression - 2 level only - eg specimen.type
                        //todo - need a better algorithm here. For now, assume that any value is a top level element....
                        let ar = child.definition.split('.')
                        let elementName = ar[1]

                        //todo - support all the answer types that could be used...
                        //todo - think about multiple answers...
                        if (QRItem.answer[0].valueCoding) {
                            //assume a codeableconcept
                            resource[elementName] = {coding:[QRItem.answer[0].valueCoding]}
                        }

                    }



                }
            })
            if (canBeAdded) {
                arObservations.push(resource)
                provenance.target = provenance.target || []
                //provenance.target.push({reference: "urn:uuid:"+ resource.id})
                provenance.target.push({reference: resource.resourceType +  "/"+ resource.id})
            }

        }

    })

    arObservations.push(provenance)

    return {'obs':arObservations,provenance:provenance,QHash:hashQ,QRHash:hashQR};

}

module.exports = {
    extractResources : extractResources
};