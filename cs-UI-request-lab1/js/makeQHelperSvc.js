angular.module("pocApp")

    .service('makeQHelperSvc', function(utilsSvc) {

        return {
            updateLinkIds : function (Q) {
                //change all the linkIds from the path to a sequential number. For cosmetic reasons

                let hash = {}
                let ctr = 0

                function processItem(item,updateLinkId) {
                    //update the hash
                    if (updateLinkId) {
                        let key = `id-${ctr++}`
                        hash[item.linkId] = key
                        item.linkId = key
                    }

                    //now update any enableWhens that have been updated. 2 passes are needed to get all of them...
                    if (item.enableWhen) {
                        for (const ew of item.enableWhen) {
                            let src = ew.question
                            if (hash[src]) {
                                ew.question = hash[src]
                            }
                        }
                    }

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

                //second pass will be any unresolved enablewhen
                Q.item.forEach(function (item) {
                    processItem(item,false)
                })


                return hash     //we'll save the hash with the Q

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

                        console.log(`added ${path}`)
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