/* Functions related to drawings.
* Currently storing as annotations against a pre-defined image
*
*/

angular.module("pocApp")

    .service('drawingSvc', function($q,$http) {

        let config = {}

        return {
            getDiagrams : function() {
                //return an array of potential diagrams. Currently these are png files on the app filesystem - todo move to ?Binary resource
                let deferred = $q.defer()

                let ar = [{display:"Left Breast",fileName:'left-breast.png'}]
                deferred.resolve(ar)

                return deferred.promise
            }
        }
    })