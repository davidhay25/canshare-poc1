angular.module("pocApp")

    .service('querySvc', function($q,$http) {

            return {

                getOneConceptMap : function(url) {
                    let deferred = $q.defer()

                    let qry = `ConceptMap?url=${url}&_summary=false`  //?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c`
                    console.log(qry)
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {

                            let bundle = data.data
                            if (bundle && bundle.entry) {
                                let ar = []
                                bundle.entry.forEach(function (entry) {

                                    ar.push(entry.resource)
                                })

                                deferred.resolve(ar)
                          } else {
                                deferred.reject("not found")
                            }

                        }, function (err) {
                            console.log(err)
                            deferred.reject(err)
                        }
                    )

                    return deferred.promise
                },
                getConceptMaps : function(){
//return a list of subsetted canshare valuesets
                    let deferred = $q.defer()

                    let qry = `ConceptMap`  //?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c`
                    console.log(qry)
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let bundle = data.data
                            if (bundle && bundle.entry) {
                                let ar = []
                                bundle.entry.forEach(function (entry) {
                                    let item = {cm:entry.resource}
                                    item.display = entry.resource.title || entry.resource.name

                                    ar.push(item)
                                })
                                deferred.resolve(ar)
                            }
                        }, function (err) {
                            console.log(err)
                            deferred.reject(err)
                        }
                    )

                    return deferred.promise
                },

                getValueSets : function () {
                    //return a list of subsetted canshare valuesets
                    let deferred = $q.defer()

                    let qry = `ValueSet?identifier=http://canshare.co.nz/fhir/NamingSystem/valuesets%7c`
console.log(qry)
                    let encodedQry = encodeURIComponent(qry)

                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            let bundle = data.data
                            if (bundle && bundle.entry) {
                                let ar = []
                                bundle.entry.forEach(function (entry) {
                                    let item = {vs:entry.resource}
                                    item.display = entry.resource.title || entry.resource.name

                                    ar.push(item)
                                })
                                deferred.resolve(ar)
                            }
                        }, function (err) {
                            console.log(err)
                            deferred.reject(err)
                        }
                    )

                    return deferred.promise


                }


            }
        }
    )