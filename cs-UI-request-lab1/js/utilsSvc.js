angular.module("pocApp")

    .service('utilsSvc', function($q,$http) {

        return {
            getVersion : function(){
                return "0.6.14"
            },
            findExtensionCC : function(item,url) {
                //assume that the extension is a CC abd we're looking for the first entry
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