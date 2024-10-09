angular.module("pocApp").service('terminologyUpdateSvc', function() {

    function logger(lne,msg,name) {
        arLog.push({line:lne,msg:msg,name})
    }

    return {
        summaryUnpublishedCodes : function (unpublishedReport) {
            //summarize the server report
            //{cs, batch, hashOriginal, arChanges}
            let report = []

            for (const entry of unpublishedReport.batch.entry) {
                let vs = entry.resource
                let lne = {name:vs.name,vs:vs}
                lne.newUnpublished = getUnpublished(vs)
                let originalVs = unpublishedReport.hashOriginal[vs.name]
                if (originalVs) {
                    lne.originalUnpublished = getUnpublished(originalVs)
                }
                report.push(lne)
            }

            report.sort(function (a,b) {
                if (a.name > b.name) {
                    return 1
                } else {
                    return -1
                }
            })



            return report

            function getUnpublished(vs) {
                if (vs.compose && vs.compose.include) {
                    for (const inc of vs.compose.include) {
                        if (inc.system == "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished") {
                            return inc.concept
                            break
                        }
                    }
                }

            }



        },
        auditVSBatchFile : function (arLines) {
            //audit the raw data from the the SS
            arLog = []  //note: don't use let as the array is in the service scope
            let rowNumber = 1   //yhis is the row number in the spreadsheet

            let regex = /[a-z0-9-]+/     //regex for id/name
            let hashName = {}
            let hashTitle = {}

            //need to pre-process the file. Issue is that the display terms (col 5) can
            //have multiple entries separated by newlines...
            let rows = []


            let ctr = -1
            for (const lne of arLines) {

                let cols = lne.split('\t')
                if (cols.length == 1) {
                    //This is a display term. We add it to the previous lne....
                    let lne = rows[ctr]     //this is the previous line
                    //console.log(lne)
                    lne += `#${cols[0]}`
                    rows[ctr] = lne
                } else {
                    ctr ++
                    rows.push(lne)
                }
            }

        /*    for (const lne of arLines) {
                let cols = lne.split('\t')
                if (cols.length == 1) {
                    let lne = rows[ctr]     //this is the previous line
                    console.log(lne)
                    lne += `#${cols[0]}`
                    rows[ctr] = lne
                } else {
                    ctr++
                    rows.push(cols)
                }
            }
*/
            for (const lne of rows) {
            //for (const lne of arLines) {
                rowNumber++
                let cols = lne.split('\t')



                let name = cols[0]
                if (name) {
                    //   a. Value Set ID (col A) - must be all lower case letters or '-'s
                    if (! regex.test(name)) {
                        logger(rowNumber,`Id has an incorrect format: ${name}`)
                    }

                    if (countChar(name,' ') > 0) {
                        logger(rowNumber,`Id has spaces in it: ${name}`)
                    }

                    //  b. Value Set ID (col A) - must be unique in the batch
                    if (hashName[name]) {
                        logger(rowNumber,`Name is not unique: ${name}`)
                    }
                    hashName[name] = true

                    //c. Value Set ID (col A) - must be <= 64 characters
                    if (name.length > 64) {
                        logger(rowNumber,`Id is too long: ${name} (${name.length} characters)`)
                    }

                    //  d. Value Set ID (col A) - must start with "canshare-"
                    if (! name.startsWith('canshare-')) {
                        logger(rowNumber,`Id must start with 'canshare-': ${name}`)
                    }
                } else {
                    logger(rowNumber,`Missing name`,name)
                }


                if (cols.length !== 6 && (rowNumber !== rows.length+1)) {
                    logger(rowNumber,`WARNING: There are only ${cols.length} columns. There's a newline character in there somewhere. Other errors will follow`,name)
                }

                // f. Status (col B) - must be either "Active" or "Retired"
                if (cols[1] !== 'Active' && cols[1] !== 'Retired') {
                    logger(rowNumber,`Status must be either 'Active' or 'Retired': ${name}`,name)
                }

                let title = cols[2]
                //  g. Title (col C) - must start with "NZ "
                if (! title) {
                    logger(rowNumber,`Missing title`,name)
                } else {
                    if (! title.startsWith('NZ ')) {
                        logger(rowNumber,`Title must start with 'NZ ': ${name}`,name)
                    }
                    //h. Title (col C) - must be unique in the batch

                    if (hashTitle[title]) {
                        logger(rowNumber,`title is not unique: ${title}`,name)
                    }
                    hashTitle[title] = true
                }





                //i. Description (col D) - must start with a capital letter and finish with a full stop
                let description = cols[3]
                if (description) {
                    let firstLetter = description[0]
                    if (firstLetter !== firstLetter.toUpperCase()) {
                        logger(rowNumber,`Description must start with an upper case letter: ${description}`,name)
                    }
                    let lastLetter = description[description.length-1]
                    if (lastLetter !== '.') {
                        logger(rowNumber,`Description must end with a period: ${description}`,name)
                    }
                } else {
                    logger(rowNumber,`Missing description`,name)
                }



                let ecl = cols[4]
                if (ecl) {
                    //j. ECL (col E) - count of "(" equals the count of ")"
                    if (countChar(ecl,'(') !== countChar(ecl,')')) {
                        logger(rowNumber,`ecl brackets don't match: ${ecl}`,name)
                    }

                    //k ECL (col E) - count of "|" is an even number

                    if (countChar(ecl,'|') % 2 == 1) {
                        logger(rowNumber,`There is an uneven number of '|' in the ecl: ${ecl}`,name)
                    }
                } else {
                    logger(rowNumber,`Missing ECL`,name)
                }




                //l. Updated display terms (col F) - each line has exactly 2 "|"
                let displayTerm = cols[5]
                if (displayTerm) {
                    let ar = displayTerm.split('#')
                    ar.forEach(function (dt,ctr) {
                        if (countChar(dt,'|') !== 2) {
                            logger(rowNumber,`Display terms must have 2 '|' : index ${ctr} ${dt}`,name)
                        }

                        //m. Updated display terms (col F) - each line must start with a number
                        let fixed =  dt.replace(/"/g,'')    //for some reason a quote gets inserted on the first one...
                        if (isNaN(fixed[0])) {
                            logger(rowNumber,`Display terms must start with a number : index ${ctr} ${dt}`,name)
                        }
                        //n. Updated display terms (col F) - the first "|" in each line must be directly followed by a character (ie not space)

                            let g = dt.indexOf('|')
                            if (g > -1 && dt.length > g+1) {
                                if (dt[g+1] == " ") {
                                    logger(rowNumber,`There must not be a space after the first | in display term : index ${ctr} ${dt}`,name)
                                }

                            } else {
                                logger(rowNumber,`Missing | in display term : ${displayTerm}`,name)
                            }



                    })
                }




                //o. Updated display terms (col F) - the second "|" in each line must be directly preceded by a character (ie not a space)
                if (displayTerm) {

                }


                //p. All columns are mandatory (col A to E), except col F (updated display terms) is optional
                if (cols.length < 5) {
                    logger(rowNumber,`There are missing values`,name)
                }


            }

            return arLog

            function countChar(str,charToCount) {
                let count = str.split(charToCount).length - 1
                return count
            }


        },
        VSBatchReport : function (bundleVS,allVsItem) {
            //generate a report of the VS in the batch
            let lstReport = []

            //create a hash of the current list of vs (from the term server
            let hashValueSetNames = {}
            allVsItem.forEach(function (item) {
                hashValueSetNames[item.vs.name] = true
            })

            for (const entry of bundleVS.entry) {
                let vs = entry.resource
                let item = {name:vs.name,status:vs.status}
                item.vs = vs
                item.ecl = vs.compose.include[0].filter[0].value     //we constructed this VS so we know this path is valid
                item.action = 'Create'
                if (hashValueSetNames[vs.name]) {
                    item.action = 'Update'
                }

                lstReport.push(item)
            }

            return lstReport

        },
        makeVSBatch : function (inLines) {

            let snomed = "http://snomed.info/sct"

            let bundle = {resourceType:"Bundle",type:"batch",entry:[]}

            let makeVS = function(vo) {
                //console.log(vo)
                let vs = {resourceType:"ValueSet",id:vo.id}
                vs.language = "en-x-sctlang-23162100-0210105"
                vs.url = `https://nzhts.digital.health.nz/fhir/ValueSet/${vo.id}`
                vs.status = vo.status
                vs.name = vo.id
                vs.title = vo.title
                vs.experimental = false
                vs.version = formatDateToYYYYMMDD(new Date())
                vs.identifier = [{system:"http://canshare.co.nz/fhir/NamingSystem/valuesets",value:vo.id}]
                vs.publisher = "Te Aho o Te Kahu"
                vs.contact = [{telecom:[{system:"email",value:"info@teaho.govt.nz"}]}]
                if (vo.description) {
                    vs.description = vo.description
                }


                //add the ecl as a filter
                let filter = {property:"constraint",op:"=",value:vo.ecl}
                let include = {system:"http://snomed.info/sct",version:"http://snomed.info/sct/21000210109",filter:[filter]}
                vs.compose = {include:[include]}

                //todo - need to process display concepts and unpublished concepts

                //add any display concepts. There will only be one

                if (vo.displayConcept) {

                    let displayInclude = {system:snomed,concept:[]}
/*
                    let ar1 = vo.displayConcept.split('|')
                    let code = ar1[0]
                    code = code.replace(/\s/g,'')     //get rid of spaces
                    let concept = {code: code, display:ar1[1]}
                    displayInclude.concept.push(concept)
                    vs.compose.include.push(displayInclude)
*/

                    let ar = vo.displayConcept.split('#')
                    ar.forEach(function(c){
                        c = c.replace(/"/g,'')     //get rid of quotes - for some reason one seems to be inserted during parsing
                        // c is a concept in code | display | format
                        let ar1 = c.split('|')
                        let code = ar1[0]
                        code = code.replace(/\s/g,'')     //get rid of spaces
                        let concept = {code: code, display:ar1[1]}
                        displayInclude.concept.push(concept)

                    })
                    vs.compose.include.push(displayInclude)


                }



                //the poc app updateValueSet has a UI and code for this
                //will need to update the CodeSystem resource as well so worth checking the updateValueSet code...



                return vs
            }

            function formatDateToYYYYMMDD(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is zero-based, so we add 1
                const day = String(date.getDate()).padStart(2, '0');

                return `${year}${month}${day}`;
            }




            //need to pre-process the file. Issue is that the display terms (col 5) can
            //have multiple entries separated by newlines...
            let rows = []
            let ctr = -1
            for (const lne of inLines) {

                let cols = lne.split('\t')
                if (cols.length == 1) {
                    //This is a display term. We add it to the previous lne....
                    let lne = rows[ctr]     //this is the previous line
                    //console.log(lne)
                    lne += `#${cols[0]}`
                    rows[ctr] = lne
                } else {
                    ctr ++
                    rows.push(lne)
                }
            }


            rows.forEach(function(row,inx){
            //inLines.forEach(function(row,inx){

                        let arData = row.split(/\t/)



                            let id = arData[0].replace(/\s/g, "")

                            let vo = {id:id,status:arData[1].toLowerCase(),title:arData[2],description:arData[3], ecl:arData[4]}

                            //We've added space for display terms and display concepts - not not yet using tem

                            //there can be multiple display concepts separated #
                            vo.displayConcept = arData[5]   //if present, add a concept/s containing the contents to the ValueSet as well as the ecl
                            //vo.unpublished = arData[6]   //if present, add concepts in the unpublished concepts namesystem
                            let vs = makeVS(vo)
                            //console.log(vs.id)

                            let entry = {resource:vs,request:{method:"PUT",url:`ValueSet/${vs.id}`}}
                            bundle.entry.push(entry)
                      //  }




                })

            return bundle

        },
        auditCMFile : function (arLines,allVsItem) {
            //audit the raw data from the spreadsheet - https://docs.google.com/spreadsheets/d/1qRPZZk9dpwbF8yP9SYkiwzp-nKO_3T__nfz94AzFoGw/edit?gid=874499567#gid=874499567

            //todo - check that all combinations of target filters are unique across the rows
            //for a single property
            //create a hash of all the dependsOn in all targets for an element / property
            //and combination should be unique
            //-- check this logic with Linda
            //analogy of the CM with a decode ROM in a microprocessor...

            arLog = []  //note: don't use LET as the array is in the service scope
            let hashValueSetNames = {}
            allVsItem.forEach(function (item) {
                hashValueSetNames[item.vs.name] = item.vs
            })

            //create a hash of valueSet by url so we can check for ubknown vs
           // let hashVS = {}


            let types = ['Value Set','Value'] //possible valuse of col[3]
            let arDon = [ 10,14, 18,22, 26, 30, 34, 38, 42, 46] //dependsOn properties. 10 sets of 3

            let arDonComparison = [11, 15, 19, 23, 27, 31, 35, 39, 43, 47] //the comparison col
            let arSupportedComparison = ['=','!=','^','!^']

            let firstLine = arLines[0]
            let ar = firstLine.split('\t')
            let colCount = ar.length        //all rows should have this number of columns

            rowNumber = 2   //the first row is headers
            for (const lne of arLines) {

                let cols = lne.split('\t')

                if (! cols[0]) {      //finish the check if the first col is empty
                    break
                }
                rowNumber++

                //the last row length is not the same as the colCount
                if (cols.length !== colCount && (rowNumber !== arLines.length+2)) {
                    let msg = `There are only ${cols.length} cols - there should be ${colCount}. This can be caused by a newLine character at that col number`
                    msg += " Note that the row number may be incorrect if there are earlier errors like this - it mucks up the sequence"
                    logger(rowNumber,msg)
                }

                if (! cols[1])  { logger(rowNumber,"Col B is empty")}
                if (! cols[2])  { logger(rowNumber,"Col C is empty")}

                //Col D (3: Type) must be either "Value Set" or "Value"
                let type = cols[3]
                if (types.indexOf(type) == -1) { logger(rowNumber,`Col D has an incorrect value: ${type}`)}

                //IF col D (3: Type) = "Value Set" THEN col E (4: Valueset Name) is mandatory
                if (type == 'Value Set') {
                    let vsUrl = cols[4]
                    if (! vsUrl)  { logger(rowNumber,"For a valueSet, Col E must have a value")}
                    if (vsUrl && ! hashValueSetNames[vsUrl]) {{
                        logger(rowNumber,`The valueSet ${vsUrl} in col ${4} does not exist on the terminology server`)}
                    }

                    if (vsUrl) {
                        let vs = hashValueSetNames[vsUrl]
                        if (vs.status !== "active") {
                            logger(rowNumber,`The valueSet ${vsUrl} in col ${4} has a status of ${vs.status}`)
                        }
                    }




                }

                // IF col D (3: Type) = "Value" THEN col F (5: Concept ID) and col G (6: Concept Display) are mandatory
                if (type == 'Value') {
                    if (! cols[5])  { logger(rowNumber,"For a value, Col F must have a value")}
                    if (! cols[6])  { logger(rowNumber,"For a value, Col G must have a value")}
                }

                // Attribute (Cols 10,14, 18,22, 26, 30, 34, 38, 42, 46) - IF Attribute has a value, then subsequent REL, SCTID, and Display are all mandatory
                arDon.forEach(function (colNumber) {
                    if (cols[colNumber] ) { //Attribute
                        if (! cols[colNumber+1] || ! cols[colNumber+2] || ! cols[colNumber+2]) {
                            logger(rowNumber,`If there is a depends on property, then the following 3 cols should have a value`)
                        }

                        //l. REL (Cols 11, 15, 19, 23, 27, 31, 35, 39, 43, 47) - Must be either "=" or "^" or "!=" or "!^"
                        let comp =cols[colNumber+1]     //REL
                        if (arSupportedComparison.indexOf(comp) == -1) {
                            logger(rowNumber,`The comparison operator in col ${colNumber} is invalid - ${comp}`)
                        }

                        //m. SCTID (Cols 12, 16, 20, 24, 28, 32, 36, 40, 44, 48) - IF preceding REL is "=" or "!=" THEN SCTID must be numeric
                        if (comp == '=' || comp == '!=') {
                            let value = cols[colNumber + 2]
                            if (! value) {
                                logger(rowNumber,`The comparison value in col ${colNumber} is missing`)
                            } else if ( ! isNumericString(value) ) {
                                logger(rowNumber,`The comparison value in col ${colNumber}  (${value}) must be a number`)
                            }
                        }

                        //n. SCTID (Cols 12, 16, 20, 24, 28, 32, 36, 40, 44, 48) - IF preceding REL is "^" or "!^" THEN check if value set with this id exists (WARNING ONLY if it doesn't)
                        if (comp == '^' || comp == '!^') {
                            let vsUrl = cols[colNumber + 2]
                            if (! vsUrl)  { logger(rowNumber,"For a 'contained in operator, Col ${colNumber + 2} must have a valueSet")}
                            if (vsUrl && ! hashValueSetNames[vsUrl]) {{
                                logger(rowNumber,`The valueSet ${vsUrl} in col ${colNumber + 2} does not exist on the terminology server`)}
                            }
                        }
                    }
                })


                //check the comparison operators
                //l. REL (Cols 11, 15, 19, 23, 27, 31, 35, 39, 43, 47) - Must be either "=" or "^" or "!=" or "!^"
                arDonComparison.forEach(function (colNumber) {
                    if (cols[colNumber]) {
                        let comp =cols[colNumber]
                        if (arSupportedComparison.indexOf(comp) == -1) {
                            logger(rowNumber,`The comparison value in col ${colNumber} is invalid - ${comp}`)
                        }
                    }

                })

                //SCTID (Cols 12, 16, 20, 24, 28, 32, 36, 40, 44, 48) - IF preceding REL is "=" or "!=" THEN SCTID must be numeric



            }

            return {log:arLog}




            function isNumericString(str) {
                return str.split('').every(char => !isNaN(char));
            }

            //Notes for team - checking that cincept exists (g) could be compuattionally expensive...
            //comparison != and !^ not currently supported in UI


        },
        makeVSListFromCM : function (arLines) {

        },
        makeCM : function (inLines) {

            //the url that indicates the type of comparison perfromed when evaluating the 'dependsOn' element. If absent, this is assumed to be = (must be the same)
            let comparisonOperationUrl = "http://canshare.co.nz/fhir/StructureDefinition/do-operator"

            let arLines = angular.copy(inLines)

            //remove the first 2 lines - the header lines in the SS
         //   arLines.splice(0,2)
            let arLog = []

            arLog.push(`${arLines.length} lines to process`)


            let snomed = "http://snomed.info/sct"

            let cm = {resourceType:"ConceptMap",id:"canshare-select-valueset-map"}
            cm.url = "http://canshare.co.nz/fhir/ConceptMap/canshare-select-valueset-map"
            cm.identifier = {value:"canshare-select-valueset-map",system:"http://canshare.co.nz/fhir/NamingSystem/conceptmaps"}
            cm.title = "CanShare select ValueSet ConceptMap"
            cm.status = "active"
            cm.version = "1"
            let group = {source:snomed,target:snomed,element:[]}
            cm.group = [group]

//each line in the file refers to a specific target for a specific source, with a unique set of dependencies
//a single source (eg cancer stream) may have multiple lines (targets), so need to analyse the file first, aggregaring by source

            let ctr = 3   //the line counter from the SpreadSheetlines
            let hashSource = {}     //hashed by source code - ie the thing we are looking for



            for (const lne of arLines) {
                let ar = lne.split('\t')
                ar[0] = ctr++       //replace the sct release with the line number from the ss for debugging. don't think the sct release is needed (if it is later, then make it an object)
                let sourceCode = ar[1].trim()      //B the code of the thing that is being looked for (eg cancer stream, concer substream). This is the same as the 'property' in the ConceptMap UI
                let sourceDisplay = ar[2]   //C the display for that code

                //console.log(ar[0],lne)

                //add the line to the hash. Each line represents a possible target (value) with any associated dependencies
                hashSource[sourceCode] = hashSource[sourceCode] || {display:sourceDisplay,lines:[]}
                hashSource[sourceCode].lines.push(ar)
            }


//now we can iterate through the hashed sources (each of which represents possibly multiple lines)
//each source is in a separate element inside the single group - as it's all snomed of the same version
            for (const key of Object.keys(hashSource)) {

                let item = hashSource[key]  //for a given source (ie property) all the rows in the spreadsheet that refer to that property

                //the element that corresponds to this source. eg Cancer stream
                let element = {code:key,display:item.display,target:[]}
                let arLines = item.lines       //these are the lines. each line is a potential target within the element with dependencies

                //now iterate over the lines creating the individual targets. each line becomes 1 target
                // ie the value of the thing I'm looking for (eg cancer stream) is the target - if the dependencies match
                arLines.forEach(function(ar){


                    let lineNumber = ar[0]          //the line in the spreadsheet where this target is defined
                    let targetType = ar[3]      //D set to 'Value set' if the target is a ValueSet and 'Value' if a value

                    let targetValueSetName = ar[4]      // E valueset name if targetType is 'Value Set' (was targetRefsetId - refsetid)

                    let targetConceptId = ar[5]     //F conceptId if we're just referring to a single concept
                    let targetConceptDisplay = ar[6]    //G concept display if targetType is 'Value'



                    //let targetVSName = ar[4]      // F canshare name of the valueset
                    //these are the individual dependencies or 'rules' that, if met from data in the UI will trigger the rule

                    let dep0Property = ar[10]    //K the propertyname for the first dependency
                    let dep0Op = ar[11]          //L the operator - '=' must match, '^' means test concept in set
                    let dep0Value = ar[12]       //M the actual code value of the dependency
                    let dep0Display = ar[13]   //N the name of the dependency

                    let dep1Property = ar[14]    //O the propertyname for the second dependency
                    let dep1Op = ar[15]          //P the operator - '=' must match, '^' means test concept in set
                    let dep1Value = ar[16]       //Q the actual code value of the dependency
                    let dep1Display = ar[17]   //R the name of the dependency

                    let dep2Property = ar[18]    //S the propertyname for the third dependency
                    let dep2Op = ar[19]          //T the operator - '=' must match, '^' means test concept in set
                    let dep2Value = ar[20]       //U the actual code value of the dependency
                    let dep2Display = ar[21]    //V the name of the dependency


                    let dep3Property = ar[22]
                    let dep3Op = ar[23]
                    let dep3Value = ar[24]
                    let dep3Display = ar[25]

                    let dep4Property = ar[26]
                    let dep4Op = ar[27]
                    let dep4Value = ar[28]
                    let dep4Display = ar[29]

                    let dep5Property = ar[30]
                    let dep5Op = ar[31]
                    let dep5Value = ar[32]
                    let dep5Display = ar[33]

                    //If further properties are needed (ie extra 'conditionals') - then add them according to the pattern above. You'll need to
                    //add them as 'dependsOn' in the code below...

                    //create the target defined by the line. This could be a ValueSet or a single concept - one or the other

                    let targetCode  //the code of the target - will be a valuesetname or a concept
                    let targetDisplay

                    if (targetValueSetName) {
                        //there is a valueset defined
                        targetCode = `https://nzhts.digital.health.nz/fhir/ValueSet/${targetValueSetName}`
                        targetDisplay = targetValueSetName

                    } else if (targetConceptId) {
                        targetCode = targetConceptId
                        targetDisplay = targetConceptDisplay

                        //it's a single concept
                    } else {
                        arLog.push(`>>>> line ${lineNumber} neither valueset nor concept present`)
                        //todo - what to do?
                    }

                    //a target is a possible match (containing a vs or concept) for an element (property)
                    let target = {code:targetCode}
                    if (targetDisplay) { target.display = targetDisplay}
                    target.equivalence = 'relatedto'
                    target.comment = lineNumber     //for debugging purposes in the UI. Provides a link from the rule back to the line number in the spreadsheet,
                    target.dependsOn = []           //the conditions / rules that must match for the target to apply

                    element.target.push(target)     //add the target. ie the value if all the dependencies line up

                    if (! dep0Property) {
                        //no special action here, but there used to be so I'll leave thus here...
                    }


                    if (dep0Property) {
                        target.dependsOn.push(getDep(dep0Property,dep0Op,dep0Value,dep0Display))
                    }

                    if (dep1Property) {
                        target.dependsOn.push(getDep(dep1Property,dep1Op,dep1Value,dep1Display))
                    }

                    if (dep2Property) {
                        target.dependsOn.push(getDep(dep2Property,dep2Op,dep2Value,dep2Display))
                    }

                    if (dep3Property) {
                        target.dependsOn.push(getDep(dep3Property,dep3Op,dep3Value,dep3Display))
                    }

                    if (dep4Property) {
                        target.dependsOn.push(getDep(dep4Property,dep4Op,dep4Value,dep4Display))
                    }

                    if (dep5Property) {
                        target.dependsOn.push(getDep(dep5Property,dep5Op,dep5Value,dep5Display))
                    }

                    //if you add more properties above, then add them here...



                })

                //add the element to the ConceptMap
                group.element.push(element)

            }

            return {cm:cm}


           // fs.writeFileSync(`./${cmFileName}`,JSON.stringify(cm,null,2))
           // logger(`${cmFileName} file created. Use the 'uploadConceptMap' script to upload to the terminology server.`)

            function getDep(property, operation, value, display) {
                let dep = {}
                dep.property = property
                if (value) {
                    dep.value = value.trim()
                }

                dep.system = snomed
                if (display) {
                    dep.display = display
                }

                //if the operation is the 'contained in', then add an extension
                if (operation == '^') {
                    dep.extension = [{url:comparisonOperationUrl,valueCode:"in-vs"}]
                    dep.value =  `https://nzhts.digital.health.nz/fhir/ValueSet/${value}`


                }
                return dep

            }



        }
    }

})