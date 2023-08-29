angular.module("pocApp")

    .service('modelsDemoSvc', function() {

            return {

                getDemo: function () {

                    //construct a graph of the Logical model types.
                    //Not sure if this belongs in here, but it will do for the moment.
                    //We have compositions, DataGroups & Items  Not clear what the difference between a comp and a dg is
                    //not now - A compositions can 'descend' from others and reference datagroups and coomposotions

                    //default multiplicity to single optional unless otherwise stated
                    //if an object has something of the name name as a parent or reference it is overwritten - eg ValueSet

                    let hashCompositions = {}
                    let hashDataGroups = {}
                    let hashVS = {}         //VS by name (not url)

                    //---------- DataGroups

                    //testing parent
                    let dgParent = {kind:"dg",name:'a-Parent',title:"Parent DG",diff:[],
                        description:"Host for testing inheritance"}
                    dgParent.diff.push({path:'item1',title:'Item1',type:['CodeableConcept'],
                        description:"item1"})
                    dgParent.diff.push({path:'item2',title:'Item2',type:['CodeableConcept'],
                        description:"item2"})
                    hashDataGroups[dgParent.name] = dgParent

                    let dgChild = {kind:"dg",name:'a-Child',parent:"a-Parent",title:"Child DG",diff:[],
                        description:"Host for testing inheritance"}
                    dgChild.diff.push({path:'item3',title:'Item3',type:['CodeableConcept'],
                        description:"item3"})
                    dgChild.diff.push({path:'item4',title:'Item4',type:['CodeableConcept'],
                        description:"item4"})

                    //override an element
                    dgChild.diff.push({path:'item2',title:'Item2 override',type:['CodeableConcept'],
                        description:"item2 ov",mult:'0..1',fixedCoding:{code:'aaa'}})

                    hashDataGroups[dgChild.name] = dgChild


                    let dgGrandChild = {kind:"dg",name:'a-GrandChild',parent:"a-Child",title:"GrandChild DG",diff:[],
                        description:"Host for testing inheritance"}

                    dgGrandChild.diff.push({path:'item5',title:'Item5',type:['string'],
                        description:"item5",mult:'0..1'})

                    hashDataGroups[dgGrandChild.name] = dgGrandChild
                    
                    //ancillary studies
                    let dgAncillary = {kind:"dg",name:'AncillaryStudy',title:"Ancillary Study",diff:[],mcodegroup:'disease',
                        description:"Diagnostic or therapeutic procedure which is supplementary to the main test or treatment."}

                    dgAncillary.diff.push({path:'type',title:'Type of study',type:['CodeableConcept'],
                        valueSet : "http://canshare.co.nz/ValueSet/ancillary-type",
                        description:"The type of ancillary test"})

                    let ancMethod = {path:'method',title:'Method used',type:['CodeableConcept'],
                        description:"The method of how the ancillary study was performed"}

                    ancMethod.dependVS = []
                    ancMethod.dependVS.push({source:'type',value:{code:'HER2'},
                        url:"https://canshare.co.nz/fhir/ValueSet/ancillary-method-HER2"})
                    ancMethod.dependVS.push({source:'type',value:{code:'PT'},
                        url:"https://canshare.co.nz/fhir/ValueSet/ancillary-method-PT"})

                    dgAncillary.diff.push(ancMethod)

                    dgAncillary.diff.push({path:'result',title:'Result',type:['CodeableConcept'],
                        description:"The coded result of the ancillary study performed"})

                    //dependencies


                    hashDataGroups[dgAncillary.name] = dgAncillary


                    //DG staging component
                    let dgComponent = {kind:"dg",name:'Component',title:"Component",diff:[]}
                    dgComponent.diff.push({path:'status',title:'Status',type:['CodeableConcept'],mult:'1..1'})
                    dgComponent.diff.push({path:'category',title:'Category',type:['CodeableConcept'],mult:'0..1'})
                    dgComponent.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:'1..1'})
                    dgComponent.diff.push({path:'date',title:'Date',type:['dateTime'],mult:'0..1'})
                    dgComponent.diff.push({path:'performer',title:'Performer',type:['HcProvider'],mult:'0..1'})
                    dgComponent.diff.push({path:'valueInteger',title:'Integer value',type:['integer'],mult:'0..1'})
                    dgComponent.diff.push({path:'valueQuantity',title:'Quantity value',type:['Quantity'],mult:'0..1'})
                    dgComponent.diff.push({path:'valueCoded',title:'Coded value',type:['CodeableConcept'],mult:'0..1'})
                    dgComponent.diff.push({path:'valueString',title:'String value',type:['string'],mult:'0..1'})
                    dgComponent.diff.push({path:'interpretation',title:'Interpretation',type:['CodeableConcept'],mult:'0..1'})


                    hashDataGroups[dgComponent.name] = dgComponent

                    //DG staging
                    let dgStaging = {kind:"dg",name:'Staging',title:"Staging",diff:[],
                        description:"Staging information used to describe the prognosis of the specific disease at a given time in the patient's cancer journey."}
                    dgStaging.diff.push({path:'system',title:'System',type:['CodeableConcept'],mult:'0..1'})
                    dgStaging.diff.push({path:'date',title:'Date',type:['date'],mult:'0..1'})
                    dgStaging.diff.push({path:'timing',title:'Timing',type:['CodeableConcept'],mult:'0..1'})
                    dgStaging.diff.push({path:'component',title:'Component',type:['Component'],mult:'0..*'})
                    dgStaging.diff.push({path:'stage',title:'Stage',type:['CodeableConcept'],mult:'0..1'})
                    dgStaging.diff.push({path:'additionalDetails',title:'Additional details',type:['string'],mult:'0..1'})
                    hashDataGroups[dgStaging.name] = dgStaging

                    //DG grading
                    let dgGrading = {kind:"dg",name:'Grading',title:"Grading",diff:[],
                        description:"The degree of differentiation of a tumour, e.g. the extent to which a tumour resembles the normal tissue at that site (also known as histological grade)"}
                    dgGrading.diff.push({path:'system',title:'System',type:['CodeableConcept'],mult:'0..1'})
                    dgGrading.diff.push({path:'date',title:'Date',type:['date'],mult:'0..1'})
                    dgGrading.diff.push({path:'component',title:'Component',type:['Component'],mult:'0..*'})
                    dgGrading.diff.push({path:'grade',title:'Grade',type:['CodeableConcept'],mult:'0..1'})
                    dgGrading.diff.push({path:'additionalDetails',title:'Additional details',type:['string'],mult:'0..1'})
                    hashDataGroups[dgGrading.name] = dgGrading

                    //DG Blood pressure - just an example
                    let dgBP = {kind:"dg",name:'Bloodpressure',title:"Blood pressure",diff:[]}
                    dgBP.diff.push({path:'systolic',title:'Systolic pressure',type:['Component'],mult:'1..1'})
                    dgBP.diff.push({path:'diastolic',title:'Diastolic pressure',type:['Component'],mult:'1..1'})
                    hashDataGroups[dgBP.name] = dgBP


                    //DG prognostic scoring
                    let dgPrognosticScore = {kind:"dg",name:'PrognosticScore',title:"Prognostic score",diff:[]}
                    dgPrognosticScore.diff.push({path:'system',title:'System',type:['CodeableConcept'],mult:'0..1',
                        description:"The system used to score the disease's prognosis."})
                    dgPrognosticScore.diff.push({path:'date',title:'Date',type:['date'],mult:'0..1',
                        description:"The date on which the prognostic score was assigned"})
                    dgPrognosticScore.diff.push({path:'component',title:'Component',type:['Component'],mult:'0..*'})
                    dgPrognosticScore.diff.push({path:'score',title:'Score',type:['CodeableConcept'],mult:'0..*'})

                    dgPrognosticScore.diff.push({path:'additionalDetails',title:'Additional details',type:['string'],mult:'0..1'})

                    hashDataGroups[dgPrognosticScore.name] = dgPrognosticScore

                    //DG assessment
                    let dgAssess = {kind:"dg",name:'Assessment',title:"Assessment",diff:[]}
                    dgAssess.diff.push({path:'behaviour',title:'Behaviour',type:['CodeableConcept'],mult:'0..1'})
                    dgAssess.diff.push({path:'primaryBodysite',title:'Primary bodysite',type:['BodySite'],mult:'0..1'})
                    dgAssess.diff.push({path:'secondaryBodysite',title:'Secondary bodysite',type:['BodySite'],mult:'0..1'})
                    dgAssess.diff.push({path:'morphology',title:'Morphology',type:['CodeableConcept'],mult:'0..1'})
                    dgAssess.diff.push({path:'gradingSystem',title:'Grading system',type:['CodeableConcept'],mult:'0..1'})
                    dgAssess.diff.push({path:'grade',title:'Grade',type:['CodeableConcept'],mult:'0..1'})
                    dgAssess.diff.push({path:'stageSystem',title:'Stage system',type:['CodeableConcept'],mult:'0..1'})
                    dgAssess.diff.push({path:'stage',title:'Stage',type:['CodeableConcept'],mult:'0..1'})
                    dgAssess.diff.push({path:'prognosticSystem',title:'Prognostic system',type:['CodeableConcept'],mult:'0..1'})
                    dgAssess.diff.push({path:'prognosis',title:'Prognosis',type:['CodeableConcept'],mult:'0..1'})
                    hashDataGroups[dgAssess.name] = dgAssess

                    //DataGroup bodysite
                    let dgBodySite = {kind:"dg",name:'BodySite',title:"Body site",diff:[],mcodegroup:"outcome",
                        fhirResource:"BodyStructure",
                        description:"The details about an anatomical location or body part "}
                    dgBodySite.diff.push({path:'structure',title:"Structure",type:['CodeableConcept'],code:[{code:'code1'}],
                        valueSet:"https://bodysite/alloptions",
                        description:"The anatomical structure being described"}) //will be overwritten
                    dgBodySite.diff.push({path:'laterality',title:'Laterality',type:['CodeableConcept'],mult:'0..1',
                        valueSet : 'canshare-laterality',
                        description:'The laterality of a paired organ',valueSet:"canshare-laterality"})
                    dgBodySite.diff.push({path:'landmark',title:'Landmark',type:['CodeableConcept'],mult:'0..1',
                        description:'A significant landmark near the body site, e.g. nipple'})
                    dgBodySite.diff.push({path:'clockface',title:'Clockface',type:['CodeableConcept'],mult:'0..1',
                        description:'Clockface orientation from the landmark'})
                    dgBodySite.diff.push({path:'distance',title:'Distance',type:['Quantity'],mult:'0..1',
                        description:'The distance from the given landmark'})
                    dgBodySite.diff.push({path:'description',title:'Description',type:['string'],mult:'0..1',
                        description:'Text description of the body site'})



                    hashDataGroups[dgBodySite.name] = dgBodySite

                    //Cancer assessment
                    let dgCancerAssessment = {kind:"dg",name:'CancerAssessment',title:"Cancer assessment",diff:[],
                        mcodegroup : "disease",
                        description:"A description of the current status of the cancer at a given point in time."}

                    dgCancerAssessment.diff.push({path:'behaviour',title:'Behaviour',type:['CodeableConcept'],mult:'0..1',
                        description:'An evaluation of the behaviour of the cancer, as best understood with the given information. This may be an initial clinical impression, through to a confirmed histological analysis - e,g, Normal, benign, malignant, indeterminate etc'})

                    // >>> todo add lesion

                    dgCancerAssessment.diff.push({path:'primaryLocation',title:'Primary location',type:['BodySite'],mult:'0..1',
                        description:'The location in the body where the cancer originated.'})

                    dgCancerAssessment.diff.push({path:'adjacentOrganInvolvementStatus',title:'Adjacent organ involvement status',type:['CodeableConcept'],mult:'0..1',
                        description:'status of involvement of adjacent organs'})

                    dgCancerAssessment.diff.push({path:'adjacentOrganInvaded',title:'Adjacent organ invaded',type:['CodeableConcept'],mult:'0..*',
                        description:'The adjacent organs into which the tumour has invaded.'})

                    dgCancerAssessment.diff.push({path:'regionalLocation',title:'Regional location',type:['BodySite'],mult:'0..*',
                        description:'The regional location(s) in the body to which the primary cancer has spread.'})

                    dgCancerAssessment.diff.push({path:'distantMetastatisLocation',title:'Distant metastatis location',type:['BodySite'],mult:'0..*',
                        description:'The distant location(s) in the body to which the primary cancer has spread.'})

                    dgCancerAssessment.diff.push({path:'histologicType',title:'Histologic type',type:['Observation'],mult:'0..1',
                        description:'The histologic type of the cancer'})

                    dgCancerAssessment.diff.push({path:'coexistingPathology',title:'CoexistingPathology',type:['Observation'],mult:'0..1',
                        description:'Other microscopically identifiable abnormalities relevant to the diagnosis.'})

                    dgCancerAssessment.diff.push({path:'grading',title:'Grading',type:['Grading'],mult:'0..*',
                        description:'The degree of differentiation of a tumour eg the extent to which a tumour resembles the normal tissue at that site'})

                    dgCancerAssessment.diff.push({path:'staging',title:'Staging',type:['Staging'],mult:'0..*',
                        description:'A categorisation of the cancer to determine the prognosis.'})

                    dgCancerAssessment.diff.push({path:'prognosticScoring',title:'Prognostic scoring',type:['PrognosticScore'],mult:'0..*',
                        description:'The prognostic score of the patient\'s cancer diagnosis, based on a relevant prognostic scoring system'})

                    dgCancerAssessment.diff.push({path:'prognosticFactor',title:'Prognostic factor',type:['Observation'],mult:'0..*',
                        description:'Other prognostic factors that aren\'t recorded as part of the grading, staging or prognostic scoring components.'})

                    dgCancerAssessment.diff.push({path:'additionalDetails',title:'Additional details',type:['string'],mult:'0..1',
                        description:'Additional details about this cancer assessment.'})

                    hashDataGroups[dgCancerAssessment.name] = dgCancerAssessment



                    //------

/*
                    dgCancerAssessment.diff.push({path:'pathwayType',title:'Pathway type',type:['CodeableConcept'],mult:'0..1',
                        description:'The type of the cancer pathway (e.g. screening, diagnostic, surveillance)'})
                    dgCancerAssessment.diff.push({path:'assessedBy',title:'Assessed by',type:['HcProvider'],mult:'0..1',
                        description:'The healthcare practitioner that performed this cancer assessment.'})

                    dgCancerAssessment.diff.push({path:'primaryOrRecurrence',title:'Primary cancer or recurrance',type:['CodeableConcept'],mult:'0..1',
                        description:'An indication of where the cancer is in the lifecycle - e.g. new primary cancer or recurrence'})

                    dgCancerAssessment.diff.push({path:'recurranceType',title:'Recurrance type',type:['CodeableConcept'],mult:'0..1',
                        description:'The type of spread of the cancer - e.g. local, regional, distant metastasis'})
                    dgCancerAssessment.diff.push({path:'clinicalFinding',title:'Clinical Finding',type:['CodeableConcept'],mult:'0..*',
                        description:'A relevant clinical finding or symptom that may indicate the presence of cancer (e.g. lump, nipple discharge).'})
                     dgCancerAssessment.diff.push({path:'primaryType',title:'Primary type',type:['CodeableConcept'],mult:'0..1',
                        description:'The type of the primary cancer being assessed.'})


*/




                    //Care plan
                    let dgCarePlan = {kind:"dg",name:'CarePlan',title:"Care plan",diff:[],
                        description:"A plan for the delivery of care to the patient."}

                    dgCarePlan.diff.push({path:'condition',title:'Condition addressed ',
                        type:['Condition'],mult:'0..*',
                        description:'The condition which this plan addresses'})
/*
                    dgCarePlan.diff.push({path:'regimen',title:'Regimens of chemotherapy treatment',
                        type:['Regimen'],mult:'0..*',
                        description:'Individual regimen instances of treatment'})
*/
                    hashDataGroups[dgCarePlan.name] = dgCarePlan


                    //todo - do we want the concept of an 'internal' type - ie one specifically used by another
                    let dgCollectionDetails = {kind:"dg",name:'CollectionDetails',title:"Collection details",diff:[],
                        description:"Details about the collection of something. Mainly used by Specimen."}
                    dgCollectionDetails.diff.push({path:'procedure',title:'Procedure',type:['Procedure'],mult:'0..1',
                        description:"The procedure that resulted in the collection"})
                    dgCollectionDetails.diff.push({path:'collectorSpecialty',title:'Collector specialty',type:['CodeableConcept'],mult:'0..1',
                        description:'The speciality of the healthcare practitioner who collected the specimen'})
                    dgCollectionDetails.diff.push({path:'date',title:'Date and time of collection',type:['dateTime'],mult:'0..1',
                        description:'The date and/or time that the sample/specimen was collected'})
                    dgCollectionDetails.diff.push({path:'bodySite',title:'',type:['BodySite'],mult:'0..1',
                        description:'The site from which the specimen was taken'})
                    dgCollectionDetails.diff.push({path:'quantity',title:'',type:['Quantity'],mult:'0..1',
                        description:'The quantity (volume, weight or count) of the specimen collected'})
                    dgCollectionDetails.diff.push({path:'abnormalQuantity',title:'',type:['Quantity'],mult:'0..1',
                        description:'The quantity of abnormal specimens collected. For lymph node biopsies, this is the number of abnormal lymph node biopsy specimens; for punch biopsies, this is the number of cores with calcification, etc.'})



                    hashDataGroups[dgCollectionDetails.name] = dgCollectionDetails

                    //DG condition
                    let dgCondition= {kind:"dg",name:'Condition',title:"Condition",diff:[],
                        description:"A clinical condition, problem, diagnosis, or other event, situation, issue, or clinical concept that has risen to a level of concern."}
                    dgCondition.diff.push({path:'code',title:'Condition code',type:['CodeableConcept'],mult:'1..1',
                        description:"A code that identifies the condition, problem, or diagnosis."})
                    dgCondition.diff.push({path:'clinicalStatus',title:'Clinical status',type:['CodeableConcept'],mult:'0..1',
                        description:"The status of the condition in terms of its clinical progresion, i.e. active, recurrence, relapse, inactive, remission, resolved, unknown"})
                    dgCondition.diff.push({path:'verificationStatus',title:'Verification status',type:['CodeableConcept'],mult:'0..1',
                        description:"The status of the condition from a certainty perspective, i.e. unconfirmed, provisional, differential, confirmed, refuted, entered-in-error"})
                    dgCondition.diff.push({path:'otherDetails',title:'Other details',type:['string'],mult:'0..1',
                        description:"Other details about the clinical condition"})

                    dgCondition.diff.push({path:'histology',title:'Histology',type:['string'],mult:'0..1',
                        description:"The histological findings that led to this diagnosis? is dx a separate DT"})

                    hashDataGroups[dgCondition.name] = dgCondition

                    //DG Container
                    let dgContainer = {kind:"dg",name:'Container',title:"Container",diff:[],
                        description:"Details about a container used to carry something."}

                    dgContainer.diff.push({path:'type',title:'Type',type:['CodeableConcept'],mult:'0..1',
                        description:'The type of container used (e.g. slide, tube, bottle).'})
                    dgContainer.diff.push({path:'identifier',title:'Identifier',type:['Identifier'],mult:'0..1',
                        description:'An identifier for the individual specimen container.'})
                    dgContainer.diff.push({path:'specimenQuantity',title:'Number of specimens',type:['Quantity'],mult:'0..1',
                        description:'The quantity (volume, weight or count) of the specimen placed in this individual container.'})
                    dgContainer.diff.push({path:'specimenDescription',title:'Specimen description',type:['string'],mult:'0..1',
                        description:'A description of the type of specimen placed in this individual container (e.g. calcified cores)'})

                    hashDataGroups[dgContainer.name] = dgContainer

                    let dgCycle = {kind:"dg",name:'Cycle',title:"Cycle of treatment",diff:[],
                        description:"An individual period of chemotherapy treatment."}

                    dgCycle.diff.push({path:'period',title:'Period of treatment',type:['Period'],mult:"1..1",
                        description:"Period over which a cycle of treatment is administered"})

                    dgCycle.diff.push({path:'ma',title:'Medication administered',type:['MedicationAdministration'],mult:"0..*",
                        description:"Medications administered to the patient as part of this cycle"})



                    hashDataGroups[dgCycle.name] = dgCycle

                    //DG history
                    let dgHistory = {kind:"dg",name:'ClinicalHistory',title:"Clinical history",diff:[],
                        description:"A record of previous diagnoses, findings, and procedure performed that are relevant to a patient's current state of health"}
                    dgHistory.diff.push({path:'coMorbidity',title:'Co-morbidities',type:['Condition'],mult:'0..*',
                        description:"The simultaneous presence of two or more medical conditions in a patient"})
                    dgHistory.diff.push({path:'menopausalStatus',title:'Family history',type:['CodeableConcept'],mult:'0..*',
                        description:"Indicate whether the (female) patient is pre or post menopausal"})

                    dgHistory.diff.push({path:'previousFinding',title:'Previous findings',type:['CodeableConcept'],mult:'0..*',
                        description:"Previous cancer diagnoses and related clinical findings"})
                    dgHistory.diff.push({path:'previousInvestigation',title:'Previous investigations',type:['CodeableConcept'],mult:'0..*',
                        description:"Previous investigative procedures"})
                    dgHistory.diff.push({path:'neoadjuvantTreatment',title:'Neoadjuvant treatment',type:['CodeableConcept'],mult:'0..*',
                        description:"Any treatment that is given before the primary treatment for this cancer episode."})
                    hashDataGroups[dgHistory.name] = dgHistory




                    //DG familymember history
                    let dgFMH = {kind:"dg",name:'Fmh',title:"Family member history",diff:[],
                        description:"Significant health conditions for a person related to the patient relevant in the context of care for the patient"}
                    dgFMH.diff.push({path:'code',title:'Condition code',type:['CodeableConcept'],mult:'0..*',
                        description:"The conditions that the related person had"})
                    dgFMH.diff.push({path:'relation',title:'Relationship',type:['Condition'],mult:'0..*',
                        description:"The relationship to the subject"})
                    dgFMH.diff.push({path:'procedure',title:'Procedures',type:['Procedure'],mult:'0..*',
                        description:"The procedures that the related person had"})
                    hashDataGroups[dgFMH.name] = dgFMH

                    //DataGroup HcProvider
                    let dgHealthCareProvider = {kind:"dg",name:'HcProvider',title:"Healthcare practitioner",diff:[],
                        description:"The person who is directly or indirectly involved in the provising of healthcare or related services"}
                    dgHealthCareProvider.diff.push({path:'name',title:"Name",type:['HumanName'],mult:'0..1',
                        description : "The name of the healthcare practitioner"})
                    dgHealthCareProvider.diff.push({path:'hpi',title:"HPI number",type:['Identifier'],mult:'0..1',
                        description : "The identifier (eg HPI)of the healthcare practitioner"})
                    dgHealthCareProvider.diff.push({path:'contact',title:"Contact details",type :['ContactPoint'],mult:'0..1',
                        description : "The contact information of the healthcare practitioner"})

                    hashDataGroups[dgHealthCareProvider.name] = dgHealthCareProvider



                    //DataGroup HealthCareFacility
                    let dgFacility = {kind:"dg",name:'Facility',title:"Healthcare facility",diff:[],
                        description:"The details of the facility where healthcare is provided"}
                    dgFacility.diff.push({path:'name',title:"Name",type:['string'],mult:'0..1',
                        description:"The name of the healthcare facility"})

                    dgFacility.diff.push({path:'identifier',title:"Identifier (eg HPI)",type:['Identifier'],mult:'0..1',
                        description:"The identifier of the healthcare facility"})

                    dgFacility.diff.push({path:'type',title:"Type of facility",type:['CodeableConcept'],mult:'0..1',
                        description:"The kind of healthcare facility, e.g. \"general practice\""})
                    dgFacility.diff.push({path:'address',title:"Address",type:['Address'],mult:'0..1',
                        description:"The identifier of the healthcare facility"})

                    dgFacility.diff.push({path:'description',title:"Description",type:['string'],mult:'0..1',
                        description:"General description"})

                    dgFacility.diff.push({path:'contact',title:"Contacts",type:['ContactPoint'],mult:'0..*',
                        description:"eg Phone number, email, HealthLink"})


                    hashDataGroups[dgFacility.name] = dgFacility



                    //DG Image
                    let dgImage = {kind:"dg",name:'Image',title:"Image",diff:[],description:"An image of a specimen, lesion, or a radiologic image."}
                    dgImage.diff.push({path:'file',title:'File',type:['Attachment'],
                        description:"The file containing the image."})
                    dgImage.diff.push({path:'label',title:'Label',type:['string'],
                        description:"A label describing the image in the file."})
                    hashDataGroups[dgImage.name] = dgImage


                    //DG Lesion
                    let dgLesion = {kind:"dg",name:'Lesion',title:"Lesion",diff:[],
                        description:"An abnormal change and/or damage in a body structure or tissue"}
                    dgLesion.diff.push({path:'location',title:'Location',type:['BodySite'],mult:"0..1",
                        description:"The body location of the lesion"})
                    dgLesion.diff.push({path:'description',title:'Description',type:['BodySite'],mult:"0..1",
                        description:"The body location of the lesion"})
                    dgLesion.diff.push({path:'size',title:'Size',type:['Quantity'],mult:"0..1",
                        description:"The body location of the lesion"})
                    dgLesion.diff.push({path:'image',title:'Location',type:['Image'],mult:"0..*",
                        description:"The body location of the lesion"})
                    hashDataGroups[dgLesion.name] = dgLesion

                    let dgMedicationAdministration = {kind:"dg",name:'MedicationAdministration',title:"Medication administration",diff:[],
                        description:"A record of a medication being administered to a patient"}
                    dgMedicationAdministration.diff.push({path:'drug',title:'Drug',type:['CodeableConcept'],mult:"1..1",
                        description:"The drug code"})
                    dgMedicationAdministration.diff.push({path:'period',title:'Period',type:['Period'],mult:"1..1",
                        description:"The period over which the drug was admnistered"})

                    hashDataGroups[dgMedicationAdministration.name] = dgMedicationAdministration

                    //DG Observation
                    let dgObservation = {kind:"dg",name:'Observation',title:"Observation",diff:[],
                        description:"Measurements and simple assertions made about a patient, device or other subject"}
                    dgObservation.diff.push({path:'status',title:'Status',type:['code'],mult:"1..1",
                        description:"The status of the result value - i.e. registered, preliminary, final, amended"})
                    dgObservation.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"0..1",
                        description:"The type of observation what was observed"})
                    dgObservation.diff.push({path:'category',title:'Category',type:['CodeableConcept'],mult:"0..1",
                        description:"A classification of the type of observation being made"})
                    dgObservation.diff.push({path:'date',title:'Date',type:['dateTime'],mult:"0..1",
                        description:"TThe date and/or time that the observation was deemed to be taken"})
                    dgObservation.diff.push({path:'performer',title:'Performer',type:['HcProvider'],mult:"0..1",
                        description:"The healthcare practitioner who is reponsible for the observation"})
                    dgObservation.diff.push({path:'valueString',title:'Text',type:['string'],mult:"0..1",
                        description:"The plain text information determined as a result of making the observation"})
                    dgObservation.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                        description:"A reference to a code defined by a terminology system determined as a result of making the observation"})
                    dgObservation.diff.push({path:'valueQuantity',title:'Quantity value',type:['Quantity'],mult:"0..1",
                        description:"The measured or measurable amount determined as a result of making the observation"})
                    hashDataGroups[dgObservation.name] = dgObservation

                    //DataGroup for patient
                    let dgPatient = {kind:"dg",name:'Patient',title:"Patient",diff:[],description:"Name, identifiers, and demographic details about the patient"}
                    dgPatient.diff.push({path:'name',title:'Patient name',type:['HumanName'],
                        description:"Patients name - first, last alias"})
                    dgPatient.diff.push({path:'gender',title:'Gender',type:['CodeableConcept'],valueSet:"https://genderoptions",
                        description:"A classification of the person’s gender as self-identified by the person"})
                    dgPatient.diff.push({path:'sex',title:'Sex',type:['CodeableConcept'],
                        description:"A classification of the person's sex characteristics such as chromosomes, hormones and reproductive organs"})
                    dgPatient.diff.push({path:'dob',title:'Date of Birth',type:['dateTime'],
                        description:"Date of birth"})
                    dgPatient.diff.push({path:'nhi',title:'NHI number',type:['Identifier'],
                        description:"NHI number"})
                    dgPatient.diff.push({path:'address',title:'Address',type:['Address'],
                        description:"The person’s current address or location details if known (in NZ CIQ address profile format)"})
                    dgPatient.diff.push({path:'ethnicity',title:'Ethnicity',type:['CodeableConcept'],mult:"0..*",
                        valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/ethnic-group-level-4-code",
                        description:"A classification of the ethnicity of an individual person as self-identified by the person"})
                    hashDataGroups[dgPatient.name] = dgPatient


                    //DataGroup for procedure
                    let dgProcedure = {kind:"dg",name:'Procedure',title:"Procedure",diff:[],
                        description:"An action that is or was performed on or for a patient, e.g. surgical procedure, diagnostic procedure, biopsy procedure."}
                    dgProcedure.diff.push({path:'status',title:'Status',type:['code'],
                        description:"The status of the procedure, i.e. preparation, in-progress, not-done, on-hold, stopped, completed, entered-in-error, unknown"})

                    dgProcedure.diff.push({path:'code',title:'Code',type:['CodeableConcept'],
                        description:"The type of procedure, e.g. Fine needle aspiration, Axillary lymph node sampling, Axillary lymph node dissection, "})
                    dgProcedure.diff.push({path:'category',title:'Category',type:['CodeableConcept'],
                        description:"The high-level kind of procedure, e.g. surgical procedure, diagnostic procedure, education, counselling"})
                    dgProcedure.diff.push({path:'dateTime',title:'Datetime',type:['dateTime'],
                        description:"The date and/or time at which the procedure was performed"})
                    dgProcedure.diff.push({path:'performer',title:'Performer',type:['HcProvider'],
                        description:"The healthcare practitioner who performed the procedure"})
                    dgProcedure.diff.push({path:'location',title:'Location',type:['Facility'],
                        description:"The healthcare facility at which the procedure was performed."})
                    dgProcedure.diff.push({path:'indication',title:'Indication',type:['CodeableConcept'],
                        description:"The reason why the procedure was performed."})
                    dgProcedure.diff.push({path:'reason',title:'Reason',type:['CodeableConcept'],
                        description:"The justification that the procedure was performed"})
                    dgProcedure.diff.push({path:'deviceUsed',title:'Device used',type:['CodeableConcept'],
                        description:"A device used to perform the procedure"})
                    dgProcedure.diff.push({path:'additionalDetails',title:'Additional details',type:['string'],
                        description:"Additional details about the procedure"})

                    hashDataGroups[dgProcedure.name] = dgProcedure


                    //DG radiology Image
                    let dgRadImage = {kind:"dg",name:'RadiologyImage',title:"Radiology image",diff:[],
                        description:"The radiologic imaging used to examine parts of the body to aid diagnosis and guide treatment plans"}

                    dgRadImage.diff.push({path:'type',title:'Type',type:['CodeableConcept'],mult:"1..1",
                        description:"The type of radiologic imaging performed"})
                    dgRadImage.diff.push({path:'finding',title:'Findings',type:['CodeableConcept'],mult:"0..*",
                        description:"The findings as a results of radiologic imaging."})
                    dgRadImage.diff.push({path:'image',title:'Image',type:['Image'],mult:"0..*",
                        description:"The radiology image attachment."})

                    hashDataGroups[dgRadImage.name] = dgRadImage


                    //-------- regimen
                    let dgRegimen = {kind:"dg",name:'Regimen',title:"Regimen of treatment",diff:[],
                        description:"The plan for delivery of chemotherapy. "}

                    dgRegimen.diff.push({path:'status',title:'Status',type:['CodeableConcept'],mult:"1..1",
                        description:"The status of the regimen. eg In progress or completed."})

                    dgRegimen.diff.push({path:'intent',title:'Intent of treatment',type:['CodeableConcept'],mult:"1..1",
                        description:"The intent of treatment. eg curative or palliative"})

                    dgRegimen.diff.push({path:'clinical-trial',title:'Clinical trial',type:['boolean'],mult:"0..1",
                        description:"It this part of a clinical trial"})
                    dgRegimen.diff.push({path:'cycle-count',title:'',type:['integer'],mult:"0..1",
                        description:"The number of cycles in this regimen"})
                    dgRegimen.diff.push({path:'discontinued',title:'',type:['CodeableConcept'],mult:"0..1",
                        description:"Reason why the treatment was discontinued"})
                    dgRegimen.diff.push({path:'utility',title:'Overall treatment utility',type:['CodeableConcept'],mult:"0..1",
                        description:"A measure of how useful the regimen was"})
                    dgRegimen.diff.push({path:'type',title:'Regiment type',type:['CodeableConcept'],mult:"0..1",
                        description:"Identifies the regimen that was used"})

                    dgRegimen.diff.push({path:'course-number',title:'Course number type',type:['integer'],mult:"0..1",
                        description:"The course number (sequential number) for this regimen"})





                    dgRegimen.diff.push({path:'tnm',title:'TNM staging',type:['TNM'],mult:"0..1",
                        description:"A cycle of treatment."})

                    dgRegimen.diff.push({path:'cycle',title:'Cycle',type:['Cycle'],mult:"0..*",
                        description:"A cycle of treatment."})


                    hashDataGroups[dgRegimen.name] = dgRegimen

                    //DG generic specimen
                    let dgSpecimen = {kind:"dg",name:'Specimen',title:"Specimen",diff:[],description:"A sample to be used for analysis"}
                    dgSpecimen.diff.push({path:'type',title:'Specimen type',type:['CodeableConcept'],
                        description:"The type of specimen e.g. biopsy specimen, cytologic material, surgical resection specimen [surgical excision specimen], frozen section breast specimen"})
                    dgSpecimen.diff.push({path:'subtype',title:'Specimen sub-type',type:['CodeableConcept'],
                        description:"The subtype of specimen (e.g. Core biopsy specimen, Punch biopsy specimen, Lymph node cytologic material, Lymph node tissue specimen)"})

                    dgSpecimen.diff.push({path:'collection',title:'Collection info',type:['CollectionDetails'],mult:"0..1",
                        description:"Details about the collection of the specimen."})
                    dgSpecimen.diff.push({path:'container',title:'Containers ',type:['Container'],mult:"0..1",
                        description:"Containers used for this specimen."})

                    dgSpecimen.diff.push({path:'received',title:'Received datetime ',type:['dateTime'],mult:"0..1",
                        description:"The date and/or time that the specimen was received by the testing laboratory."})

                    dgSpecimen.diff.push({path:'image',title:'Collection info',type:['Attachment'],mult:"0..1",
                        description:"An image of the specimen as a labelled file."})
                    dgSpecimen.diff.push({path:'additionalDetails',title:'Additional details',type:['string'],mult:"0..1",
                        description:"Additional details about the specimen"})

                    //TNM
                    let dgTnmStaging = {kind:"dg",name:'TNM',title:"TNM staging",diff:[],
                        description:"TNM staging is used to describe the aggregate information resulting from T, N and M categories combined with any prognostic factors relevant to the specifiic disease "}

                    dgTnmStaging.diff.push({path:'timing',title:'Timing',type:['CodeableConcept'],mult:"0..1",
                        description:"The stage classification according to the point in time of the patient's care in relation to diagnosis and treatment"})
                    dgTnmStaging.diff.push(
                        {path:'tstage',title:'T stage',type:['CodeableConcept'],mult:"0..1",

                        description:"The size and/or contiguous extension of the primary tumour"}
                    )
                    dgTnmStaging.diff.push({path:'nstage',title:'N stage',type:['CodeableConcept'],mult:"0..1",
                        description:"The involvement of regional lymph ncdes as defined for each cancer site, including absence or presence of cancer, number of positive regional nodes, involvement of specific regional nodal groups, size of nodal metastasis or extension etc "})
                    dgTnmStaging.diff.push({path:'mstage',title:'M stage',type:['CodeableConcept'],mult:"0..1",
                        description:"The absence or presence of distant metastases in site and/or organs outside the local tumour area and regional nodes as defined for each cancer site"})
                    hashDataGroups[dgTnmStaging.name] = dgTnmStaging

                    //Clinical TNM
                    let dgCTnmStaging = {kind:"dg",name:'cTNM',parent:"TNM",title:"Clinical TNM staging",diff:[],
                        description:"TNM staging is used to describe the aggregate information resulting from T, N and M categories combined with any prognostic factors relevant to the specifiic disease "}
                    dgCTnmStaging.diff.push(
                        {path:'tstage',title:'cT stage',type:['CodeableConcept'],mult:"0..1",
                            code:[{code:"384625004"}],
                            description:"The size and/or contiguous extension of the primary tumour"}
                    )
                    hashDataGroups[dgCTnmStaging.name] = dgCTnmStaging

                    //dgSpecimen.diff.push({path:'collection.date',title:'When collected',type:['dateTime']})

                    //dgSpecimen.diff.push({path:'collected',title:'When collected',type:['dateTime']})
                    //dgSpecimen.diff.push({path:'bodysite',title:'Body site',type:['BodySite']})
                    hashDataGroups[dgSpecimen.name] = dgSpecimen



                    //DG specimen for frozen section
                    let dgSpecimenResection = {kind:"dg",name:'SpecimenResection',title:"Specimen from resection",parent:'Specimen',diff:[]}

                    dgSpecimenResection.diff.push({path:'om',title:'Orientation markers of tissue sample',type:['Group']})
                    dgSpecimenResection.diff.push({path:'om.technique',title:'Technique',
                        description:"Orientation marker technique used (e.g. surgical, radiological)",
                        type:['CodeableConcept']})
                    dgSpecimenResection.diff.push({path:'om.type',title:'Type',
                        description:"Orientation marker type used (e.g. suture, clip)",
                        type:['CodeableConcept']})
                    dgSpecimenResection.diff.push({path:'om.position',title:'Position',
                        description:"The position of the orientation marker (e.g. superior, inferior, medial, lateral, anterior, posterior)",
                        type:['CodeableConcept']})
                    dgSpecimenResection.diff.push({path:'om.description',title:'Description',
                        description:"Description of marker at the given position using the given technique",
                        type:['CodeableConcept']})

                    hashDataGroups[dgSpecimenResection.name] = dgSpecimenResection




                    let dgOperation = {kind:"dg",name:'Operation',title:"General operative details",diff:[],
                        description:"General details for most operations"}
                    dgOperation.diff.push({path:'date',title:'Date perfromed',type:['Period'],
                        description:"The date & time of the procedure. Start and end dates can be recorded."})
                    dgOperation.diff.push({path:'entry',title:'Surgical entry',type:['CodeableConcept'],
                        description:"The entry method for the operation"})
                    dgOperation.diff.push({path:'type',title:'Type of procedure',type:['CodeableConcept'],
                        description:"The procedure performed - eg total colectomy"})
                    dgOperation.diff.push({path:'performer-type',title:'Performer type',type:['CodeableConcept'],
                        description:"Most senior performer type"})
                    dgOperation.diff.push({path:'preparation',title:'Preparation',type:['CodeableConcept'],
                        description:"What preparation was performed (enema, oral bowel antibiotic bowel)"})

                    dgOperation.diff.push({path:'urgency',title:'Urgency of procedure',type:['Group'],
                        description:""})
                    dgOperation.diff.push({path:'urgency.code',title:'Urgency code',type:['CodeableConcept'],
                        description:""})
                    dgOperation.diff.push({path:'urgency.reason',title:'reason for this urgency',type:['CodeableConcept'],
                        description:""})
                    dgOperation.diff.push({path:'asa',title:'ASA score',type:['CodeableConcept'],
                        description:"ASA (American Society of Anaesthesiologists physical status) score"})


                    hashDataGroups[dgOperation.name] = dgOperation

                    let dgColonOperation = {kind:"dg",name:'Operation-colon',parent:"Operation",title:"Colon operative details",diff:[],
                        description:"Specific details for a Colon operation"}
                    dgColonOperation.diff.push({path:'ureter',title:'Ureter notes',type:['Group'],
                        description:""})
                    dgColonOperation.diff.push({path:'ureter.laterality',title:'Ureter notes',type:['CodeableConcept'],
                        description:"left, right, both"})
                    dgColonOperation.diff.push({path:'ureter.preserved',title:'Ureter preserved',type:['CodeableConcept'],
                        description:""})
                    dgColonOperation.diff.push({path:'ureter.stents',title:'Were stents employed',type:['CodeableConcept'],
                        description:""})

                    hashDataGroups[dgColonOperation.name] = dgColonOperation

                    //------------- ValueSets
                    let vsAllBodySite = {kind:"vs",name:'all-bodysite',title:'All body sites',url:'',concepts :[]}
                    vsAllBodySite.concepts.push({display:"Option 1"})
                    vsAllBodySite.concepts.push({display:"Option 2"})
                    vsAllBodySite.concepts.push({display:"Option 3"})
                    hashVS[vsAllBodySite.name] = vsAllBodySite

                    let vsBreastBiopsyBodySite = {kind:"vs",name:'breast-biopsy-bodysite',title:'body sites for breast biopsy',url:'',concepts :[]}
                    vsBreastBiopsyBodySite.concepts.push({display:"Option 4"})
                    vsBreastBiopsyBodySite.concepts.push({display:"Option 5"})
                    vsBreastBiopsyBodySite.concepts.push({display:"Option 6"})

                    hashVS[vsBreastBiopsyBodySite.name] = vsBreastBiopsyBodySite

                    let vsFrozenBodySite = {kind:"vs",name:'breast-frozen-bodysite',title:'body sites for frozen section',url:'',concepts :[]}
                    vsFrozenBodySite.concepts.push({display:"Option 4"})
                    vsFrozenBodySite.concepts.push({display:"Option 5"})
                    vsFrozenBodySite.concepts.push({display:"Option 6"})

                    hashVS[vsFrozenBodySite.name] = vsFrozenBodySite

                    //===================Compositions

                    //Act-now summary
                    let actNowSummary = {kind:"comp",name:'ActNow',title: "Chemotherapy report",meta:{},sections:[]}
                    actNowSummary.meta.kind = "summary"

                    let an1 = {name:"demographics",kind:'section',items:[{name:'patient',title:"Patient",type:['Patient'],mult:'1..1'}]}
                    actNowSummary.sections.push(an1)

                    let an2 = {name:"history",kind:'section',items:[{name:'history',title:"History",type:['ClinicalHistory'],mult:'0..*'}]}
                    actNowSummary.sections.push(an2)

                    let an3 = {name:"regimens",kind:'section',
                        items:[{name:'regimen',title:"Regimens",type:['Regimen'],mult:'0..*'}]}
                    actNowSummary.sections.push(an3)

                    hashCompositions[actNowSummary.name] = actNowSummary


                    //------- Base composition for Path request
                    let compPathRequest = {kind:"comp",name:'PathRequest',title: "Pathology request",meta:{},sections:[]}
                    compPathRequest.meta.category = "request"
                    compPathRequest.meta.tumourStream = "lung"
                    compPathRequest.meta.tags = ['tag1','tag2']

                    let s1 = {name:"demographics",kind:'section',items:[{name:'patient',title:"Patient",type:['Patient'],mult:'1..1'}]}
                    compPathRequest.sections.push(s1)

                    let s2 = {name:"history",kind:'section',items:[{name:'history',title:"History",type:['ClinicalHistory'],mult:'0..*'}]}
                    compPathRequest.sections.push(s2)

                    let s3 = {name:"findings",kind:'section',items:[]}
                    s3.items.push({name:'specimen',title:"Specimen",type:['Specimen'],mult:'0..*'})
                    s3.items.push({name:'assessment',title:"Assessment",type:['Assessment'],mult:'0..*'})
                    compPathRequest.sections.push(s3)

                    let s4 = {name:"investigations",kind:'section',items:[]}
                    s4.items.push({name:'image',title:"Images",type:['RadiologyImage'],mult:'0..*'})

                    let mamSlice = {name:'image',code:'xxx',title:"Mammogram"}
                    s4.items.push({name:'mammogram', slice:mamSlice,title:"Mammogram",type:['RadiologyImage'],mult:'0..1'})

                    let xraySlice = {name:'image',code:'yyy',title:"Echo"}
                    s4.items.push({name:'echo', slice:xraySlice,title:"Echo",type:['RadiologyImage'],mult:'0..1'})

                    compPathRequest.sections.push(s4)


                    hashCompositions[compPathRequest.name] = compPathRequest

                    let compPathRequestBB = {kind:"comp",
                        parent:compPathRequest.name,
                        name:'PathRequestBB',title: "Breast biopsy pathology request",sections:[]}

                    //hashCompositions[compPathRequestBB.name] = compPathRequestBB
/*

                    //--------  Composition for Breast biopsy - 'is-a' Path request
                    let compBreastBiopsy = {kind:"comp",name:'BreastBiopsy',parent:"PathRequest",title: "Breast biopsy",diff:[]}
                    //compBreastBiopsy.diff.push({path:'structure',type:['CodeableConcept'],valueSet:"http://bodysite/breastBiopsyRequestStructure"})


                    compBreastBiopsy.diff.push({path:'specimen.bodysite.structure',type:["CodeableConcept"], valueSet:"breast-biopsy-bodysite"})

                    compBreastBiopsy.diff.push({path:'addedElement',type:["string"]})
                    hashCompositions[compBreastBiopsy.name] = compBreastBiopsy

                    //--------------Composition for Breast frozen section - 'is-a' Path request
                    let compBreastFrozen = {kind:"comp",name:'BreastFrozen',parent:"PathRequest",title: "Breast frozen section",diff:[]}
                    //compBreastFrozen.diff.push({path:'structure',type:['CodeableConcept'],valueSet:"http://bodysite/breastFrozenRequestStructure"})

                    //compBreastFrozen.diff.push({path:'specimen',type:['specimen-frozen']})



                    hashCompositions[compBreastFrozen.name] = compBreastFrozen

*/
                    //sort the hashDataGroups



                    Object.keys(hashDataGroups).forEach(function (key) {
                        let dg = hashDataGroups[key]
                        dg.mult = dg.mult || '0..1'

                    })


                    return {compositions:hashCompositions,dataGroups:hashDataGroups,valueSets:hashVS}

                }


            }
        }
    )