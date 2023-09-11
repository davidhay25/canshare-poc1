//Observation children

angular.module("pocApp")

    .service('modelsObservationSvc', function() {

        return {

            getModels: function (hashDataGroups) {

                //Observation datagroup
                let dgObservation = {kind:"dg",name:'Observation',title:"Observation",diff:[],
                    ss:"https://docs.google.com/spreadsheets/d/1XU7Jc0BbC5nXgmTu-qVLS-WwJjKO9GLXgjVHVk2WRL0/edit#gid=1502765034",
                    tags:'main',
                    description:"Measurements and simple assertions made about a patient, device or other subject. Intended as abstract."}

                dgObservation.diff.push({path:'status',title:'Status',type:['code'],mult:"1..1",
                    description:"The status of the result value - i.e. registered, preliminary, final, amended"})

                dgObservation.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"0..1",
                    description:"The type of observation what was observed"})

                dgObservation.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"0..1",
                    description:"The method by which the observation was made"})


                dgObservation.diff.push({path:'dar',title:'Data absent reason',type:['CodeableConcept'],mult:"0..1",
                    description:"The reason why an observation is not available"})

                dgObservation.diff.push({path:'category',title:'Category',type:['CodeableConcept'],mult:"0..1",
                    description:"A classification of the type of observation being made"})
                dgObservation.diff.push({path:'date',title:'Date',type:['dateTime'],mult:"0..1",
                    description:"The date and/or time that the observation was deemed to be taken"})
                dgObservation.diff.push({path:'performer',title:'Performer',type:['HcProvider'],mult:"0..*",
                    description:"The healthcare practitioner who is responsible for the observation"})

                dgObservation.diff.push({path:'interpretation',title:'Interpretation',type:['CodeableConcept'],mult:"0..1",
                    description:"The interpretation"})

                /* rather than defineing the valusDT here, have child DG's add the one they want
                dgObservation.diff.push({path:'valueString',title:'Text',type:['string'],mult:"0..1",
                    description:"The plain text information determined as a result of making the observation"})
                dgObservation.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})
                dgObservation.diff.push({path:'valueQuantity',title:'Quantity value',type:['Quantity'],mult:"0..1",
                    description:"The measured or measurable amount determined as a result of making the observation"})
                dgObservation.diff.push({path:'valueRatio',title:'Ratio value',type:['Ratio'],mult:"0..1",
                    description:"The ratio"})

                */
                hashDataGroups[dgObservation.name] = dgObservation


                //DG for mitotic observation
                let dgObservationMC = {kind:"dg",parent:"Observation",name:'ObservationMitoticCount',
                    title:"Mitotic count observation",diff:[],
                    description:"Mitotic count observation"}

                dgObservationMC.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'371472000',display:"Mitotic count"},
                    description:"The code for mitotic count"})

                dgObservationMC.diff.push({path:'dar',title:'Data absent reason',type:['CodeableConcept'],mult:"0..1",
                    fixedCoding:{code:"1156316003",display:"Cannot be assessed"},
                    description:"The mitotic count cannot be assessed"})

                dgObservationMC.diff.push({path:'valueRatio',title:'Ratio value',type:['Ratio'],mult:"0..1",
                    description:"The ratio"})

                dgObservationMC.diff.push({path:'valueRatio.denominator',title:'denominator',type:['Quantity'],mult:"1..1",
                    description:"The denominator of the ratio"})

                dgObservationMC.diff.push({path:'valueRatio.denominator.unit',title:'Denominator units',type:['string'],mult:"1..1",
                    fixedString:"mm^2",
                    description:"Fix the units for the denominator to mm squared"})


                hashDataGroups[dgObservationMC.name] = dgObservationMC


                //ECOG status
                let dgObservationECOG = {kind:"dg",parent:"Observation",name:'ObservationEcogStatus',
                    title:"ECOG status",diff:[],
                    description:"Mitotic count observation"}

                dgObservationECOG.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'423740007',display:"ECOG performance status",FQN:"Eastern Cooperative Oncology Group performance status (observable entity)"},
                    description:"ECOG performance status"})

                dgObservationECOG.diff.push({path:'method',title:'Method',type:['CodeableConcept'],mult:"0..1",
                    fixedCoding:{code:'273437007',display:"ECOG scale for physical assessment",FQN:"Eastern Cooperative Oncology Group scale for physical assessment (assessment scale)"},
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-ecog-status",
                    description:"ECOG scale for physical assessment"})

                dgObservationECOG.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


                hashDataGroups[dgObservationECOG.name] = dgObservationECOG

                //ECOG status
                let dgObservationCMCategory = {kind:"dg",parent:"Observation",name:'ObservationCMCategory',
                    title:"CM Category",diff:[],
                    description:"CM Category"}

                dgObservationCMCategory.diff.push({path:'code',title:'Code',type:['CodeableConcept'],mult:"1..1",
                    fixedCoding:{code:'399387003',display:"cM category",FQN:"cM category (observable entity)"},
                    description:"cM category"})


                dgObservationCMCategory.diff.push({path:'valueCodeableConcept',title:'Coded value',type:['CodeableConcept'],mult:"0..1",
                    valueSet:"https://nzhts.digital.health.nz/fhir/ValueSet/canshare-tnm-cm",
                    description:"A reference to a code defined by a terminology system determined as a result of making the observation"})


                hashDataGroups[dgObservationCMCategory.name] = dgObservationCMCategory



            }

        }})