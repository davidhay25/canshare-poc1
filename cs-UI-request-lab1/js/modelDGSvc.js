angular.module("pocApp")

    .service('modelDGSvc', function() {

        let config = {}


        return {

            updateChanges : function (DG,change,scope) {
                DG.changes = DG.changes || []
                DG.changes.push(change)
                console.log('emitting')
                scope.$emit("dgUpdated",{})

            },

            makeDgDownload: function (allDG) {
                //create a download of the DG
            },

            makeUpdateList: function (allDG,xref) {
                //create a list of all DG updates
                //let report = {newDG:[],newElement:[],changedElement:[]}
                let report = []

                console.log(xref)

                Object.keys(allDG).forEach(function (key) {
                    let dg = allDG[key]
                    if (dg.status == 'new') {
                        let item = {DGName:dg.name,msg:"New DataGroup",xref:xref[dg.name]}
                        report.push(item)

                    } else {
                        if (dg.changes) {
                            dg.changes.forEach(function (change) {
                                //{edPath: msg: }
                                let item = {DGName:dg.name,msg:change.msg,path:change.edPath,xref:xref[dg.name]}
                                report.push(item)
                            })
                        }

                    }
                })

                return report

            }
        }
    })