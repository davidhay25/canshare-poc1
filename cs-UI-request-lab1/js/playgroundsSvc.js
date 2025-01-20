angular.module("pocApp")

    .service('playgroundsSvc', function($http,utilsSvc,$q) {

        return {

            getImportableDG: function (hashAllDG) {
                let deferred = $q.defer()
                //get all the DG's that can be imported into a playground from the library
                //These are DG's that have been exported as 'frozen'
                let arImport = []
                $http.get('/allfrozen').then(
                    function (data) {

                        for (const dg of data.data) {
                            if (hashAllDG[dg.name]) {
                                dg.nameExists = true
                            }

                            arImport.push(dg)
                        }

                        arImport.sort(function (a,b) {
                            if (a.title > b.title) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                        deferred.resolve(arImport)

                    }, function (err) {
                        //at least retun the simple ones
                        deferred.reject(err)
                    }
                )

                return deferred.promise


            },

                getImportableDGDEP: function (hashAllDG) {
                let deferred = $q.defer()
                //get all the DG's that can be imported into a playground from the library
                //right now, it's those that have no parents and only FHIR datatype elements

                let hash = {}

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
                                    if (dg.diff.length > 0 && ! hashAllDG[dg.name]) {
                                        hash[dg.name] == true
                                        arImport.push(dg)
                                    }

                                }

                            }
                        }


                        //now get the frozen DGs
                        $http.get('/allfrozen').then(
                            function (data) {
                                data.data.forEach(function (dg) {
                                    //can import if not already marked for import & the name is not already used...
                                    if (! hash[dg.name] && ! hashAllDG[dg.name]) {
                                        arImport.push(dg)
                                    }


                                })
                                deferred.resolve(arImport)

                            }, function (err) {
                                //at least retun the simple ones
                                deferred.resolve(arImport)
                            }
                        )




                    }, function (err) {
                        console.error(angular.toJson(err.data))
                            deferred.reject(angular.toJson(err.data))
                    })

                return deferred.promise

            }
        }}
    )