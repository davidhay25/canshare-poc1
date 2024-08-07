

angular.module("formsApp")
    .service('renderFormsSvc2', function() {

        return {

            createControlList : function (item,hashEd) {
                //create a list of items
                let lst = []
                parseItem(lst,item)
                return lst

                function parseItem(lst,item) {
                    if (item.item && item.item.length > 0) {
                        //this is a group of items
                        let entry = {linkId:item.linkId}
                        entry.title = `${item.text}`
                        entry.type = 'group'
                        entry.item = item
                        entry.ed = hashEd[item.linkId]
                        lst.push(entry)
                        for (const child of item.item) {
                            parseItem(lst,child)
                        }
                    } else {
                        //this is a single item
                        let entry = {linkId:item.linkId}
                        entry.title = `${item.text}`
                        entry.type = 'leaf'
                        entry.item = item
                        entry.ed = hashEd[item.linkId]
                        lst.push(entry)
                    }
                }
            },

            makeTreeFromQ : function(Q) {
                // a recursive form of the tree generation

                let that = this

                let hashItem = {}
                let treeData = []
                let root = {id:'root',text:Q.title || 'Root',parent:'#',state:{}}
                treeData.push(root)


                function addItemToTree(parent,item,level,sectionItem) {
                    let idForThisItem =  item.linkId
                    hashItem[item.linkId] = item

                    let thisItem = angular.copy(item)
                    delete thisItem.item

                    let text = item.text || "Unknown text"
                    if (text.length > 50) {
                        text = text.slice(0,47) + "..."
                    }

                    let node = {id:idForThisItem,text:text,parent:parent,data:{section:sectionItem,item:item}}

                    let iconFile = "icons/icon-q-" + item.type + ".png"
                    node.icon = iconFile

                    treeData.push(node)

                    //now look at any sub children
                    if (item.item) {
                        item.item.forEach(function (child) {
                            let newLevel = "item"
                            if (child.item) {
                                newLevel = 'group'
                            }
                            addItemToTree(idForThisItem,child,newLevel,sectionItem)
                        })
                    }
                }

                function addQToTree(Q) {
                    //create a parent for this Q
                    let qParentId = `root`
                    //let node = {id:qParentId,text:Q.title || `q${ctr}`,parent:"root",data:{level:'chapter'}}

                    // treeData.push(node)
                    Q.item.forEach(function (item) {
                        let section = angular.copy(item)
                        delete section.item
                        //section.reviewItem = []
                        addItemToTree(qParentId,item,'section',section)
                    })
                }


                addQToTree(Q)

                //now that we have completed the tree array (and populated hashItem)
                //we can make the conditional display a bit nicer by adding the text for the question

                treeData.forEach(function (node) {
                    if (node.data && node.data.item.enableWhen) {
                        node.data.item.enableWhen.forEach(function (ew) {
                            if (hashItem[ew.question]) {
                                ew.questionText = hashItem[ew.question].text
                            }

                        })
                    }
                })

                return {treeData: treeData,hashItem:hashItem}




            },


            createUUID : function() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                })
            }

        }
    })


