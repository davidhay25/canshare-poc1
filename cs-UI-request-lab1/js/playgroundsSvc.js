angular.module("pocApp")

    .service('playgroundsSvc', function($http,utilsSvc,$q) {

        return {
            getImportableDG: function (hashAllDG) {
                let deferred = $q.defer()
                //get all the DG's that can be imported into a playground from the lubrary
                //right now, it's those that have no parents and only FHIR datatype elements
                let fhirDT = utilsSvc.fhirDataTypes()
                let arImport = []

                let qry = `/model/allDG`
                    $http.get(qry).then(
                    function (data) {
                        let libraryDG = data.data
                        for (const dg of libraryDG) {
                            if (! dg.parent && dg.diff) {
                                let canImport = true
                                for (const ed of dg.diff) {
                                    let type = ed.type[0]
                                    if (fhirDT.indexOf(type) == -1) {
                                        canImport = false
                                        break
                                    }
                                }
                                if (canImport) {
                                    //there are some values and this DG name not already in use
                                    if (dg.diff.length > 0 && ! hashAllDG[dg.name])
                                    arImport.push(dg)
                                }

                            }
                        }

                        deferred.resolve(arImport)

                    }, function (err) {
                        console.error(angular.toJson(err.data))
                            deferred.reject(angular.toJson(err.data))
                    })

                return deferred.promise

            }
        }}
    )