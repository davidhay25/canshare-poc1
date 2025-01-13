angular.module("pocApp")

    .service('makeQHelperSvc', function(utilsSvc) {

        return {

            updateExpressions: function (Q,hashLinkId) {
                //update any expressions based on the replacements in hashLinkId
                let logIssues = []

                function processItem(item) {
                    if (item.extension) {
                        for (let ext of item.extension) {
                            if (ext.valueExpression) {
                                let exp = ext.valueExpression.expression

                                let newExp = exp.replace(/{{(.*?)}}/g, (_, key) => {
                                    const trimmedKey = key.trim();
                                    if (hashLinkId.hasOwnProperty(trimmedKey)) {
                                        return hashLinkId[trimmedKey];
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

            }

        }

    })