angular.module("pocApp")




    //try not to add depencies to this service
    .service('makeQHelperSvc', function(utilsSvc) {

        extensionUrls = {}
        extensionUrls.displayCategory = "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory"
        extensionUrls.itemControl = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
        extensionUrls.entryFormat = "http://hl7.org/fhir/StructureDefinition/entryFormat"
        extensionUrls.peferredTerminologyServer = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-preferredTerminologyServer"

        return {
            getExtensionUrls : function () {
                return extensionUrls
            },

            getHelpElements(item) {
                //get all the help text elements associated with an item
                //let instructionExt = extensionUrls.displayCategory      //instructions are

                let vo = {}

                //placeholder
                //if (item.extension) {
                    for (const ext of item.extension || []) {
                        if (ext.url = extensionUrls.entryFormat) {
                            vo.placeHolder = ext.valueString
                        }
                    }
                //}

                //Instructions & helptext
                if (item.item) {
                    for (const child of item.item) {
                        if (child.extension) {
                            for (const ext of child.extension) {
                                if (ext.url == extensionUrls.displayCategory) {
                                    //this extension marks the item as the categry. Currently only 'instruction' supported so no need to check cc
                                    vo.instructions = child.text
                                }
                                if (ext.url == extensionUrls.itemControl) {
                                    if (ext.valueCodeableConcept &&
                                        ext.valueCodeableConcept.coding &&
                                            ext.valueCodeableConcept.coding[0].code == 'flyover') {
                                        vo.helpText = child.text
                                    }

                                }

                            }
                        }
                    }
                }

                return vo


            },

            cleanCC : function (cc) {
                //remove the fsn attribute from a CC
                if (cc) {
                    delete  cc.fsn
                    return cc
                }
            },
            cloneItem : function (item) {
                //create a copy of an item, removing the item node
                let clone = angular.copy(item)
                delete clone.item
                return clone
            },
            updateExpressions: function (Q,hashLinkId) {
                //update any expressions based on the replacements in hashLinkId
                let logIssues = []

                function processItem(item) {
                    if (item.extension) {
                        for (let ext of item.extension) {
                            if (ext.valueExpression) {
                                let exp = ext.valueExpression.expression

                                //looking for {{?}} placeholders
                                let newExp = exp.replace(/{{(.*?)}}/g, (_, key) => {
                                    const trimmedKey = key.trim();
                                    let newLinkId = getReplacementLinkId(trimmedKey)
                                    if (newLinkId){
                                    //if (hashLinkId.hasOwnProperty(trimmedKey)) {
                                        return newLinkId
                                        //return hashLinkId[trimmedKey];
                                    } else {
                                        logIssues.push(trimmedKey); // Log missing key
                                        return `{{${trimmedKey}}}`; // Keep placeholder
                                    }
                                })

                                ext.valueExpression.expression = newExp

                            }
                        }
                    }

                    if (item.item) {
                        for (let child of item.item) {
                            processItem(child)
                        }
                    }
                }


                processItem(Q)  //extensions on the Q

                for (let item of Q.item) {
                    processItem(item)
                }

                return logIssues

                function getReplacementLinkId(key) {

                    if (hashLinkId[key]) {
                        return hashLinkId[key]
                    } else {
                        //if there's not a direct map in the hash, then look for any entries that end with this key
                        //I *think* that will safely support circumstances where a DG is embedded in another
                        //todo - check this, and also use for enableWhen
                        //todo - this assumes that the path segment is the same as the DG name

                        let ar = []
                        for (const hashKey of Object.keys(hashLinkId)) {
                            let oldId = hashLinkId[hashKey]
                            let t1 = hashKey.toLowerCase()
                            let t2 = key.toLowerCase()
                            if (t1.endsWith(t2)) {
                            //if (hashKey.endsWith(key)) {
                                ar.push(oldId)
                            }
                        }

                        if (ar.length == 1) {
                            return ar[0]
                        } else {
                            console.error(`Unable to map ${key} to the updated value`)
                        }

                    }
                }


            },

            updateEnableWhen : function (Q,hashLinkId) {
                //update the enableWhens based on the replacements in hashLinkId

                let logIssues = []

                function processItem(item) {
                    if (item.enableWhen) {
                        for (const ew of item.enableWhen) {
                            let question = ew.question
                            if (hashLinkId[question]) {
                                ew.question = hashLinkId[question]
                            } else {
                                //The ew.source is set to the full path within the DG that it is defined
                                let ar = ew.question.split('.')
                                //todo - if we make the path in the container the same as the DG name then we don't need to remove it and it will be more robust
                                ar.splice(0,1)      //remove the first in the path - the dg where the ew is defined
                                let matchingPath = ar.join('.')     //we're looking for an element whose path ends with this
                                let matches = []        //matching elements - there should only be 1
                                for (const key of Object.keys(hashLinkId)) {
                                    if (key.endsWith(matchingPath)) {
                                        matches.push(hashLinkId[key])
                                    }
                                }
                                if (matches.length == 1) {
                                    ew.question = matches[0]
                                } else {
                                    console.log(`Error fining match for EW path ${ew.source}. ${matches.length} matchs found`)
                                }


                                logIssues.push({msg:`${question} not found at ${item.linkId}`})
                            }
                        }
                    }
                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child)
                        }
                    }
                }



                for (let item of Q.item) {
                    processItem(item)
                }

                return logIssues

            },

            updateLinkIds : function (Q,startInx) {
                //change all the linkIds from the path to a sequential number. For cosmetic reasons

                let that = this
                let hash = {}
                let ctr = startInx || 0

                function processItem(item,updateLinkId) {
                    //update the hash
                    if (updateLinkId) {
                        let key = `id-${ctr++}`
                        hash[item.linkId] = key
                        item.linkId = key
                    }
/* temp
                    //now update any enableWhens that have been updated. 2 passes are needed to get all of them...
                    if (item.enableWhen) {
                        for (const ew of item.enableWhen) {
                            let src = ew.question
                            if (hash[src]) {
                                ew.question = hash[src]
                            }
                        }
                    }
*/
                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child,updateLinkId)
                        }
                    }

                }


                //first pass, update the LinkIds and some enablewhens
                Q.item.forEach(function (item) {
                    processItem(item,true)
                })
/* temp
                //second pass will be any unresolved enablewhen
                Q.item.forEach(function (item) {
                    processItem(item,false)
                })
*/

                //let vo = that.updateEnableWhen(Q,hash)

               // console.log(vo)

                return {hash:hash,maxInx:ctr}     //we'll save the hash with the Q

            },
            addExtension : function (item,ext) {
                item.extension = item.extension || []
                item.extension.push(ext)
            },
            checkParentalHash : function (hash,path) {
                //ensure that all segments in the path have an entry in the hash
                //and that the 'parent' path (one less segment) has a .item that references the entry
                let ar = path.split('.')

               // let first = ar.splice(0,1)      //remove the first segment
                //ar.splice(ar.length-1,1)        //and we don't need the last segment (it's the one we're cheching the parent for)...
                let first = ar[0]
                hash[first] = hash[first] || {}

                for (let i = 1;i < ar.length -1; i++) {
                    let path = makePath(ar,i)
                    if (! hash[path]) {
                        hash[path] = {placeHolder:true,linkId:path}
                        let parentPath = makePath(ar,i-1)

                        hash[parentPath].item = hash[parentPath].item || []
                        let t = hash[parentPath]
                        hash[parentPath].item.push(t)

                        //console.log(`added ${path}`)
                    }

                }
/*
                let pathSoFar = first[0]
                for (const segment of ar) {
                    //will start with the second segment
                    if (! hash[pathSoFar]) {
                        hash[pathSoFar] = {placeHolder:true,linkId:pathSoFar}
                        console.log(`added ${pathSoFar}`)
                    }
                    pathSoFar += '.' + segment
                }
*/
                function makePath(ar,length) {
                    let path = ""
                    for (let i = 0;i < length; i++) {
                        path += `.${ar[i]}`
                    }

                    return path.substring(1)   //split off the leading '.'

                }

            },
            makeDisplayItem : function (display,extHTMLRender) {
                if (display) {
                    let item = {type:'display',text:display}
                    item.linkId = utilsSvc.getUUID()
                    let disp = `<em style='padding-left:8px'>${display}</em>`
                    item.extension = [{url:extHTMLRender,valueString:disp}]
                    return item
                }

            },
            getPathToItem : function (Q,item) {
                //h=given an

            },
            makeVariableUsage : function(Q) {
                //generate a has summary of variable expression use
                let hashVariable = {}    //defined variables (expressions have a name)
                let hashUsed = {}       //where a variable has been used
                let lstUseExpression = []   //items that use an expression
                function processItem(item) {
                    if (item.extension) {
                        let clone = angular.copy(item)
                        if (clone.item) {
                            clone.item = []
                        }
                        for (const ext of item.extension) {

                            let url = ext.url

                            if (url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId") {
                                let aName = ext.valueString
                                hashVariable[aName] = hashVariable[aName] || []

                                let thing = {kind:'allocateId',item:clone}
                                hashVariable[aName].push(thing)      //should only be 1...
                            } else if (url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue") {
                                //not sure if this belongs in here anyway (although it can be an expression...



                            } else if (ext.valueExpression) {
                                let name = ext.valueExpression.name
                                let expression = ext.valueExpression.expression
                                //if there's a name, then this extension is defining the variable

                                if (name) {
                                    hashVariable[name] = hashVariable[name] || []

                                    let thing = {kind:'variable',url:url,expression:ext.valueExpression.expression,item:clone}
                                    hashVariable[name].push(thing)      //should only be 1...
                                } else {
                                    //if there's no name, then it may be using a variable

                                    //look for a variable - prefixed by %
                                    const matches = expression.match(/%\w+/g)
                                    if (matches) {
                                        for (const v of matches) {
                                            hashUsed[v] = hashUsed[v] || []
                                            let thing = {url:url,expression:ext.valueExpression.expression,item:clone}
                                            hashUsed[v].push(thing)
                                        }
                                    } else {
                                        //if there are no variables found then it's just an item with an expression of some sort
                                        let thing = {url:url,expression:ext.valueExpression.expression,item:clone}
                                        lstUseExpression.push(thing)
                                    }
                                }
                            } else if (ext.extension) {
                                //this is a complex extension
                                for (const extChild of ext.extension) {
                                    if (extChild.valueExpression) {
                                        //we'll ignore any name - don't think they're useful
                                        let childExpression = extChild.valueExpression.expression
                                        if (childExpression) {
                                            //look for a variable - prefixed by %
                                            const childMatches = childExpression.match(/%\w+/g)
                                            if (childMatches) {
                                                for (const v of childMatches) {
                                                    hashUsed[v] = hashUsed[v] || []
                                                    let thing = {url:url,expression:childExpression,item:clone}
                                                    hashUsed[v].push(thing)
                                                }
                                            } else {
                                                //if there are no variables found then it's just an item with an expression of some sort
                                                let thing = {url:url,expression:ext.valueExpression.expression,item:clone}
                                                lstUseExpression.push(thing)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child)
                        }
                    }

                }


                processItem(Q)      //extensions defined on the root
/*
                for (const item of Q.item) {
                    processItem(item)   //item based extensions
                }
                */

                console.log(hashVariable,hashUsed,lstUseExpression)

                return {variables:hashVariable,used:hashUsed,lstUseExpression:lstUseExpression}


            }


        }

    })