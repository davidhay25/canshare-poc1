//more general reports than just terminology
angular.module("pocApp")

    .service('modelTermSvc', function() {



            return {
                makeNotesSummary: function (hashDG,hashComp) {
                    //All the notes fields
                    let hashNotes = {}

                },
                makeValueSetSummary : function (hashDG,hashComp) {
                    //make a summary of valuesets from DG & comp
                    let hashVS = {}

                    Object.keys(hashDG).forEach(function (key) {
                        let dg = hashDG[key]
                            dg.diff.forEach(function (ed) {
                                //let item = {}
                                if (ed.valueSet) {
                                    //hiddenDGName is used when linking to the DG item
                                    let entry = {DGName : dg.name,hiddenDGName : dg.name, path: ed.path}
                                    hashVS[ed.valueSet] = hashVS[ed.valueSet] || []
                                    //are there optyions defined as well?
                                    if (ed.options) {
                                        //yes, add them to the summary
                                        entry.options = ed.options
                                    }
                                    hashVS[ed.valueSet].push(entry)

                                } else {
                                    if (ed.options) {
                                        //This is where there are options but no VS
                                        let vsUrlTmp = `${dg.name}-${ed.path}`
                                        let entry = {DGName : dg.name, path: ed.path}
                                        entry.options = ed.options
                                        hashVS[vsUrlTmp] = hashVS[vsUrlTmp] || []
                                        hashVS[vsUrlTmp].push(entry)
                                    }
                                }
                            })

                    })

                    //now check the composition overrides
                    Object.keys(hashComp).forEach(function (key) {
                        let comp = hashComp[key]
                        //let item = {compName: comp.name}

                        if (comp.override) {
                            Object.keys(comp.override).forEach(function (key) {
                                let ov = comp.override[key]
                                let vs = ov.valueSet

                                if (vs) {
                                    let entry = {compName : comp.name, path: key}

                                    hashVS[vs] = hashVS[vs] || []
                                    //are there optyions defined as well?
                                    if (ov.options) {
                                        //yes, add them to the summary
                                        entry.options = ov.options
                                    }
                                    hashVS[vs].push(entry)

                                } else {
                                    if (ov.options) {
                                        //This is where there are options but no VS
                                        let vsUrlTmp = `${comp.name}-${key}`
                                        let entry = {compName : comp.name, path: key}
                                        entry.options = ov.options
                                        hashVS[vsUrlTmp] = hashVS[ov.valueSet] || []
                                        hashVS[vsUrlTmp].push(entry)
                                    }
                                }


                            })
                        }

                    })

                    return {hashVS:hashVS}

                },
                makeCompOverrideSummary : function (hashComp) {
                    //make a summary of the composition overrides. This includes Z elements
                    let ar = []
                    Object.keys(hashComp).forEach(function (key) {
                        let comp = hashComp[key]
                        let item = {compName: comp.name}
                        ar.push(item)
                        if (comp.override) {
                            Object.keys(comp.override).forEach(function (key) {
                                let ov = comp.override[key]
                                //for now, just copy the override element (an ED) across
                                let item = {ov:ov}
                                ar.push(item)
                            })
                        }

                        })


                    return {list:ar}

                },
                makeDGSummary : function (hashDG) {
                    //create a summary array for coded items in a DG.
                    let ar = []
                    Object.keys(hashDG).forEach(function (key) {
                        let dg = hashDG[key]
                        let item = {}
                        item.DGName = dg.name
                        item.DGTitle = dg.title
                        ar.push(item)
                        dg.diff.forEach(function (ed) {
                            if (ed.type[0] == 'CodeableConcept') {
                                //console.log(ed.type[0])
                                let item = {}
                                item.type = ed.type[0]
                                item.hiddenDGName = dg.name         //needed when al element is selected in the table
                                //item.DGTitle = dg.title
                                item.path = ed.path
                                item.title = ed.title
                                item.description = ed.description
                                item.valueSet = ed.valueSet
                                item.options = ed.options

                                ar.push(item)


                            }
                        })


                    })


                    return {list:ar}

                    //DG, name

                }


            }
        }
    )