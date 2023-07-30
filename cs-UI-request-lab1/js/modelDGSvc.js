angular.module("pocApp")

    .service('modelDGSvc', function() {

        let config = {}


        return {


            makeUpdateList: function (allDG) {
                let report = {newDG:[],newElement:[]}
                Object.keys(allDG).forEach(function (key) {
                    let dg = allDG[key]
                    if (dg.status == 'new') {
                        report.newDG.push(dg)
                    } else {
                        dg.diff.forEach(function (ed) {
                            if (ed.status == 'new') {
                                let item = {dgName:dg.name, ed : ed}
                                report.newElement.push(item)
                            }
                        })
                    }
                })

                return report

            }
        }
    })