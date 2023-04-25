angular.module("pocApp").service('clinicalViewerSvc', function($q,$http,commonSvc) {


    function convertBundleToArray(bundle) {
        let lst = []
        if (bundle && bundle.entry) {
            bundle.entry.forEach(function (entry) {
                lst.push(entry.resource)
            })
        }
        return lst
    }

    function makeQuery(lst) {
        //make a call to the multiquery endpoint

    }

    return {

        findPatientByIdentifier: function (identifier) {
            let deferred = $q.defer()
            let qry = `Patient?identifier=${identifier}`
            let encodedQry = encodeURIComponent(qry)
            //the proxy endpoint will follow the paging to return all matching resources...
           
            $http.get(`proxy?qry=${encodedQry}`).then(
                function (data) {
                    if (data.data && data.data.entry) {
                        switch (data.data.entry.length) {
                            case 0 :
                                deferred.reject("There were no matching identifiers")
                                break
                            case 1 :
                                deferred.resolve(data.data.entry[0].resource)
                                break
                            default :
                                deferred.reject("There were no matching identifiers")
                                break
                        }
                    }
                }, function (err) {
                    
                }
                
            )
            return deferred.promise
        },

        makeSubmissionBundle : function (vo) {
            //make a submission bundle with the patient, QR and a DocRef
            //used by document creator
            let patient = vo.patient
            let QR = vo.QR
            let Q = vo.Q
            let bundle = {resourceType:"Bundle",type:"transaction",entry:[]}

            let entryPatient = {resource:patient,request:{method:'GET',url:`Patient/${patient.id}`}} //we don't want to update it
            bundle.entry.push(entryPatient)


            QR.id = commonSvc.createUUID()
            QR.subject = {reference:`Patient/${patient.id}`}  //the patient has an id on teh server already
            QR.identifier = {system:"urn:ietf:rfc:3986",value:commonSvc.createUUID()}   //just create a new identifier
            let entryQR = {resource:QR ,request: {method:'POST',url:`QuestionnaireResponse`}}
            addEntry(bundle,entryQR)

            let DR = {resourceType:"DocumentReference",id:commonSvc.createUUID() ,status:"current"}
            DR.subject = {reference:`Patient/${patient.id}`}
            DR.date = new Date().toISOString()
            DR.description = Q.title
            DR.identifier = {system:"urn:ietf:rfc:3986",value:commonSvc.createUUID()}   //just create a new identifier
            let attachment = {attachment:{url:`urn:uuid:${QR.id}`}}
            DR.content = [attachment]

            let entryDR = {resource:DR ,method:'POST',url:`DocumentReference`}
            addEntry(bundle,entryDR)

            //Add a new entry, setting the fullUrl and making the call a POST
            function addEntry(bundle,entry) {
                entry.fullUrl = `urn:uuid:${entry.resource.id}`
                entry.request = {method : "POST",url:`${entry.resource.resourceType}`}
                bundle.entry.push(entry)
            }

            return bundle
        },

        getGeneralDocumentTemplates : function () {
            //return all the Q where the context type is 'general' (as opposed to request / report)
            let deferred = $q.defer()
            let ar = [`Questionnaire?context=general`]

            $http.post('multiquery',ar).then(
                function (data) {
                    deferred.resolve(convertBundleToArray(data.data))
                }, function (err) {
                    console.log(err.data)
                    deferred.reject(err.data)
                }
            )
            return deferred.promise
        },

        getDRDocuments : function(DR) {
            //get the documents associated with the DR. there can be multiple
            let deferred = $q.defer()

            let arUri = []

            //retrieve all the references. Right now there should only be 1 content with 1 attachment to a QR
            DR.content.forEach(function (content) {
                let attachment = content.attachment
                arUri.push(attachment.url)

            })

            $http.post('multiquery',arUri).then(
                function (data) {
                    deferred.resolve(convertBundleToArray(data.data))
                }, function (err) {
                    console.log(err.data)
                    deferred.reject(err.data)
                }
            )
            return deferred.promise
            //let url = DR.

        },

        getDocumentsForPatient: function (patient) {
            //return all the DocumentReferences for a patient.
            let deferred = $q.defer()
            let ar = [`DocumentReference?subject=${patient.id}`]
            $http.post('multiquery',ar).then(
                function (data) {
                    deferred.resolve(convertBundleToArray(data.data))

                }, function (err) {
                    console.log(err.data)
                    deferred.reject(err.data)
                }
            )
            return deferred.promise

        }
    }
    })