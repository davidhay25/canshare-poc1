angular.module("pocApp")

    .service('utilsSvc', function($q,$http) {


        hashNQ = {}     //Nmaed Queries

        $http.get("/model/namedquery").then(
            function (data) {

                data.data.forEach(function (nq) {
                    hashNQ[nq.name] = nq
                })
            }, function (err) {
                alert(angular.toJson(err.data))
            }
        )

        return {
            getNQbyName : function (name) {
                return hashNQ[name] || {}
            },
            getVersion : function(){
                return "0.9.7"
            },
            makeSafeString : function(s) {
            if (s) {
                s = s.replace(/-/g, "");
                s = s.replace(/\./g, "");
                s = s.replace(/\,/g, "");
                s = s.replace(/\(/g, "");
                s = s.replace(/\)/g, "");
                s = s.replace(/\'/g, "");
                s = s.replace(/\’/g, "");
                s = s.replace(/\?/g, "");

                s = s.replace(/ /g, "");
                s = s.replace(/\//g, "");
                s = s.replace(/\:/g, "");
                s = s.replace(/\%/g, "");
                s = s.replace(/\_/g, "");
                s = s.replace(/\#/g, "");
                s = s.replace(/\–/g, "");
                s = s.replace(/\;/g, "");

                return s
            } else {
                return ""
            }

        },

            fhirDataTypes : function(){
                //theres also a list in snapShot Svc
                return ['boolean','code','date','dateTime','decimal','integer','string','Address','Attachment','CodeableConcept','ContactPoint','Group','HumanName','Identifier','Period','Quantity','Ratio']
            },

            getSizeOfObject : function( object ) {
                //the memory usage of an object - from https://stackoverflow.com/questions/1248302/how-to-get-the-size-of-a-javascript-object#11900218
                var objectList = [];
                var stack = [ object ];
                var bytes = 0;

                while ( stack.length ) {
                    var value = stack.pop();

                    if ( typeof value === 'boolean' ) {
                        bytes += 4;
                    }
                    else if ( typeof value === 'string' ) {
                        bytes += value.length * 2;
                    }
                    else if ( typeof value === 'number' ) {
                        bytes += 8;
                    }
                    else if (
                        typeof value === 'object'
                        && objectList.indexOf( value ) === -1
                    ) {
                        objectList.push( value );

                        for( var i in value ) {
                            stack.push( value[ i ] );
                        }
                    }
                }
                return bytes;
            },
            findExtensionCC : function(item,url) {
                //assume that the extension is a CC and we're looking for the first entry
                //Return the Coding or null this is really common
                let result = null

                if (item && item.extension) {

                    for (const ext of item.extension){

                        if (ext.url == url) {
                            if (ext.valueCodeableConcept && ext.valueCodeableConcept.coding && ext.valueCodeableConcept && ext.valueCodeableConcept.coding.length > 0){
                                return ext.valueCodeableConcept.coding[0]
                            }
                        }
                    }
                }


            }

        }
    })